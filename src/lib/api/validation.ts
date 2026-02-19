import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/**
 * 요청 본문을 Zod 스키마로 검증
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    let body: unknown;

    // Content-Type 확인
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } else {
      body = {};
    }

    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const details: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.') || '_root';
        if (!details[path]) details[path] = [];
        details[path].push(err.message);
      });
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details,
        },
      };
    }

    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Invalid JSON format',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to process request',
      },
    };
  }
}

/**
 * URL 쿼리 파라미터를 Zod 스키마로 검증
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const data = schema.parse(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const details: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.') || '_root';
        if (!details[path]) details[path] = [];
        details[path].push(err.message);
      });
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to validate query parameters',
      },
    };
  }
}

/**
 * 검증 에러 응답 생성
 */
export function validationErrorResponse(error: ValidationResult<unknown>['error']) {
  return NextResponse.json(
    { success: false, error },
    { status: 400 }
  );
}
