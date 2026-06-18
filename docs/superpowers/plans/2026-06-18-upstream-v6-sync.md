# 上游 v5.0.7 → v6.0.2 按需同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把上游 obra/superpowers v5.1.0 / v6.0.0 中 SDD 审查机制重写 + bug/安全修复同步到 fork，完整保留 fork 的 ralph-loop 驱动与 learnings 体系。

**Architecture:** 文件级手动同步（不使用 `git merge upstream/main`），分 5 阶段执行，每阶段独立 commit + 可验证 + 可回退。SDD SKILL.md 是唯一需要手动 merge 的复杂文件，策略是以上游 v6.0 为基底 + 把 ralph-loop 作为 orchestrator 编排模式插入。

**Tech Stack:** Bash（hooks/scripts）、Markdown（skills SKILL.md + prompt 模板）、JSON（hooks 配置）。

**Spec:** `docs/superpowers/specs/2026-06-18-upstream-v6-sync-design.md`

---

## File Structure

### 新增文件（零冲突）
- `skills/subagent-driven-development/task-reviewer-prompt.md` — v6.0 单 reviewer 双 verdict 模板
- `skills/subagent-driven-development/scripts/task-brief` — 提取任务文本到文件
- `skills/subagent-driven-development/scripts/review-package` — 生成 review diff 包
- `hooks/session-start-codex` — Codex 专用 SessionStart hook
- `hooks/hooks-codex.json` — Codex hooks 配置

### 删除文件
- `skills/subagent-driven-development/spec-reviewer-prompt.md` — 被 task-reviewer-prompt.md 取代
- `skills/subagent-driven-development/code-quality-reviewer-prompt.md` — 同上

### 手动 merge 文件
- `skills/subagent-driven-development/SKILL.md` — 以上游 v6.0 为基底 + 保留 ralph-loop 编排模式
- `skills/subagent-driven-development/implementer-prompt.md` — 接入 model 声明 + report-to-file + TDD 证据
- `scripts/bump-version.sh` — 保留 fork 的中文交互式 changelog，无需引入上游变更（fork 增量是有意改动）
- `hooks/session-start` — 拆分 Codex 分支到 session-start-codex，主文件保留 learnings 注入
- `hooks/hooks-cursor.json` — 引入上游的 `run-hook.cmd` 路由
- `hooks/hooks.json` — 保留 fork 的 Stop hook + CLAUDE_SESSION_ID 注入

---

## Task 1: 新增 SDD 审查重写核心文件（A1-A3）

**Files:**
- Create: `skills/subagent-driven-development/task-reviewer-prompt.md`
- Create: `skills/subagent-driven-development/scripts/task-brief`
- Create: `skills/subagent-driven-development/scripts/review-package`

源文件位于 `/tmp/sp-upstream/skills/subagent-driven-development/`（上游 v6.0.2 tag，commit `b62616f`）。

- [ ] **Step 1: 复制 task-reviewer-prompt.md**

```bash
cp /tmp/sp-upstream/skills/subagent-driven-development/task-reviewer-prompt.md \
   skills/subagent-driven-development/task-reviewer-prompt.md
```

- [ ] **Step 2: 创建 scripts 目录并复制两个脚本**

```bash
mkdir -p skills/subagent-driven-development/scripts
cp /tmp/sp-upstream/skills/subagent-driven-development/scripts/task-brief \
   skills/subagent-driven-development/scripts/task-brief
cp /tmp/sp-upstream/skills/subagent-driven-development/scripts/review-package \
   skills/subagent-driven-development/scripts/review-package
chmod +x skills/subagent-driven-development/scripts/task-brief \
        skills/subagent-driven-development/scripts/review-package
```

- [ ] **Step 3: 验证文件存在且可执行**

Run:
```bash
ls -la skills/subagent-driven-development/task-reviewer-prompt.md \
       skills/subagent-driven-development/scripts/task-brief \
       skills/subagent-driven-development/scripts/review-package
```
Expected: 三个文件都存在，两个脚本有 `x` 权限位。

- [ ] **Step 4: 冒烟测试 task-brief 脚本**

