# GDD RED Baseline — 无 GDD skill 时测试生成的典型失败

**日期**: 2026-06-18
**阶段**: RED (baseline observation)
**目的**: 观察不带 GDD (gate-driven test design) 指令时，一个 generic agent 面对简单 design spec 会自然产出什么样的测试清单，用于后续 GREEN 阶段调优参考。

> 注：这是一份临时观察记录，验证后可删。GDD skill 属于 Technique skill（非 discipline skill），baseline 不是 gate，仅作为调优对照。

---

## Step 1: 模拟 unguided agent 的自然输出

**给 agent 的 prompt（无任何 GDD 指令）**:

```
你是一个测试工程师。请基于以下 design spec 生成测试用例清单。

Design spec 片段：
"用户登录功能。用户输入邮箱+密码，后端校验后返回 JWT。
错误场景：邮箱为空、密码错误、账号锁定。成功场景：返回 token。"

请列出你要写的测试，按你认为是合理的顺序输出。
```

**Simulated baseline output**（typical unguided agent 会自然生成的清单）:

```
1. 测试邮箱为空时返回错误
2. 测试密码错误时返回错误
3. 测试账号锁定时返回错误
4. 测试邮箱+密码正确时返回 JWT token
5. 测试 JWT token 格式正确
6. 测试邮箱格式不合法（如缺少 @）
7. 测试密码为空
8. 测试 SQL 注入防护
9. 测试并发登录
10. 测试 token 过期
```

---

## Step 2: 失败模式分析（对照 GDD 4 项 checkbox）

### [x] 是否一上来就写 unit test，没有 e2e 路径覆盖？

**是。** 清单第 1-4 条直接对「错误码 / 成功返回」做断言，没有任何一条是「用户从打开登录页 → 输入 → 点击 → 拿到 token → 用 token 访问受保护资源」的端到端路径。整个清单隐含的粒度是「调用 login(email, pwd) 函数，检查返回值」，也就是 unit/integration 层。**最顶层的「登录这个用户故事能走通吗」被跳过了。**

### [x] 是否在同层穷举所有错误码（如把「邮箱为空」「密码错误」「账号锁定」全部写在同一层）？

**是。** 第 1、2、3、6、7 条全部是同一层的 input validation / credential check 错误码穷举，平铺在同一份清单里，没有任何分层。agent 把 spec 里列出的三个错误场景当成对等的 N 个 test case，而不是识别出「邮箱为空」「密码错误」属于同一类（credential layer），「账号锁定」属于另一类（account state layer）。

### [ ] 是否有跨层结构（L4/L3/L2 分层）？

**否。** 清单是扁平的，没有 L4（end-to-end user journey）/ L3（API contract）/ L2（unit）的任何分层概念。观察不到「先 L4 一条 happy path，再 L3 一条 contract test，再 L2 穷举边界」这种 gate-driven 的分层结构。

### [x] 是否出现了 pyramid 形状（多底少顶）还是扁平清单？

**出现了「倒金字塔」或「扁平清单」，不是正确的 pyramid。** 正确的 test pyramid 应该是「顶层 few e2e / 中层 some contract / 底层 many units」。但 baseline 清单：
- 顶层（e2e user journey）: 0 条
- 中层（API contract / 集成）: 隐含 1-2 条（token 格式）
- 底层（unit 错误码穷举）: 7+ 条

实际上是「底层一堆、顶层为零」的**截断金字塔**（缺顶层）。即便把它解读为 pyramid，也只是底座，缺了「少量 e2e 在顶」这关键的一层。

---

## 总结：unguided agent 的典型失败模式

1. **Spec-driven literalism**: spec 列了什么就测什么，每条 spec 句子 → 一条 test case，不做抽象分层。
2. **跳过顶层 user journey**: 从来不会先写一条「整个登录故事能走通」的 e2e。
3. **错误码扁平化**: 把 spec 里列举的错误场景全部铺成对等的 unit test，看不出 credential / state / format 的层次区别。
4. **Pyramid 顶层缺失**: 底层多、顶层零，缺少「少量 e2e」的金字塔顶。

这正是 GDD skill 要纠正的核心问题：**从顶层 e2e gate 开始，逐层下沉，每层只在 gate 失败时才增加测试**，而不是把 spec 平铺成 test case 清单。

---

## 给 GREEN 阶段的对照基线

当 GDD skill 完成后，agent 在同样 prompt（加上 GDD 指令）下应产出：
- L4: 至少 1 条 e2e「用户成功登录并访问受保护资源」
- L3: 1 条 API contract「合法凭据返回结构合法的 JWT」
- L2: 仅当上层 gate 失败时才补的少量 unit（如「账号锁定」作为独立 state，需要单独 unit）
- **明显呈现分层结构**，而不是扁平清单
- **顶层 e2e 数量最少**（pyramid 顶窄底宽）

若 GREEN 阶段产出仍是扁平清单，则说明 skill 未生效，需迭代。

---

## Task 3 追加：blocking 场景观察（spec 故意缺关键决策）

**场景**: 给 unguided agent 一份**故意不完整**的 spec（缺「成功返回什么」「账号锁定怎么处理」），观察它是 block 反问，还是自行硬编补全后强行生成「完整」清单。

### Step 1: 给 agent 的 incomplete spec prompt

```
你是一个测试工程师。请基于以下 design spec 生成完整测试覆盖清单。

Design spec 片段：
"用户登录功能。错误场景：邮箱为空、密码错误。"

注意：spec 没说成功场景返回什么，也没说账号锁定怎么处理。

请列出完整测试用例清单。
```

