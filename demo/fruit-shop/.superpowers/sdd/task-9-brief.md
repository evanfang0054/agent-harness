## Task 9: 更新 `.env.example` 与 contract 验证

**Files:**
- Modify: `packages/server/.env.example`

- [ ] **Step 1: 追加 LOG_LEVEL**

在 `.env.example` 文件末尾追加：

```
# Logging
LOG_LEVEL=info
```

- [ ] **Step 2: 提交**

```bash
git add packages/server/.env.example
git commit -m "docs(server): .env.example 补充 LOG_LEVEL"
```

- [ ] **Step 3: 合约全量验证（对照 D1–D13）**

按下面清单逐项跑（每条都是单条命令，对照 contract 期望输出）。任一未通过回到对应 Task 修正。

```bash
# D1 启动日志（已在 Task 5 验证）
# D2 Access log 字段完整性 + X-Request-ID
curl -i http://localhost:3000/api/products 2>&1 | grep -i "x-request-id"

# D3 requestId 串联：抓响应头里的 id，去 stdout grep
RID=$(curl -si http://localhost:3000/api/products 2>&1 | grep -i "x-request-id" | awk '{print $2}' | tr -d '\r')
# 在终端 1（server 日志窗口）执行：
#   grep $RID <最近一段日志>   ← 应至少能找到 1 条 access log

# D4 业务异常 warn（已在 Task 6 验证）
# D5 未知异常 error（已在 Task 6 验证）

# D6 请求脱敏
curl -sX POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900000099","password":"SecretPass1"}' >/dev/null
# 终端 1 应看到 req.body.password 为 "***"，req.headers.authorization 为 "***"（若发了 auth header）

# D7 响应脱敏
curl -sX POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900000099","password":"SecretPass1"}' >/dev/null
# 终端 1 应看到 res.body.accessToken / res.body.refreshToken 为 "***"

# D8 慢请求标记：临时加 controller 延迟（操作同 Task 6 Step 5，延迟 600ms）
# 在 product.controller 顶部加：await new Promise(r => setTimeout(r, 600));
# curl 后应看到日志 message 末尾含 [SLOW]，responseTime > 500
# 验证后务必移除延迟代码

# D9 下单日志（已在 Task 8 验证）
# D10 认证日志（已在 Task 7 验证）

# D11 日志级别控制
# 11a. 默认 info：可见 access log + INFO 日志，DEBUG 不见
# 11b. .env.local 设 LOG_LEVEL=warn，重启，重复 D2：access log 应消失
# 11c. .env.local 设 LOG_LEVEL=debug，重启：可见 "JWT 签发" DEBUG 日志

# D12 端到端回归
# 跑 Task 8 Step 4 的完整链路，确认全程响应 code:0、无 5xx、无 "Unhandled exception" 日志

# D13 TypeORM 兼容
# .env.local 设 DB_LOGGING=true，重启，触发任意 SQL 查询
# stdout 应同时含 TypeORM SQL 输出 + pino 日志，互不干扰
```

- [ ] **Step 4: 终结提交（如有遗留改动）**

如果验证过程中为调试修改过任何文件，最终统一一次提交；否则跳过。

```bash
git status
# 如有改动：
git commit -am "chore(logging): 验证后微调"
```

---

## Self-Review 结果

**Spec 覆盖**：
- 第 2 节选型 → Task 1 ✓
- 第 3 节三层架构（access / error / 业务）→ Task 5（access via pino-http）/ Task 6（error）/ Task 7–8（业务）✓
- 第 4 节文件结构 → Task 2–4 ✓
- 第 5 节关键配置 → Task 3 ✓
- 第 6 节脱敏清单 → Task 2（含 oldPassword/newPassword、authorization、data.* 包装）✓
- 第 7 节改造点 → Task 5（main.ts）/ Task 6（filter）/ Task 7–8（service）✓
- 第 8 节风险（pino-pretty dev only / DB_LOGGING 不冲突 / async 不启用）→ 计划未额外启用 async、Task 1 分了 devDep、Task 9 D13 覆盖 DB_LOGGING ✓
- 第 9 节测试清单 → Task 5–8 + Task 9 的 DoD 验证 ✓
- 第 10 节实施分步 → 9 个 Task 对齐 ✓

**占位符扫描**：无 TBD/TODO，所有 step 含完整代码或完整命令。

**类型一致性**：
- `PinoLogger` 统一从 `nestjs-pino` 导入 ✓
- `redactPaths` / `maskPersonalData` 定义点（Task 2）与使用点（Task 3）签名一致 ✓
- `buildPinoOptions` 返回 `Params`（nestjs-pino 类型），与 Task 4 `LoggerModule.forRoot` 入参一致 ✓
- `HttpExceptionFilter` 构造函数改为注入 `PinoLogger`，Task 6 Step 2 同步更新了 `main.ts` 的实例化方式 ✓

**实现 vs 设计的偏离（已显式记录）：**
- 设计第 5 节 `customProps(req) => ({ userId: req.user?.id })` 在中间件阶段拿不到 user。改为在 `serializers.req` 里读 `req.user?.id`（serializer 在请求处理后期才调用）。已在 Task 3 顶部说明。