Run:
```bash
# 用本 plan 文件测试 task-brief 能否提取 Task 1
skills/subagent-driven-development/scripts/task-brief \
  docs/superpowers/plans/2026-06-18-upstream-v6-sync.md 1 /tmp/test-brief.md
head -5 /tmp/test-brief.md
```
Expected: 输出 `wrote /tmp/test-brief.md: N lines`，前 5 行包含 `Task 1: 新增 SDD 审查重写核心文件`。

- [ ] **Step 5: 冒烟测试 review-package 脚本**

Run:
```bash
# 用当前 HEAD 和 HEAD~1 测试 review-package
skills/subagent-driven-development/scripts/review-package HEAD~1 HEAD /tmp/test-review.diff
head -3 /tmp/test-review.diff
```
Expected: 输出 `wrote /tmp/test-review.diff: 1 commit(s), N bytes`，前 3 行包含 `# Review package:`。

- [ ] **Step 6: Commit**

```bash
git add skills/subagent-driven-development/task-reviewer-prompt.md \
        skills/subagent-driven-development/scripts/
git commit -m "feat(sdd): 同步上游 v6.0 SDD 审查重写核心文件

- 新增 task-reviewer-prompt.md（单 reviewer 双 verdict 模板）
- 新增 scripts/task-brief（任务文本提取到文件）
- 新增 scripts/review-package（review diff 包生成）

来源：obra/superpowers v6.0.2 (b62616f)"
```

---

## Task 2: 新增 Codex hooks 文件（D3, D4）

**Files:**
- Create: `hooks/session-start-codex`
- Create: `hooks/hooks-codex.json`

- [ ] **Step 1: 复制 session-start-codex**

```bash
cp /tmp/sp-upstream/hooks/session-start-codex hooks/session-start-codex
chmod +x hooks/session-start-codex
```

- [ ] **Step 2: 复制 hooks-codex.json**

```bash
cp /tmp/sp-upstream/hooks/hooks-codex.json hooks/hooks-codex.json
```

- [ ] **Step 3: 验证文件存在且 JSON 合法**

Run:
```bash
ls -la hooks/session-start-codex hooks/hooks-codex.json
python3 -m json.tool hooks/hooks-codex.json > /dev/null && echo "JSON OK"
```
Expected: 两个文件存在，session-start-codex 有 `x` 权限，输出 `JSON OK`。

- [ ] **Step 4: Commit**

```bash
git add hooks/session-start-codex hooks/hooks-codex.json
git commit -m "feat(hooks): 同步上游 v5.1 Codex SessionStart 拆分

- 新增 session-start-codex（Codex 专用 SessionStart hook）
- 新增 hooks-codex.json（Codex hooks 配置，走 run-hook.cmd 路由）

来源：obra/superpowers v6.0.2 (b62616f)"
```

---

## Task 3: 删除旧 SDD reviewer 文件并清理引用（A4, A5）

**Files:**
- Delete: `skills/subagent-driven-development/spec-reviewer-prompt.md`
- Delete: `skills/subagent-driven-development/code-quality-reviewer-prompt.md`

**注意**：此 Task 只删除文件。SKILL.md 中的引用会在 Task 4 整体重写时清除。删除后到 Task 4 完成前，SKILL.md 会临时引用不存在的文件 —— 这是预期的，因为 Task 3 和 Task 4 必须连续执行。

- [ ] **Step 1: 确认当前引用方**

Run:
```bash
grep -rn "spec-reviewer-prompt\|code-quality-reviewer-prompt" skills/ || echo "no refs"
```
Expected: `skills/subagent-driven-development/SKILL.md` 多处引用（ralph-loop 块、流程图、Prompt Templates 节）。

- [ ] **Step 2: 删除两个旧文件**

```bash
git rm skills/subagent-driven-development/spec-reviewer-prompt.md \
       skills/subagent-driven-development/code-quality-reviewer-prompt.md
```

- [ ] **Step 3: 验证文件已删除**

Run:
```bash
ls skills/subagent-driven-development/spec-reviewer-prompt.md 2>&1
ls skills/subagent-driven-development/code-quality-reviewer-prompt.md 2>&1
```
Expected: 两条 `No such file or directory`。

- [ ] **Step 4: Commit（不 push，立即进入 Task 4）**

