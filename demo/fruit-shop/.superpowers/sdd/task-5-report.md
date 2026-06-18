# Task 5 Report: 改造 `main.ts` — 注册 PinoLogger

## File Modified

- `packages/server/src/main.ts` (full replacement per brief)

## tsc Output

```
$ pnpm exec tsc --noEmit
(clean, no output)
```

## Commit

- SHA: `41a1dba`
- Subject: `feat(logging): main.ts 接入 PinoLogger 替换 console.log`

## Self-Review

| Check | Result |
|-------|--------|
| Only `main.ts` changed | ✅ (`1 file changed, 6 insertions(+), 2 deletions(-)`) |
| `console.log` removed | ✅ Replaced by `app.get(Logger).log(...)` |
| `bufferLogs: true` present | ✅ `NestFactory.create(AppModule, { bufferLogs: true })` |
| `app.useLogger(app.get(Logger))` present | ✅ |
| `Logger` imported from `nestjs-pino` | ✅ |
| ValidationPipe unchanged | ✅ whitelist + forbidNonWhitelisted + transform + implicit conversion |
| TransformInterceptor unchanged | ✅ `new TransformInterceptor()` |
| HttpExceptionFilter unchanged | ✅ `new HttpExceptionFilter()` (instantiated directly — Task 6 territory) |
| CORS unchanged | ✅ `origin: true, credentials: true` |
| Global prefix `api` unchanged | ✅ |
| TypeScript strict mode clean | ✅ `tsc --noEmit` exits 0 |

## Notes

- Did NOT start the dev server per task instructions (D1 runtime verification deferred to Task 9).
- Did NOT touch `HttpExceptionFilter` instantiation — Task 6 will handle DI-based wiring.
