## Task 1: 安装依赖

**Files:**
- Modify: `packages/server/package.json`

- [ ] **Step 1: 安装生产依赖**

Run:
```bash
pnpm --filter server add nestjs-pino@^4.0.0 pino-http
```
Expected: `package.json` 的 `dependencies` 出现 `nestjs-pino` 和 `pino-http`，`pnpm-lock.yaml` 更新。

- [ ] **Step 2: 安装开发依赖（pino-pretty）**

Run:
```bash
pnpm --filter server add -D pino-pretty
```
Expected: `package.json` 的 `devDependencies` 出现 `pino-pretty`。

- [ ] **Step 3: 验证可导入**

Run:
```bash
cd packages/server && node -e "require('nestjs-pino'); require('pino-http'); require('pino-pretty'); console.log('OK')"
```
Expected: 输出 `OK`，无报错。

- [ ] **Step 4: 提交**

```bash
git add packages/server/package.json pnpm-lock.yaml
git commit -m "chore(server): 引入 nestjs-pino / pino-http / pino-pretty"
```

---