```bash
git commit -m "refactor(sdd): 删除旧的双 reviewer prompt 文件

- 删除 spec-reviewer-prompt.md（被 task-reviewer-prompt.md 取代）
- 删除 code-quality-reviewer-prompt.md（同上）

注意：SKILL.md 引用将在下一个 commit 重写清除。

来源：obra/superpowers v6.0.2 (b62616f)"
```

---

## Task 4: 手动 merge SDD SKILL.md（A6）— 最复杂

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md`（整体重写）

**Merge 策略**：以上游 v6.0 SKILL.md 为基底，保留 fork 的 ralph-loop frontmatter（`argument-hint`、`when_to_use`）和顶部 ralph-loop ```! 代码块作为「Orchestrator 编排模式」一节。上游的 reviewer 调用流程、Model Selection、Handling Reviewer、File Handoffs、Durable Progress、Red Flags 全部采纳。

**关键不变量**：
1. reviewer 调用必须指向 `task-reviewer-prompt.md`（不再是两个旧 prompt）
2. ralph-loop 代码块中的 `SPEC REVIEWER` / `CODE QUALITY REVIEWER` 字样要改为统一的 `TASK REVIEWER`（走 task-reviewer-prompt.md）
3. 每次 dispatch 必须声明 model（上游 v6.0 硬性要求）
4. 不得压制 finding（上游 v6.0 硬性要求，ralph-loop 也不能违反）

- [ ] **Step 1: 以 upstream v6.0 SKILL.md 为基底**

```bash
cp /tmp/sp-upstream/skills/subagent-driven-development/SKILL.md \
   skills/subagent-driven-development/SKILL.md
```

- [ ] **Step 2: 保留 fork 的 frontmatter**

用 Edit 把开头 4 行：

```
---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---
```

替换为：

```
---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
argument-hint: "任务描述或Plan路径"
when_to_use: "[feedforward, feedback] Triggered when dispatching subagents for plan execution with review gates."
---
```

- [ ] **Step 3: 在 frontmatter 之后、第一个 `# Subagent-Driven Development` 之前插入 ralph-loop 编排块**

用 Edit 在 `---\n\n# Subagent-Driven Development` 之间插入下面整块（从 fork 原 SKILL.md 第 10-40 行的 ```! 块复制，但把 `SPEC REVIEWER` 和 `CODE QUALITY REVIEWER` 改为统一的 `TASK REVIEWER`）：

````
```!
"${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh" \
  "Task: $ARGUMENTS

You are the ORCHESTRATOR. Your job is to coordinate subagents, NOT implement code yourself.

=== ORCHESTRATOR WORKFLOW (per iteration) ===
1. Read the plan/task, extract pending tasks
2. For the NEXT pending task:
   a. Run scripts/task-brief to extract task text to a file
   b. Dispatch IMPLEMENTER subagent (use ./implementer-prompt.md template, with brief file path)
   c. If implementer asks questions, answer them and re-dispatch
   d. When implementer reports DONE, run scripts/review-package BASE HEAD to generate diff file
   e. Dispatch TASK REVIEWER subagent (./task-reviewer-prompt.md) with brief file + report file + review package
   f. If review fails, have implementer fix and re-review
   g. When review passes, mark task complete in progress ledger
3. Move to next task

=== MANDATORY Rules (DO NOT SKIP) ===
1. You are COORDINATOR ONLY - never write implementation code yourself
2. Each task requires TWO subagents: implementer → task reviewer (spec + quality in one pass)
3. Subagents must follow superpowers:test-driven-development (TDD)
4. Every dispatch MUST state its model explicitly (see SKILL.md Model Selection)
5. Do NOT skip any review stage
6. Do NOT proceed if any review has open Critical/Important issues
7. Do NOT tell the reviewer what to ignore or pre-rate severity
8. When ALL tasks complete, dispatch FINAL CODE REVIEWER for entire implementation
9. After final review, you MUST run superpowers:finishing-a-development-branch
10. ONLY after finishing-a-development-branch is executed, emit the completion signal exactly once (do not quote or mention it earlier).
" \
  --completion-promise "COMPLETE" \
  --max-iterations 60
