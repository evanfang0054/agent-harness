# Task 7 Report: `auth.service` 注入 PinoLogger + 业务埋点

## Status: DONE

## File Modified
- `packages/server/src/modules/auth/auth.service.ts`（唯一改动文件）

## Changes Applied
1. **Import**：新增 `import { PinoLogger } from 'nestjs-pino';`
2. **构造函数**：追加 `private readonly logger: PinoLogger` 参数；构造函数体内调用 `this.logger.setContext(AuthService.name);`
3. **`login()`**：在 `generateTokens(...)` 之后、`return` 之前插入 `this.logger.info({ userId, phone }, '用户登录成功')`
4. **`generateTokens()`**：在 `return { accessToken, refreshToken }` 之前插入 `this.logger.debug({ userId, accessJti, refreshJti }, 'JWT 签发')`
5. **`logout()`**：在 `if (decoded?.exp)` 分支内的 `await this.redis.set(...)` 之后插入 `this.logger.info({ userId, jti, ttl }, 'JWT 已加入黑名单（登出）')`
6. **未改动 `auth.module.ts`**：依赖 `nestjs-pino` v4 的 `LoggerModule` 全局注册，等 tsc 验证。

## Verification

### tsc 输出
```
$ cd packages/server && pnpm exec tsc --noEmit
（无输出，退出码 0 —— clean）
```

## Commit
- SHA: `eb05cde`
- Subject: `feat(logging): auth.service 接入 PinoLogger（登录/JWT/登出）`
- Diff stat: 1 file changed, 31 insertions(+), 1 deletion(-)

## Self-Review

| 检查项 | 结果 |
|---|---|
| Logger 方法遵循 pino 约定 `(contextObj, message)` | OK —— 三处埋点均为 `(object, string)` 签名 |
| 构造函数中 `this.logger.setContext(AuthService.name)` | OK —— 第 36 行 |
| 未改动业务逻辑 | OK —— 仅新增日志语句，无控制流/返回值/异常变更 |
| `login` 埋点位置（generateTokens 之后、return 之前） | OK —— 第 107-114 行 |
| `generateTokens` 埋点位置（return 之前） | OK —— 第 258-265 行 |
| `logout` 埋点位置（`if (decoded?.exp)` 内 redis.set 之后） | OK —— 第 192-202 行，`ttl` 在该作用域可见 |
| `auth.module.ts` 未改动 | OK —— DI 依赖全局 `LoggerModule`，tsc 通过即可保证类型/注入符号可解析 |

## Notes
- 按 brief Step 5 指示，未修改 `auth.module.ts`。运行时 DI 验证属于 Task 9 范围，本任务不执行。
- `ttl` 变量声明在 `if (decoded?.exp)` 内的 `const ttl = ...` 行，紧随其后的 `if (ttl > 0)` 块作用域内 —— 埋点放在该内层块中 redis.set 之后，`ttl` 可见。
