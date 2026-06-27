# 上游 v5.0.7 → v6.0.2 按需同步设计

- **日期**：2026-06-18
- **分支**：`feat/sdd-v6-sync`
- **基线**：fork 起点 `a6895f5`（2026-04-01，父 commit `dd23728` 为上游 v5.0.7 之后的 dev 提交）
- **同步区间**：上游 `1f20bef (v5.0.7) → b62616f (v6.0.2)`，跨越 v5.1.0 和 v6.0.0 两个版本
- **范围**：仅同步 A 类（SDD 审查重写）+ D 类（Bug 修复 + 安全加固）

## 目标

把上游 v5.1.0 / v6.0.0 中与 **SDD 审查机制** 和 **bug/安全修复** 相关的变更，按需同步到 fork，同时**完整保留** fork 已有的魔改（ralph-loop 驱动、harness 系列、learnings 体系等）。

## 非目标

- 不引入 brainstorming visual companion（fork 无此攻击面）
- 不动 worktree / finishing-a-development-branch 的 v5.1+v6.0 重写
- 不加新 harness 适配（Kimi / Pi / Antigravity）
- 不改 writing-skills / writing-plans 的 v6.0 新增内容
- 不动版本号（同步完成后再统一 bump）

## 同步单元清单

### A 类 · SDD 审查重写

| # | 文件 | 动作 | 理由 |
|---|---|---|---|
| A1 | `skills/subagent-driven-development/task-reviewer-prompt.md` | 🟢 新增（上游原样） | v6.0 核心：单 reviewer 同时返回 spec 合规 + 质量双 verdict |
| A2 | `skills/subagent-driven-development/scripts/task-brief` | 🟢 新增（上游原样） | 把 task 文本写入文件，避免 diff 堆在昂贵上下文 |
| A3 | `skills/subagent-driven-development/scripts/review-package` | 🟢 新增（上游原样） | 把 review diff 写入文件给 reviewer 读 |
| A4 | `skills/subagent-driven-development/spec-reviewer-prompt.md` | 🔴 删除 | v6.0 已被 `task-reviewer-prompt.md` 取代 |
| A5 | `skills/subagent-driven-development/code-quality-reviewer-prompt.md` | 🔴 删除 | 同 A4 |
| A6 | `skills/subagent-driven-development/SKILL.md` | 🟡 手动 merge | 最大冲突点：保留 ralph-loop 驱动 + 接入 v6.0 审查机制重写 |
| A7 | `skills/subagent-driven-development/implementer-prompt.md` | 🟡 手动 merge | 接入 model 声明要求 + report-to-file + TDD red/green 证据 |

### D 类 · Bug 修复 + 安全加固

| # | 文件 | 动作 | 理由 |
|---|---|---|---|
| D1 | `scripts/bump-version.sh` | 🟡 手动 merge | 上游和 fork 都改过，需细看 diff |
| D2 | `hooks/session-start` | 🟡 手动 merge | 上游 v5.1 把 Codex 逻辑拆到独立 `session-start-codex`，主文件简化 |
| D3 | `hooks/session-start-codex` | 🟢 新增（上游原样） | 上游 v5.1 新增，配合 D2 |
| D4 | `hooks/hooks-codex.json` | 🟢 新增（上游原样） | fork 无此文件 |
| D5 | `hooks/hooks-cursor.json` | 🟡 手动 merge | 上游修了 Windows SessionStart 路由（走 `run-hook.cmd`）+ 去 BOM |
| D6 | `hooks/hooks.json` | 🟡 手动 merge | fork 35 行 vs 上游 16 行，需保留 stop-hook.sh 注册 |

## 执行顺序（5 阶段，每阶段独立 commit + 可验证）

```
阶段 1: 🟢 零冲突新增（A1, A2, A3, D3, D4）
阶段 2: 🔴 旧 reviewer 删除 + 引用清理（A4, A5）
阶段 3: 🟡 SDD SKILL.md 手动 merge（A6）  ← 最复杂
阶段 4: 🟡 SDD implementer-prompt.md merge（A7）
阶段 5: 🟡 hooks / scripts 手动 merge（D1, D2, D5, D6）
```

每阶段一个 commit，出问题可 `git revert <sha>` 单独回退。

## 每阶段验证标准

| 阶段 | 验证方法 |
|---|---|
| 1 | `ls` 确认 5 个新文件存在；`grep -r "task-reviewer-prompt\|session-start-codex"` 确认引用方已就位 |
| 2 | `grep -r "spec-reviewer-prompt\|code-quality-reviewer-prompt"` 在 `skills/` 下返回 0 结果 |
| 3 | SKILL.md 同时包含 `ralph-loop`（保留）和 `task-reviewer-prompt.md`（新引用）；流程图无矛盾 |
| 4 | implementer-prompt.md 包含 model 声明要求 + report-to-file 指令 |
| 5 | 三个 hooks JSON（`hooks.json` / `hooks-cursor.json` / `hooks-codex.json`）`python3 -m json.tool` 校验通过；session-start 与 session-start-codex 分工清晰 |

## A6（SDD SKILL.md）merge 策略

这是唯一有实质风险的 merge，单独说明：

1. **读上游 v6.0 的 SKILL.md 全文**，理解新流程骨架：pre-flight plan check → 单 reviewer 双 verdict → 末尾 broad review → progress ledger
2. **提取 fork 的 ralph-loop 增量**：`git diff 1f20bef..HEAD -- skills/subagent-driven-development/SKILL.md` 中属于 ralph-loop 的部分
3. **以上游 v6.0 为基底**，把 ralph-loop 作为「controller 编排模式」的一节插入，**不改动**上游的 reviewer 调用流程
4. 关键不变量：
   - reviewer 调用必须走 `task-reviewer-prompt.md`（不再是两个旧 prompt）
   - 每次 dispatch 必须声明 model
   - controller 不得压制 finding（v6.0 硬性要求，ralph-loop 也不能违反）

## 风险与回退

- 每阶段独立 commit，任何阶段失败 `git revert <sha>` 回退
- 若 A6 merge 失败，保留 `feat/harness` 不动，在 `feat/sdd-v6-sync` 上继续实验
- **不使用** `git merge upstream/main`（会带入 B/C 类无关变更），全程手动文件级同步

## 不做的事（明确边界）

- 不引入 brainstorming visual companion（无攻击面）
- 不动 worktree / finishing 重写（B 类未选）
- 不加新 harness 适配（C 类未选）
- 不改 writing-skills / writing-plans 的 v6.0 新增内容
- 不动版本号（同步完成后再统一 bump）
