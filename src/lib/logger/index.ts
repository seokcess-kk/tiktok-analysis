/**
 * Structured Logger
 * 프로덕션에서는 Winston, Pino 등으로 교체 권장
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

class Logger {
  private serviceName: string;
  private minLevel: LogLevel;

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(serviceName: string = 'tiktok-analysis') {
    this.serviceName = serviceName;
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        service: this.serviceName,
        ...context,
      },
    };
  }

  private output(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    switch (entry.level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatLog('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.output(this.formatLog('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatLog('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext: LogContext = { ...context };

      if (error instanceof Error) {
        errorContext.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else if (error) {
        errorContext.error = error;
      }

      this.output(this.formatLog('error', message, errorContext));
    }
  }

  /**
   * API 요청 로깅
   */
  apiRequest(
    method: string,
    path: string,
    context?: LogContext
  ): void {
    this.info(`API Request: ${method} ${path}`, {
      type: 'api_request',
      method,
      path,
      ...context,
    });
  }

  /**
   * API 응답 로깅
   */
  apiResponse(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this[level](`API Response: ${method} ${path} ${statusCode}`, {
      type: 'api_response',
      method,
      path,
      statusCode,
      durationMs,
      ...context,
    });
  }

  /**
   * 비즈니스 이벤트 로깅
   */
  event(eventName: string, context?: LogContext): void {
    this.info(`Event: ${eventName}`, {
      type: 'event',
      eventName,
      ...context,
    });
  }

  /**
   * 메트릭 로깅
   */
  metric(metricName: string, value: number, context?: LogContext): void {
    this.info(`Metric: ${metricName}`, {
      type: 'metric',
      metricName,
      value,
      ...context,
    });
  }

  /**
   * 자식 로거 생성 (컨텍스트 추가)
   */
  child(context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }
}

class ChildLogger {
  private parent: Logger;
  private context: LogContext;

  constructor(parent: Logger, context: LogContext) {
    this.parent = parent;
    this.context = context;
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, { ...this.context, ...context });
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, { ...this.context, ...context });
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, { ...this.context, ...context });
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.parent.error(message, error, { ...this.context, ...context });
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();

// 모듈별 로거 생성 헬퍼
export function createLogger(moduleName: string): ChildLogger {
  return logger.child({ module: moduleName });
}
