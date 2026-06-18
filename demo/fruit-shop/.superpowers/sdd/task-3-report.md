# Task 3 Report — pino.config.ts

## Status: DONE

## File Created
- `/Users/arwen/Desktop/Arwen/evanfang/superpowers/demo/fruit-shop/packages/server/src/common/logging/pino.config.ts` (verbatim from brief)

## tsc Output (NOT clean)

```
src/common/logging/pino.config.ts(20,5): error TS2322: Type '...' is not assignable to type 'Options<IncomingMessage, ServerResponse<IncomingMessage>, never> | ...'.
  Types of property 'customErrorMessage' are incompatible.
    Type '(req: any, res: any, time: number) => string' is not assignable to type '(req: IncomingMessage, res: ServerResponse<IncomingMessage>, error: Error) => string'.
      Types of parameters 'time' and 'error' are incompatible.
        Type 'Error' is not assignable to type 'number'.
```

## Root Cause

The brief's `customErrorMessage: (req: any, res: any, time: number)` signature conflicts with pino-http's declared type
`(req: IM, res: SR, error: Error) => string` (see `node_modules/pino-http/index.d.ts` line 34).

Per pino-http's API, the third parameter for error messages is the `Error` object, not response time. The brief code appears to have mistaken this for the `customSuccessMessage` signature (which does take `responseTime: number`, line 33).

Per task instructions, I am NOT improvising types and reporting BLOCKED rather than silently fixing.

## Suggested Fix (requires human/brief approval)

Replace the error handler signature. Two viable options:

### Option A — Match pino-http signature (use error.message)
```ts
customErrorMessage: (req: any, res: any, err: Error) => {
  return `${req.method} ${req.url} ${res.statusCode} ${(err as any)?.responseTime ?? '?'}ms [ERROR] ${err.message}`;
},
```
Note: pino-http does not pass response time to the error handler. To preserve slow-request tagging on errors, we'd need to track time separately (e.g., via `customProps` + `res.locals`) or drop `[SLOW]` on error messages.

### Option B — Use any casts to match brief intent
```ts
customErrorMessage: (req: any, res: any, time: any) => {
  const slow = Number(time) > SLOW_REQUEST_MS;
  return `${req.method} ${req.url} ${res.statusCode} ${time}ms${slow ? ' [SLOW]' : ''}`;
},
```
This compiles but lies about the parameter — at runtime `time` will be an `Error`, not a number.

### Option C — Reference pino-http's internal responseTime
pino-http exposes response time via `res.responseTime` after the response finishes. The error message could read `(res as any).responseTime`:
```ts
customErrorMessage: (req: any, res: any, _err: Error) => {
  const time = (res as any).responseTime ?? 0;
  const slow = time > SLOW_REQUEST_MS;
  return `${req.method} ${req.url} ${res.statusCode} ${time}ms${slow ? ' [SLOW]' : ''} [ERROR]`;
},
```

## Fix 1

After controller approval, applied **Option C** (read `responseTime` from `res`) to resolve the pino-http type conflict.

### Change (before → after)

Before:
```ts
customErrorMessage: (req: any, res: any, time: number) => {
  const slow = time > SLOW_REQUEST_MS;
  return `${req.method} ${req.url} ${res.statusCode} ${time}ms${
    slow ? ' [SLOW]' : ''
  }`;
},
```

After:
```ts
customErrorMessage: (req: any, res: any, _err: Error) => {
  const time = (res as any).responseTime ?? 0;
  const slow = time > SLOW_REQUEST_MS;
  return `${req.method} ${req.url} ${res.statusCode} ${time}ms${
    slow ? ' [SLOW]' : ''
  } [ERROR]`;
},
```

### Why

- pino-http's declared type for `customErrorMessage` is `(req, res, error: Error) => string` (see `node_modules/.pnpm/pino-http@11.0.0/node_modules/pino-http/index.d.ts` line 34). The brief's original `(req, res, time: number)` signature conflicted with this (Type `Error` not assignable to `number`).
- The third parameter is the `Error` object, not response time — renamed to `_err` (unused) to reflect actual semantics.
- `[SLOW]` marker semantics preserved by reading `responseTime` from `res`: pino-http attaches `responseTime` (ms) to the response object after the response finishes, so `(res as any).responseTime ?? 0` safely recovers timing.
- Added `[ERROR]` suffix to distinguish error-path messages from success-path messages.

### tsc Result (clean)

```
$ pnpm exec tsc --noEmit
(no output — exit 0)
```

### Commit

- SHA: `3bc050e`
- Subject: `feat(logging): 新增 pino 配置工厂`

## Self-Review (final)

- All concerns from the BLOCKED state resolved.
- No other code modified; fix is scoped to the `customErrorMessage` function only.
- tsc clean (no errors, no warnings).

