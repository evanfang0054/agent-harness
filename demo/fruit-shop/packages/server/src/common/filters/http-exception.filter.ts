import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * 统一异常响应格式
 * { code: number, message: string }
 *
 * 业务异常 (HttpException):
 *   - 从 exception.getResponse() 中提取 code 和 message
 *   - 如果 response 是字符串，则 code 使用 HTTP status
 *
 * 未知异常:
 *   - code: 500
 *   - message: '服务器内部错误'
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let code = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        // class-validator 验证错误格式: { message: string[], error: string, statusCode: number }
        const resp = exceptionResponse as Record<string, any>;
        if (Array.isArray(resp.message)) {
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
    } else {
      // 非HttpException的未知错误，记录日志
      this.logger.error('Unhandled exception:', exception);
    }

    response.status(HttpStatus.OK).json({
      code,
      message,
    });
  }
}