```
````

- [ ] **Step 4: 验证流程图引用的是 task-reviewer-prompt.md**

Run:
```bash
grep -n "reviewer-prompt\|task-reviewer" skills/subagent-driven-development/SKILL.md
```
Expected: 所有引用都是 `./task-reviewer-prompt.md`，无 `spec-reviewer-prompt` 或 `code-quality-reviewer-prompt`。

- [ ] **Step 5: 验证 ralph-loop 关键不变量**

Run:
```bash
# ralph-loop 保留
grep -c "setup-ralph-loop" skills/subagent-driven-development/SKILL.md
# 不压制 finding
grep -c "Do NOT tell the reviewer what to ignore" skills/subagent-driven-development/SKILL.md
# model 声明
grep -c "MUST state its model explicitly" skills/subagent-driven-development/SKILL.md
```
Expected: 三条都返回 `1` 或更大。

- [ ] **Step 6: 验证旧 reviewer 文件零引用**

Run:
```bash
grep -rn "spec-reviewer-prompt\|code-quality-reviewer-prompt" skills/ || echo "CLEAN"
```
Expected: 输出 `CLEAN`。

- [ ] **Step 7: Commit**

```bash
git add skills/subagent-driven-development/SKILL.md
git commit -m "refactor(sdd): 手动 merge SKILL.md — v6.0 审查重写 + 保留 ralph-loop

以上游 v6.0.2 SKILL.md 为基底，保留 fork 的 ralph-loop 编排模式：
- frontmatter 保留 argument-hint + when_to_use
- 顶部保留 ralph-loop \`\`\`! 代码块，但 reviewer 调用改为统一的 task-reviewer-prompt.md
- 接入 v6.0 的 pre-flight plan review、model selection 硬性要求、
  file handoffs（task-brief / review-package）、durable progress ledger
- 接入 v6.0 的 reviewer 只读 + 禁止 controller 压制 finding 规则

不变量验证：
- reviewer 调用全部指向 task-reviewer-prompt.md
- 每次 dispatch 必须声明 model
- controller 不得压制 finding（ralph-loop 也不例外）

来源：obra/superpowers v6.0.2 (b62616f)"
```

---

## Task 5: 手动 merge implementer-prompt.md（A7）

**Files:**
- Modify: `skills/subagent-driven-development/implementer-prompt.md`

**Merge 策略**：直接采纳上游 v6.0 版本（fork 原版本只是少了 model 声明、brief/report 文件、TDD 证据等增量）。上游的 `[BRIEF_FILE]` / `[REPORT_FILE]` 占位符与 Task 4 的 SKILL.md 流程一致。

- [ ] **Step 1: 用上游 v6.0 版本覆盖**

```bash
cp /tmp/sp-upstream/skills/subagent-driven-development/implementer-prompt.md \
   skills/subagent-driven-development/implementer-prompt.md
```

- [ ] **Step 2: 验证关键新增内容存在**

Run:
```bash
# model 声明要求
grep -c "MODEL — REQUIRED" skills/subagent-driven-development/implementer-prompt.md
# report-to-file
grep -c "REPORT_FILE" skills/subagent-driven-development/implementer-prompt.md
# TDD 证据
grep -c "TDD Evidence" skills/subagent-driven-development/implementer-prompt.md
# task brief 引用
grep -c "BRIEF_FILE" skills/subagent-driven-development/implementer-prompt.md
```
Expected: 四条都返回 `1` 或更大。

- [ ] **Step 3: Commit**

```bash
git add skills/subagent-driven-development/implementer-prompt.md
git commit -m "refactor(sdd): 同步 implementer-prompt.md 到 v6.0

- 接入 model 声明要求（MODEL — REQUIRED）
- 接入 BRIEF_FILE / REPORT_FILE 文件交接
- 接入 TDD Evidence（RED/GREEN）报告要求
- 接入 After Review Findings（fix 后重跑测试并追加到 report）

来源：obra/superpowers v6.0.2 (b62616f)"
```

---

## Task 6: 手动 merge hooks-cursor.json（D5）

**Files:**
- Modify: `hooks/hooks-cursor.json`

**Merge 策略**：fork 当前直接调 `./hooks/session-start`；上游 v5.1 改为走 `run-hook.cmd` 路由（修复 Windows 下扩展名脚本被编辑器打开的问题）。由于 fork 没有 `run-hook.cmd`，需要先确认上游是否也带了这个文件。

