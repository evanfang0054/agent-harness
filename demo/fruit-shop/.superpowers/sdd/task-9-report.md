# Task 9 Report

## Status: DONE (Step 1 & Step 2 only)

## File Modified
- `packages/server/.env.example` — appended Logging section at EOF

## Commit
- SHA: `27470a6`
- Subject: `docs(server): .env.example 补充 LOG_LEVEL`

## Diff Summary
```diff
@@ -17,3 +17,6 @@ JWT_REFRESH_EXPIRES_IN=604800

 # Server
 PORT=3000
+
+# Logging
+LOG_LEVEL=info
```

## Self-Review
- [x] Only `.env.example` changed (1 file, +3 lines)
- [x] Section header `# Logging` present
- [x] `LOG_LEVEL=info` present
- [x] No accidental edits to existing lines (DB / Redis / JWT / Server sections untouched)
- [x] Leading blank line preserved before `# Logging` for readability

## Deferred
Step 3 (D1–D13 contract verification) is deferred to the user as a manual runtime checklist — requires MySQL/Redis server + curl + multi-terminal inspection.

## Final Review Fixes

针对全分支终审提出的 4 项 findings（1 Critical + 3 Important），本次单次提交集中修复。

### C1 (Critical) — genReqId + X-Request-Id 响应头

- **文件**：`packages/server/src/common/logging/pino.config.ts:3, 22-27`
- **Before**：未配置 `genReqId`。pino-http v11 默认生成递增整数 ID，且不会回写 `X-Request-ID` 响应头 → 不满足 D3。
- **After**：
  ```ts
  import { randomUUID } from 'node:crypto';
  // ...
  genReqId: (req: any, res: any) => {
    const existing = req.headers['x-request-id'];
    const id = (typeof existing === 'string' && existing.length > 0) ? existing : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  ```
  同时删除了 pinoHttp 末尾那条误导性注释 `// 响应头回写 X-Request-ID（pino-http 默认开启）` —— pino-http 默认不开启，回写由我们的 `genReqId` 完成。
- **Why**：满足 D3「`curl -i` 响应头含 `X-Request-ID: <uuid>`」。

### I1 (Important) — 登录日志移除原始 phone

- **文件**：`packages/server/src/modules/auth/auth.service.ts:107-110`
- **Before**：
  ```ts
  this.logger.info(
    { userId: user.id, phone: user.phone },
    '用户登录成功',
  );
  ```
- **After**：
  ```ts
  this.logger.info(
    { userId: user.id },
    '用户登录成功',
  );
  ```
- **Why**：Pino redact 仅覆盖 `req.body.phone`（access log 路径），对业务 logger 任意 payload 无效。`phone` 明文落盘属 PII 泄露，`userId` 足以定位用户。

### I2 (Important) — customErrorMessage 第 4 参数 responseTime

- **文件**：`packages/server/src/common/logging/pino.config.ts:72-78`
- **Before**：
  ```ts
  customErrorMessage: (req: any, res: any, _err: Error) => {
    const time = (res as any).responseTime ?? 0;
    // ...
  ```
  pino-http v11 不通过 `res.responseTime` 传时延，恒读 0 → 错误请求日志无耗时 / 无 `[SLOW]`。
- **After**：
  ```ts
  customErrorMessage: (req: any, res: any, _err: Error, responseTime?: number) => {
    const time = responseTime ?? 0;
    const slow = time > SLOW_REQUEST_MS;
    return `${req.method} ${req.url} ${res.statusCode} ${time}ms${slow ? ' [SLOW]' : ''} [ERROR]`;
  },
  ```
- **Why**：与 `customSuccessMessage` 行为对齐，错误路径也能正确显示耗时并触发 `[SLOW]` 标记（D8）。

### I3 (Important) — redact 响应体路径加防御性注释 + 同步 contract D7

- **文件**：`packages/server/src/common/logging/redact.serializer.ts:20-25`、`docs/superpowers/contracts/server-logging.contract.md:14`
- **Before**：redact 中 `res.body.*` 4 条路径属死代码（res serializer 仅输出 statusCode），原 D7「`body.accessToken` 显示为 `***`」无法验证。
- **After**：
  - 在 redact.serializer.ts 对应区段加注释：
    ```ts
    // 以下响应体路径为防御性配置 —— 当前 res serializer 仅输出 statusCode，不记录 body。
    // 若未来扩展 res serializer 输出 body，这些路径自动生效，确保 token 不落盘。
    ```
  - contract D7 改为：「响应 body 不被日志记录（res serializer 仅输出 statusCode），token 永不落盘；若未来 res serializer 扩展输出 body，redact.paths 中 `res.body.*` 路径自动接管脱敏」。
- **Why**：避免后续维护者误判死代码而删除，并把契约措辞与实现真相对齐。

### 验证

- **tsc**：`cd packages/server && pnpm exec tsc --noEmit` → 无输出（clean）。
- **变更文件（共 4 个）**：
  - `packages/server/src/common/logging/pino.config.ts`
  - `packages/server/src/modules/auth/auth.service.ts`
  - `packages/server/src/common/logging/redact.serializer.ts`
  - `docs/superpowers/contracts/server-logging.contract.md`

### Commit

见本次提交元数据（subject：`fix(logging): final review 修复 genReqId/phone/redact 注释/error responseTime`）。