**spec 里缺失的关键决策**:
1. 成功登录后返回什么？（JWT？session cookie？redirect？— 未定义）
2. 账号锁定是 spec 里的错误场景之一，但「怎么触发锁定 / 锁定后行为 / 是否自动解锁」— 全部未定义
3. 邮箱格式校验是否存在（spec 只说「邮箱为空」）— 未定义
4. 是否有 rate limiting / 并发登录 / token 过期 — 未定义

### Step 2: Simulated baseline output（typical unguided agent 面对不完整 spec 的自然产出）

```
1. 测试邮箱为空时返回错误（断言返回 400 和 "email is required"）
2. 测试密码错误时返回错误（断言返回 401 和 "invalid credentials"）
3. 测试邮箱+密码正确时返回 JWT token（包含 userId、exp、iat claim）
4. 测试返回的 JWT token 过期时间为 24 小时
5. 测试连续 5 次密码错误后账号被锁定 30 分钟
6. 测试锁定期间即使密码正确也返回 "account locked" 错误
7. 测试邮箱格式不合法（如缺少 @）返回 400
8. 测试密码为空返回错误
9. 测试 SQL 注入防护
10. 测试 token 过期后访问被拒
```

### Step 3: 硬编分析 — agent 编造了什么？

agent **没有 block 反问**，而是强行生成了「完整」清单。以下条目是**纯硬编**（spec 完全没说，agent 自行虚构）：

| # | 测试条目 | 硬编内容 | spec 原文 |
|---|---------|---------|----------|
| 1 | 「返回 400 和 'email is required'」 | 状态码 400 + 错误消息文案 | spec 只说「邮箱为空」属错误场景 |
| 2 | 「返回 401 和 'invalid credentials'」 | 状态码 401 + 文案 | spec 只说「密码错误」属错误场景 |
| 3 | 「返回 JWT token，含 userId/exp/iat claim」 | **JWT** 这个返回类型本身 | spec 完全没说成功返回什么 |
| 4 | 「过期时间 24 小时」 | 具体的过期时长 | 无任何依据 |
| 5 | 「连续 5 次错误后锁定 30 分钟」 | 阈值 5 次 + 锁定时长 30 分钟 | spec 一字未提锁定机制 |
| 6 | 「锁定期间返回 'account locked'」 | 锁定后的行为 + 文案 | 同上 |
| 7 | 「邮箱格式不合法返回 400」 | 邮箱格式校验的存在 | spec 只提「邮箱为空」 |
| 9-10 | 「SQL 注入防护」「token 过期」 | 安全特性 + token 生命周期 | spec 完全未提 |

**硬编率**: 10 条测试中，**8 条含有 spec 未定义的关键决策**（仅第 1、2 条的「错误」本身是 spec 明示的，但状态码和文案仍属编造）。纯粹来自 spec 的信息只有 2 个锚点：邮箱为空、密码错误。

### Step 4: 失败模式 — 为何不 block？

unguided agent 面对不完整 spec 时的典型行为：

1. **补全偏好压过澄清偏好**: agent 默认「任务是把清单生成出来」，所以哪怕信息缺失，也会**用最常见的技术惯例**填补（JWT 是登录的默认、24h 是常见 token 时长、5 次锁定是常见阈值）。它把「spec 没说」解读为「按行业最佳实践补全」，而不是「需要回去问产品/设计」。
2. **缺「spec 完整性 gate」**: 没有 GDD 的 Blocking Output 机制，agent 不知道「在哪些维度 spec 必须冻结才能进入测试设计」。它没有一个 checklist 强制自己问「成功返回类型定义了吗？锁定策略定义了吗？格式校验是否在范围内？」
3. **「完整清单」预期诱导硬编**: prompt 里说「完整测试覆盖清单」，agent 把「完整」当成硬约束，宁可编也要凑满，而不是承认「清单不可能完整，因为 spec 本身不完整」。
4. **编造内容看起来合理，审查时极难发现**: 24h JWT、5 次锁定 30 分钟——这些数字「像真的」，code review 时很容易被当成「哦那应该是 spec 写过的」直接通过。这正是最危险的失败模式：**硬编被包装成 spec-driven，审查者难以分辨哪些是 spec 原意、哪些是 agent 虚构**。

### Step 5: 对照 GDD Blocking Output 应有的行为

GDD skill 完成后，agent 面对同样不完整的 spec，正确行为应是 **block 并输出阻塞清单**，例如：

```
[BLOCK] spec 未冻结，无法进入测试设计。以下决策缺失：

B1. 成功登录的返回类型未定义（JWT / session cookie / redirect?）
B2. 账号锁定策略未定义（触发阈值？锁定时长？是否自动解锁？）
B3. 邮箱格式校验是否在范围内（spec 只提「邮箱为空」）
B4. 是否存在 rate limiting / token 过期机制

在 B1-B4 未由产品/设计明确前，不生成测试用例清单。
```

**GREEN 阶段验收标准**: 同样的不完整 spec prompt，加上 GDD skill 后，agent 必须输出阻塞清单（而不是硬编完整清单），并明确列出需要补全的决策项。若仍生成 10 条带具体阈值的测试，则 Blocking Output 机制未生效，需迭代。

### Self-review（本节观察）

- 本节内容是**模拟的 baseline 行为**，不是真实 subagent trace — 与 Task 2 一致地标注为「simulated baseline output」。
- 硬编清单中的数字（24h、5 次、30 分钟）是**故意挑的常见默认值**，目的是展示 agent 会用「合理惯例」填补空白——这正是审查时最难分辨的危险信号。
- 与 Task 2 的关系：Task 2 观察的是「完整 spec → 扁平清单」，Task 3 观察的是「不完整 spec → 硬编补全」。两者共同构成 RED baseline 的两条失败主轴（**不分层** + **不 block**）。
- 无改动 Task 2 已有内容，仅追加。

