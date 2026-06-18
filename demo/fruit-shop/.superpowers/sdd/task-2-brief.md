## Task 2: 编写脱敏模块 `redact.serializer.ts`

**Files:**
- Create: `packages/server/src/common/logging/redact.serializer.ts`

- [ ] **Step 1: 编写文件**

```ts
// packages/server/src/common/logging/redact.serializer.ts

/**
 * 日志脱敏工具
 * - redactPaths: 喂给 pino `redact.paths`，按路径精确脱敏
 * - maskPersonalData: 自定义 serializer 中递归处理 body 内敏感字段（手机号/邮箱）
 */

// pino redact 路径（请求头 + 请求体 + 响应体）
export const redactPaths: string[] = [
  // 请求头
  'req.headers.authorization',
  // 请求体 - 密码类
  'req.body.password',
  'req.body.oldPassword',
  'req.body.newPassword',
  // 请求体 - token 类
  'req.body.token',
  'req.body.refreshToken',
  // 响应体 - token 类（auth.service 返回）
  'res.body.accessToken',
  'res.body.refreshToken',
  // 响应体 - data 包装后的 token（TransformInterceptor 包装层）
  'res.body.data.accessToken',
  'res.body.data.refreshToken',
];

const PHONE_RE = /^1[3-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 将手机号 13888888888 → 138****8888 */
function maskPhone(phone: string): string {
  if (!PHONE_RE.test(phone)) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

/** 将邮箱 foo@example.com → f***@***.com */
function maskEmail(email: string): string {
  if (!EMAIL_RE.test(email)) return email;
  const [name, domain] = email.split('@');
  const [dom, ...tld] = domain.split('.');
  return `${name[0]}***@***.${tld.join('.')}`;
}

/**
 * 递归遍历对象，对 phone / email 字段做马赛克。
 * 不会修改原始对象（深拷贝）。
 */
export function maskPersonalData<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(maskPersonalData) as unknown as T;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === 'string' && (key === 'phone' || key === 'email')) {
      out[key] = key === 'phone' ? maskPhone(value) : maskEmail(value);
    } else if (value && typeof value === 'object') {
      out[key] = maskPersonalData(value);
    } else {
      out[key] = value;
    }
  }
  return out as T;
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
git add packages/server/src/common/logging/redact.serializer.ts
git commit -m "feat(logging): 新增脱敏工具 redact.serializer"
```

---

