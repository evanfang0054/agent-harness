import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SUCCESS_CODE } from 'shared';

/**
 * 统一成功响应格式
 * { code: 0, data: T, message: 'success' }
 */
export interface ApiResponseFormat<T> {
  code: number;
  data: T;
  message: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseFormat<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseFormat<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: SUCCESS_CODE,
        data,
        message: 'success',
      })),
    );
  }
}
