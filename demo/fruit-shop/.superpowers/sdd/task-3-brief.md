## Task 3: 编写 pino 配置工厂 `pino.config.ts`

**Files:**
- Create: `packages/server/src/common/logging/pino.config.ts`

**说明（实现 vs 设计差异）：** 设计文档第 5 节 `customProps` 直接读 `req.user?.id`，但 pino-http 的 `customProps` 在中间件阶段执行，此时 JWT 守卫尚未运行（`req.user` 为 undefined）。**实现改为**在 `pino-http` 的 `serializers.req` 中读取 `req.user?.id`（serializer 在请求处理后期才被调用，此时 `req.user` 已被 passport 注入）。

- [ ] **Step 1: 编写文件**

```ts
// packages/server/src/common/logging/pino.config.ts

import type { Params } from 'nestjs-pino';
import { redactPaths, maskPersonalData } from './redact.serializer';

/** 慢请求阈值（毫秒） */
const SLOW_REQUEST_MS = 500;

/**
 * Pino 配置工厂
 * - 开发环境：pino-pretty 着色
 * - 生产环境：纯 JSON 到 stdout
 * - 默认级别由 LOG_LEVEL 控制，缺省 info
 */
export function buildPinoOptions(): Params {
  const isDev = process.env.NODE_ENV !== 'production';
  const level = process.env.LOG_LEVEL || 'info';

  return {
    pinoHttp: {
      level,
      // 开发用 pretty；生产留空走默认 JSON
      transport: isDev
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
              ignore: 'pid,hostname',
              singleLine: false,
            },
          }
        : undefined,
      // 自动生成 requestId（pino-http 默认使用 nanoid/uuid，依赖 req.id）
      // 自定义请求序列化器：含 userId（来自 req.user，由守卫注入）
      serializers: {
        req: (req: any) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          // 守卫运行后 req.user 才有值；serializer 在请求处理后期被调用
          userId: req.user?.id,
          body: req.body ? maskPersonalData(req.body) : undefined,
        }),
        res: (res: any) => ({
          statusCode: res.statusCode,
        }),
      },
      // 自定义日志字段（在 serializers 之外补充）
      customProps: (req: any) => ({
        requestId: req.id,
      }),
      // pino 内置 redact：覆盖 headers.authorization / body.password 等
      redact: {
        paths: redactPaths,
        censor: '***',
      },
      // 慢请求标记
      customSuccessMessage: (req: any, res: any, time: number) => {
        const slow = time > SLOW_REQUEST_MS;
        return `${req.method} ${req.url} ${res.statusCode} ${time}ms${
          slow ? ' [SLOW]' : ''
        }`;
      },
      customErrorMessage: (req: any, res: any, time: number) => {
        const slow = time > SLOW_REQUEST_MS;
        return `${req.method} ${req.url} ${res.statusCode} ${time}ms${
          slow ? ' [SLOW]' : ''
        }`;
      },
      // 响应头回写 X-Request-ID（pino-http 默认开启）
    },
  };
}
```

- [ ] **Step 2: 编译验证**

Run:
```bash
cd packages/server && pnpm exec tsc --noEmit
```
Expected: 无报错。

- [ ] **Step 3: 提交**

```bash
git add packages/server/src/common/logging/pino.config.ts
git commit -m "feat(logging): 新增 pino 配置工厂"
```

---

