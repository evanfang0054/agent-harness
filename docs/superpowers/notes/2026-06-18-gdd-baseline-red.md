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
