/**
 * Custom Error Classes and Error Handling Utilities
 */

/**
 * 기본 애플리케이션 에러
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 리소스를 찾을 수 없음
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      'NOT_FOUND',
      404
    );
    this.name = 'NotFoundError';
  }
}

/**
 * 유효성 검사 실패
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * 인증 실패
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * 권한 없음
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * 요청 제한 초과
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * 외부 서비스 에러 (TikTok API 등)
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message: string, details?: Record<string, any>) {
    super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, details);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

/**
 * 에러 응답 포맷
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * 에러를 API 응답 형식으로 변환
 */
export function toErrorResponse(error: unknown): {
  body: ErrorResponse;
  status: number;
} {
  if (error instanceof AppError) {
    return {
      body: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      status: error.statusCode,
    };
  }

  // 알 수 없는 에러
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';

  return {
    body: {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
      },
    },
    status: 500,
  };
}

/**
 * 에러 로깅 유틸리티
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const errorInfo: Record<string, any> = {
    timestamp,
    context,
  };

  if (error instanceof AppError) {
    errorInfo.type = error.name;
    errorInfo.code = error.code;
    errorInfo.message = error.message;
    errorInfo.statusCode = error.statusCode;
    errorInfo.isOperational = error.isOperational;
    errorInfo.details = error.details;
    errorInfo.stack = error.stack;
  } else if (error instanceof Error) {
    errorInfo.type = error.name;
    errorInfo.message = error.message;
    errorInfo.stack = error.stack;
  } else {
    errorInfo.type = 'Unknown';
    errorInfo.error = error;
  }

  // 프로덕션에서는 외부 로깅 서비스로 전송
  console.error('[Error]', JSON.stringify(errorInfo, null, 2));
}

/**
 * API 라우트 에러 핸들러 래퍼
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      logError(error);
      const { body, status } = toErrorResponse(error);
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }) as T;
}