- [ ] **Step 1: 确认上游 run-hook.cmd 是否存在**

Run:
```bash
ls /tmp/sp-upstream/hooks/run-hook.cmd && echo "EXISTS"
```
Expected: 输出 `EXISTS`。

- [ ] **Step 2: 复制 run-hook.cmd（这是 D5 的依赖，未在 spec 中单列，但必须随 D5 引入）**

```bash
cp /tmp/sp-upstream/hooks/run-hook.cmd hooks/run-hook.cmd
chmod +x hooks/run-hook.cmd
```

- [ ] **Step 3: 用上游版本覆盖 hooks-cursor.json**

```bash
cp /tmp/sp-upstream/hooks/hooks-cursor.json hooks/hooks-cursor.json
```

- [ ] **Step 4: 验证 JSON 合法 + 引用 run-hook.cmd**

Run:
```bash
python3 -m json.tool hooks/hooks-cursor.json > /dev/null && echo "JSON OK"
grep -c "run-hook.cmd" hooks/hooks-cursor.json
ls hooks/run-hook.cmd
```
Expected: `JSON OK`、`1`、文件存在。

- [ ] **Step 5: Commit**

```bash
git add hooks/run-hook.cmd hooks/hooks-cursor.json
git commit -m "fix(hooks): 同步上游 v5.1 Cursor Windows SessionStart 路由

- 引入 run-hook.cmd（Windows 下扩展名脚本路由器）
- hooks-cursor.json 改为走 run-hook.cmd session-start
  （修复 Windows 直接打开文件而非执行的问题 + 去 BOM）

来源：obra/superpowers v6.0.2 (b62616f)"
```

---

## Task 7: 手动 merge hooks.json（D6）

**Files:**
- Modify: `hooks/hooks.json`

**Merge 策略**：fork 的 hooks.json 有两块 fork 专属内容必须保留：(1) SessionStart 第一条 hook 注入 `CLAUDE_SESSION_ID`；(2) Stop hook 调用 `stop-hook.sh`。同时把 SessionStart 第二条 hook 改为走 `run-hook.cmd`（与 D5 对齐）。

- [ ] **Step 1: 用 Edit 改第二条 SessionStart 的 command**

把：
```json
          "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
```
（上游 v6.0 已经是这个格式 —— fork 当前也是这个，无需改）

实际上 fork 当前的 hooks.json 第二条 SessionStart 已经是 `run-hook.cmd session-start` 格式（见读取结果第 18-19 行）。所以本 Task 的「merge」其实是：**保留 fork 版本不变**，但确认它与 D5 引入的 run-hook.cmd 兼容。

- [ ] **Step 2: 验证 fork hooks.json 与新 run-hook.cmd 兼容**

Run:
```bash
python3 -m json.tool hooks/hooks.json > /dev/null && echo "JSON OK"
# 验证 Stop hook 保留
grep -c "stop-hook.sh" hooks/hooks.json
# 验证 CLAUDE_SESSION_ID 注入保留
grep -c "CLAUDE_SESSION_ID" hooks/hooks.json
# 验证走 run-hook.cmd
grep -c "run-hook.cmd" hooks/hooks.json
```
Expected: `JSON OK`、`1`、`1`、`1` 或更大。

- [ ] **Step 3: 确认无需改动，直接验证**

如果 Step 2 全部通过，本 Task 无需文件改动，跳过 commit。`hooks/hooks.json` 保持 fork 现状即可（它已经走 `run-hook.cmd`，且保留了 Stop hook 和 SESSION_ID 注入）。

- [ ] **Step 4: 记录决定（无 commit，进入 Task 8）**

在 progress ledger 记录：`Task 7: hooks.json 验证通过，fork 版本已兼容 run-hook.cmd，无需改动`。

---

## Task 8: 手动 merge session-start（D2）

**Files:**
- Modify: `hooks/session-start`

**Merge 策略**：fork 的 session-start 76 行，包含三块 fork 专属逻辑必须保留：(1) legacy skills 目录警告；(2) `.superpowers/learnings.jsonl` 注入；(3) Cursor/Claude Code/Copilot 三平台分支输出。上游 v5.1 把 Codex 分支拆到了独立的 `session-start-codex`（Task 2 已新增），所以主 session-start **不需要** 再处理 Codex。

