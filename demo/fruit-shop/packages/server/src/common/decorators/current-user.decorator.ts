import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 从 request.user 中提取当前用户信息
 * 由 JwtAuthGuard (passport-jwt) 注入
 * @example @CurrentUser() user: { id: number; role: string }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    // 支持 @CurrentUser('id') 提取单个字段
    return data ? user?.[data] : user;
  },
);
