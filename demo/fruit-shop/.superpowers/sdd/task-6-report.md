# Task 6 Report: HttpExceptionFilter 分级日志

## Files Modified

- `packages/server/src/common/filters/http-exception.filter.ts` — 完整替换：constructor 注入 `PinoLogger`，业务异常 → warn，未知异常 → error+stack
- `packages/server/src/main.ts` — 单行修改：`app.useGlobalFilters(new HttpExceptionFilter())` → `app.useGlobalFilters(app.get(HttpExceptionFilter))`

## tsc Output

```
pnpm exec tsc --noEmit
(无输出，clean)
```

## Commit

- SHA: `f05348d`
- Subject: `feat(logging): HttpExceptionFilter 分级日志（warn/error）`

## Self-Review

- [x] Filter 业务异常 (HttpException) → `logger.warn({method, url, code, message}, '业务异常: ...')`
- [x] Filter 未知异常 → `logger.error({method, url, err: exception}, 'Unhandled exception')` (err 字段 pino 会序列化 stack)
- [x] 响应契约保持：`response.status(HttpStatus.OK).json({ code, message })` — 仍 HTTP 200 + body 内业务 code
- [x] `main.ts` 仅修改单行 `useGlobalFilters` 调用；其余未动
- [x] 通过 DI 容器 `app.get(HttpExceptionFilter)` 实例化以注入 `PinoLogger`
- [x] 未执行 D4/D5 runtime 验证（按要求留给 Task 9）