**结论**：fork 当前的 session-start 已经只处理 Cursor / Claude Code / Copilot 三平台（Codex 逻辑本来就不在 fork 这份里）。上游 v5.1 的「拆分」对 fork 而言已经是现状。**无需改动**。

- [ ] **Step 1: 验证 fork session-start 不含 Codex 专用逻辑**

Run:
```bash
# 不应有 Codex 专用输出（应该只有 Cursor/Claude Code/Copilot 三分支）
grep -c "session-start-codex\|Codex" hooks/session-start || echo "0 (good)"
# 应保留 learnings 注入
grep -c "learnings" hooks/session-start
# 应保留 legacy skills 警告
grep -c "legacy_skills_dir" hooks/session-start
```
Expected: `0 (good)`、`1` 或更大、`1` 或更大。

- [ ] **Step 2: 验证 escape_for_json 函数与上游一致**

Run:
```bash
diff <(sed -n '/^escape_for_json/,/^}/p' hooks/session-start) \
     <(sed -n '/^escape_for_json/,/^}/p' /tmp/sp-upstream/hooks/session-start) \
  && echo "SAME" || echo "DIFFER"
```
Expected: `SAME`（escape 函数两边一致）。

- [ ] **Step 3: 验证 printf 末尾的 cat 管道**

fork 在三个 printf 末尾**没有** `| cat`，上游 v6.0.2 **有**（修复 printf 在某些 shell 下 SIGPIPE 问题）。这是有价值的 bug 修复。

用 Edit 把三处 printf 末尾加上 `| cat`：

第一处（Cursor 分支）：
- old: `printf '{\n  "additional_context": "%s"\n}\n' "$session_context"`
- new: `printf '{\n  "additional_context": "%s"\n}\n' "$session_context" | cat`

第二处（Claude Code 分支）：
- old: `printf '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' "$session_context"`
- new: 同上 + ` | cat`

第三处（Copilot 分支）：
- old: `printf '{\n  "additionalContext": "%s"\n}\n' "$session_context"`
- new: 同上 + ` | cat`

- [ ] **Step 4: 验证语法**

Run:
```bash
bash -n hooks/session-start && echo "SYNTAX OK"
grep -c "| cat" hooks/session-start
```
Expected: `SYNTAX OK`、`3`。

- [ ] **Step 5: Commit**

```bash
git add hooks/session-start
git commit -m "fix(hooks): session-start 三处 printf 加 | cat 防 SIGPIPE

同步上游 v6.0.2 的 bug 修复：某些 shell 下 printf 触发 SIGPIPE，
导致 SessionStart 输出截断。三处分支（Cursor/Claude Code/Copilot）
统一加 | cat。

其余 fork 专属逻辑（learnings 注入、legacy skills 警告）保留不动。

来源：obra/superpowers v6.0.2 (b62616f)"
```

---

## Task 9: 处理 scripts/bump-version.sh（D1）

**Files:**
- Evaluate: `scripts/bump-version.sh`

**Merge 策略**：fork 的 bump-version.sh 增量是**有意的** fork 专属功能：中文交互式 changelog 输入 + 自动更新 `RELEASE-NOTES.md`。上游版本没有这些。fork 的增量是有意改动，**不采纳上游版本**。

- [ ] **Step 1: 确认 fork 增量**

Run:
```bash
# fork 专属：中文交互式 changelog
grep -c "请输入本次更新的内容" scripts/bump-version.sh
# fork 专属：RELEASE-NOTES.md 自动更新
grep -c "RELEASE_NOTES\|RELEASE-NOTES" scripts/bump-version.sh
```
Expected: `1` 或更大、`1` 或更大。

- [ ] **Step 2: 决定 — 不改动**

fork 的 bump-version.sh 增量是有意的，无需同步上游。跳过 commit，在 progress ledger 记录：`Task 9: bump-version.sh fork 专属 changelog 逻辑，不采纳上游`。

---

## Task 10: 全局回归验证

**Files:**
- None（只读检查）

- [ ] **Step 1: 旧 reviewer 零引用**

