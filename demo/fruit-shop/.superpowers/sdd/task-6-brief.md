## Task 6: 改造 `HttpExceptionFilter` — 分级日志

**Files:**
- Modify: `packages/server/src/common/filters/http-exception.filter.ts`

**说明：** 原 filter 仅对「未知异常」打日志。改为：
- 业务异常（HttpException）→ `logger.warn`，记录 code / message / path
- 未知异常 → `logger.error` + 完整 stack

- [ ] **Step 1: 完整替换文件**

```ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
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

    response.status(HttpStatus.OK).json({
      code,
      message,
    });
  }
}
```

- [ ] **Step 2: 改造 filter 的实例化方式**

`main.ts` 中现在用 `new HttpExceptionFilter()` 实例化（无参数）。改为由 DI 容器注入：

修改 `packages/server/src/main.ts` 中 `app.useGlobalFilters(...)` 这一行：

```ts
// 原：app.useGlobalFilters(new HttpExceptionFilter());
// 改为：
app.useGlobalFilters(app.get(HttpExceptionFilter));
```

- [ ] **Step 3: 编译验证**

Run:
```bash
cd packages/server && pnpm exec tsc --noEmit
```
Expected: 无报错。

- [ ] **Step 4: 启动验证 D4（业务异常 warn）**

终端 1 启动：
```bash
pnpm --filter server dev
```

终端 2 触发参数校验失败：
```bash
curl -sX POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"not-a-phone"}' | head
```
Expected（终端 1 stdout）：
- 出现一条 `WARN` 级别日志
- 含 `code: 400` 与 `message: phone must ...`（class-validator 报错合并）
- 含 `method / url`

- [ ] **Step 5: 启动验证 D5（未知异常 error）**

临时在 `packages/server/src/modules/product/product.controller.ts` 的任一 handler 顶部加入：
```ts
throw new Error('test-unhandled');
```
（验证后**必须删除**）

终端 2 触发：
```bash
curl -s http://localhost:3000/api/products | head
```
Expected（终端 1 stdout）：
- 出现一条 `ERROR` 级别日志
- `message: Unhandled exception`
- `err.stack` 含 `Error: test-unhandled` 与完整堆栈

- [ ] **Step 6: 删除临时 throw 并提交**

恢复 `product.controller.ts`，然后：
```bash
git add packages/server/src/common/filters/http-exception.filter.ts packages/server/src/main.ts
git commit -m "feat(logging): HttpExceptionFilter 分级日志（warn/error）"
```

---

