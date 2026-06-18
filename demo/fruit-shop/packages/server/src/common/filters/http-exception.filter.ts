import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { PinoLogger } from 'nestjs-pino';
import { Response } from 'express';

/**
 * 统一异常响应格式
 * { code: number, message: string }
 *
 * 业务异常 (HttpException) → warn 级别日志
 * 未知异常              → error 级别日志 + 完整 stack
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<{ method: string; url: string }>();
    const response = ctx.getResponse<Response>();

    let code = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;
        if (Array.isArray(resp.message)) {
          // class-validator 验证错误
          code = status;
          message = resp.message.join('; ');
        } else if (typeof resp.code === 'number') {
          // 自定义业务异常: { code: 40001, message: '...' }
          code = resp.code;
          message = resp.message || exception.message;
        } else {
          code = status;
          message = resp.message || exception.message;
        }
      } else if (typeof exceptionResponse === 'string') {
        code = status;
        message = exceptionResponse;
      }

      // 业务异常 - warn 级别
      this.logger.warn(
        {
          method: req.method,
          url: req.url,
          code,
          message,
        },
        `业务异常: ${message}`,
      );
    } else {
      // 未知异常 - error 级别 + 完整 stack
      this.logger.error(
        {
          method: req.method,
          url: req.url,
          err: exception,
        },
        'Unhandled exception',
      );
    }

    let httpStatus: HttpStatus;
    if (exception instanceof ThrottlerException) {
      httpStatus = HttpStatus.TOO_MANY_REQUESTS;
      code = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Too Many Requests';
    } else if (exception instanceof ServiceUnavailableException) {
      httpStatus = HttpStatus.SERVICE_UNAVAILABLE;

      // Pass through the original terminus health check response body
      const exceptionResponse = exception.getResponse() as Record<string, any>;
      const terminusBody = exceptionResponse?.response;
      if (terminusBody?.status && terminusBody?.details) {
        this.logger.error(
          {
            method: req.method,
            url: req.url,
            status: terminusBody.status,
            details: terminusBody.details,
          },
          'Health check failed',
        );
        return response.status(httpStatus).json(terminusBody);
      }
    } else {
      httpStatus = HttpStatus.OK;
    }

    response.status(httpStatus).json({
      code,
      message,
    });
  }
}