Run:
```bash
grep -rn "spec-reviewer-prompt\|code-quality-reviewer-prompt" skills/ hooks/ scripts/ && echo "FAIL: 残留引用" || echo "PASS"
```
Expected: `PASS`。

- [ ] **Step 2: 新文件全部就位**

Run:
```bash
for f in \
  skills/subagent-driven-development/task-reviewer-prompt.md \
  skills/subagent-driven-development/scripts/task-brief \
  skills/subagent-driven-development/scripts/review-package \
  hooks/session-start-codex \
  hooks/hooks-codex.json \
  hooks/run-hook.cmd; do
  [ -f "$f" ] && echo "OK $f" || echo "MISSING $f"
done
```
Expected: 全部 `OK`。

- [ ] **Step 3: 三个 hooks JSON 合法**

Run:
```bash
for f in hooks/hooks.json hooks/hooks-cursor.json hooks/hooks-codex.json; do
  python3 -m json.tool "$f" > /dev/null && echo "OK $f" || echo "BAD $f"
done
```
Expected: 全部 `OK`。

- [ ] **Step 4: SDD SKILL.md 不变量**

Run:
```bash
# ralph-loop 保留
grep -q "setup-ralph-loop" skills/subagent-driven-development/SKILL.md && echo "ralph-loop OK"
# reviewer 走 task-reviewer-prompt.md
grep -q "task-reviewer-prompt.md" skills/subagent-driven-development/SKILL.md && echo "reviewer ref OK"
# model 声明
grep -q "state its model explicitly\|MODEL — REQUIRED" skills/subagent-driven-development/SKILL.md && echo "model OK"
# 不压制 finding
grep -q "Do NOT tell the reviewer what to ignore" skills/subagent-driven-development/SKILL.md && echo "no-suppress OK"
```
Expected: 四条 `OK`。

- [ ] **Step 5: session-start 三处 | cat**

Run:
```bash
grep -c "| cat" hooks/session-start
```
Expected: `3`。

- [ ] **Step 6: fork 专属功能保留**

Run:
```bash
# learnings 注入
grep -q "learnings" hooks/session-start && echo "learnings OK"
# Stop hook
grep -q "stop-hook.sh" hooks/hooks.json && echo "stop-hook OK"
# bump-version 中文 changelog
grep -q "请输入本次更新的内容" scripts/bump-version.sh && echo "changelog OK"
```
Expected: 三条 `OK`。

- [ ] **Step 7: shell 语法检查所有改动脚本**

Run:
```bash
for f in hooks/session-start hooks/session-start-codex hooks/run-hook.cmd \
         skills/subagent-driven-development/scripts/task-brief \
         skills/subagent-driven-development/scripts/review-package; do
  bash -n "$f" 2>&1 && echo "OK $f" || echo "BAD $f"
done
```
Expected: 全部 `OK`。

- [ ] **Step 8: 查看 commit 历史**

Run:
```bash
git log --oneline feat/harness..HEAD
```
Expected: 看到 6 个左右 commit（Task 1/2/3/4/5/6/8 各一个，Task 7/9 无 commit）。

---

## Self-Review Notes

**Spec coverage 检查**：
- A1 ✅ Task 1
- A2 ✅ Task 1
- A3 ✅ Task 1
- A4 ✅ Task 3
- A5 ✅ Task 3
- A6 ✅ Task 4
- A7 ✅ Task 5
- D1 ✅ Task 9（决定不采纳）
- D2 ✅ Task 8
- D3 ✅ Task 2
- D4 ✅ Task 2
- D5 ✅ Task 6
- D6 ✅ Task 7（决定不改动）

**额外发现（写入 plan，非 spec 漏项）**：
- D5 引入 `run-hook.cmd` 依赖，已补充到 Task 6 Step 2
- D6 验证后决定不动，已写入 Task 7
- D2 实际只需加 `| cat`（fork 已无 Codex 逻辑），已写入 Task 8

**类型/路径一致性**：所有 `task-reviewer-prompt.md`、`scripts/task-brief`、`scripts/review-package`、`run-hook.cmd`、`session-start-codex` 引用在 SKILL.md / hooks JSON / prompt 模板间保持一致。
