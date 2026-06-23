# Skill 行为测试套件 — 第 3 批：执行层-实现 + 执行层-审查（7 个 skill）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 7 个 skill 补 headless 行为测试：subagent-driven-development、executing-plans、dispatching-parallel-agents、test-driven-development（执行层-实现 4 个）+ requesting-code-review、receiving-code-review、verification-before-completion（执行层-审查 3 个）。

**Architecture:** 复用第 1 批 helpers。subagent-driven-development 与现有 `tests/claude-code/test-subagent-driven-development.sh`（深度 10 点测试）互补，本批只做轻量触发 + task-brief 关键词断言。test-driven-development 是核心闭环 skill，补 explicit prompt。

**Tech Stack:** bash + stream-json + grep。

**Spec:** `docs/superpowers/specs/2026-06-23-test-coverage-expansion-design.md`
**Depends on:** 第 1 批 plan `2026-06-23-skill-behavior-helpers.md` 已完成

---

## 断言矩阵

| Skill | naive prompt 关键词 | 触发断言 | 行为断言（关键词） |
|---|---|---|---|
| subagent-driven-development | "execute this plan", "implement these tasks" | ✓ | task-brief/implementer/reviewer/任务/子代理 |
| executing-plans | "execute this plan with checkpoints" | ✓ | batch/checkpoint/task/批次/检查点/任务 |
| dispatching-parallel-agents | "these 3 independent tasks in parallel" | ✓ | parallel/concurrent/subagent/并行/并发 |
| test-driven-development | "implement this feature with TDD" | ✓ | red/green/refactor/fail/pass/红/绿/失败/通过 |
| requesting-code-review | "review my completed work before merge" | ✓ | review/plan/issue/审查/计划/问题 |
| receiving-code-review | "I received code review feedback, how to respond" | ✓ | verify/technical rigor/blindly/验证/技术严谨 |
| verification-before-completion | "verify my work is complete before committing" | ✓ | evidence/verify/run/claim/证据/验证/运行 |

---

## Task 1: subagent-driven-development

**Files:**
- Create: `tests/skill-behavior/subagent-driven-development/prompts/naive-execute-plan.txt`
- Create: `tests/skill-behavior/subagent-driven-development/run-test.sh`

> **注意**：本测试只验证"触发 + task-brief 提及"，不重复 `tests/claude-code/test-subagent-driven-development.sh` 的 10 点深度测试。prompt 需要提供一份假 plan 文件。

- [ ] **Step 1: 写 prompt（引用假 plan）**

`prompts/naive-execute-plan.txt`:
```
I have a plan file at /tmp/skill-behavior-fake-plan.md that needs to be implemented. Execute this plan using the subagent-driven development workflow with fresh implementer and reviewer subagents per task.
```

- [ ] **Step 2: 写 run-test.sh（含创建假 plan）**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

# 准备一份假 plan，让 prompt 引用的路径真实存在
cat > /tmp/skill-behavior-fake-plan.md <<'PLAN'
# Fake Plan for Skill Behavior Test

## Task 1: Add hello function
Create src/hello.js that exports a function returning "Hello, World!".

## Task 2: Add goodbye function
Create src/goodbye.js that exports a function returning "Goodbye!".
PLAN

echo "=== Test: subagent-driven-development ==="
echo ""
run_skill "subagent-driven-development" "$SCRIPT_DIR/prompts/naive-execute-plan.txt" 3
assert_skill_triggered "subagent-driven-development"
assert_no_premature_action
assert_output_contains "task-brief\|implementer\|reviewer\|子代理\|任务\|dispatch" "mentions SDD workflow concepts"
print_skill_summary "subagent-driven-development"

rm -f /tmp/skill-behavior-fake-plan.md
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/subagent-driven-development/run-test.sh`
Expected: 触发 PASS + 行为断言 PASS

> **排查提示**：description 是 "Use when executing implementation plans with independent tasks"。若未触发，prompt 里强化 "independent tasks" 和 "implement this plan"。

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/subagent-driven-development/
git commit -m "test(skill-behavior): 添加 subagent-driven-development 行为测试"
```

---

## Task 2: executing-plans

**Files:**
- Create: `tests/skill-behavior/executing-plans/prompts/naive-execute-batched.txt`
- Create: `tests/skill-behavior/executing-plans/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-execute-batched.txt`:
```
I have a written implementation plan. Execute it iteratively in the current session with review checkpoints every few tasks, rather than dispatching subagents.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: executing-plans ==="
echo ""
run_skill "executing-plans" "$SCRIPT_DIR/prompts/naive-execute-batched.txt" 3
assert_skill_triggered "executing-plans"
assert_no_premature_action
assert_output_contains "batch\|checkpoint\|review\|task\|批次\|检查点\|审查\|任务" "mentions batch execution concepts"
print_skill_summary "executing-plans"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/executing-plans/run-test.sh`
Expected: 全 PASS

> **排查提示**：与 subagent-driven-development 易混淆。description 强调 "execute iteratively in the current session with review checkpoints"，prompt 已包含 "review checkpoints"。

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/executing-plans/
git commit -m "test(skill-behavior): 添加 executing-plans 行为测试"
```

---

## Task 3: dispatching-parallel-agents

**Files:**
- Create: `tests/skill-behavior/dispatching-parallel-agents/prompts/naive-parallel-tasks.txt`
- Create: `tests/skill-behavior/dispatching-parallel-agents/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-parallel-tasks.txt`:
```
I have 3 independent tasks that can run in parallel: refactor module A, update docs for module B, and add tests for module C. There's no shared state between them. Dispatch them as parallel subagents.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: dispatching-parallel-agents ==="
echo ""
run_skill "dispatching-parallel-agents" "$SCRIPT_DIR/prompts/naive-parallel-tasks.txt" 3
assert_skill_triggered "dispatching-parallel-agents"
assert_no_premature_action
assert_output_contains "parallel\|concurrent\|subagent\|independent\|并行\|并发\|子代理\|独立" "mentions parallel dispatch concepts"
print_skill_summary "dispatching-parallel-agents"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/dispatching-parallel-agents/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/dispatching-parallel-agents/
git commit -m "test(skill-behavior): 添加 dispatching-parallel-agents 行为测试"
```

---

## Task 4: test-driven-development（含 explicit prompt）

**Files:**
- Create: `tests/skill-behavior/test-driven-development/prompts/naive-tdd.txt`
- Create: `tests/skill-behavior/test-driven-development/prompts/explicit-invoke.txt`
- Create: `tests/skill-behavior/test-driven-development/run-test.sh`

- [ ] **Step 1: 写 naive prompt**

`prompts/naive-tdd.txt`:
```
I need to implement a new feature: a rate limiter for my API. I want to use proper test-driven development — write failing tests first, then minimal code to pass.
```

- [ ] **Step 2: 写 explicit prompt**

`prompts/explicit-invoke.txt`:
```
/superpowers:test-driven-development Implement a stack data structure with push, pop, and peek methods.
```

- [ ] **Step 3: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: test-driven-development (naive) ==="
echo ""
run_skill "test-driven-development" "$SCRIPT_DIR/prompts/naive-tdd.txt" 3
assert_skill_triggered "test-driven-development"
assert_no_premature_action
assert_output_contains "red\|green\|refactor\|fail\|pass\|failing\|红\|绿\|失败\|通过\|重构" "mentions TDD cycle"
print_skill_summary "test-driven-development (naive)"

SKILL_PASS_COUNT=0
SKILL_FAIL_COUNT=0

echo ""
echo "=== Test: test-driven-development (explicit) ==="
echo ""
run_skill "test-driven-development" "$SCRIPT_DIR/prompts/explicit-invoke.txt" 3
assert_skill_triggered "test-driven-development"
assert_no_premature_action
print_skill_summary "test-driven-development (explicit)"
```

- [ ] **Step 4: 运行验证**

Run: `bash tests/skill-behavior/test-driven-development/run-test.sh`
Expected: 两个场景全 PASS

- [ ] **Step 5: Commit**

```bash
git add tests/skill-behavior/test-driven-development/
git commit -m "test(skill-behavior): 添加 test-driven-development 行为测试（含 explicit）"
```

---

## Task 5: requesting-code-review

**Files:**
- Create: `tests/skill-behavior/requesting-code-review/prompts/naive-request-review.txt`
- Create: `tests/skill-behavior/requesting-code-review/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-request-review.txt`:
```
I've finished implementing the user authentication feature. Before merging, I want to verify the work meets the requirements and get a code review against the original plan.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: requesting-code-review ==="
echo ""
run_skill "requesting-code-review" "$SCRIPT_DIR/prompts/naive-request-review.txt" 3
assert_skill_triggered "requesting-code-review"
assert_no_premature_action
assert_output_contains "review\|plan\|issue\|severity\|审查\|计划\|问题\|严重" "mentions review dimensions"
print_skill_summary "requesting-code-review"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/requesting-code-review/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/requesting-code-review/
git commit -m "test(skill-behavior): 添加 requesting-code-review 行为测试"
```

---

## Task 6: receiving-code-review

**Files:**
- Create: `tests/skill-behavior/receiving-code-review/prompts/naive-receive-feedback.txt`
- Create: `tests/skill-behavior/receiving-code-review/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-receive-feedback.txt`:
```
I just received code review feedback on my PR. The reviewer suggested some changes that seem technically questionable. How should I respond — verify rigorously rather than blindly implement?
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: receiving-code-review ==="
echo ""
run_skill "receiving-code-review" "$SCRIPT_DIR/prompts/naive-receive-feedback.txt" 3
assert_skill_triggered "receiving-code-review"
assert_no_premature_action
assert_output_contains "verify\|technical\|rigor\|blindly\|question\|验证\|技术\|严谨\|盲从\|质疑" "mentions rigorous response"
print_skill_summary "receiving-code-review"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/receiving-code-review/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/receiving-code-review/
git commit -m "test(skill-behavior): 添加 receiving-code-review 行为测试"
```

---

## Task 7: verification-before-completion

**Files:**
- Create: `tests/skill-behavior/verification-before-completion/prompts/naive-verify-complete.txt`
- Create: `tests/skill-behavior/verification-before-completion/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-verify-complete.txt`:
```
I'm about to claim my bugfix is complete and commit. But before I do that, I want to actually run the verification commands and confirm the output rather than just asserting it works.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: verification-before-completion ==="
echo ""
run_skill "verification-before-completion" "$SCRIPT_DIR/prompts/naive-verify-complete.txt" 3
assert_skill_triggered "verification-before-completion"
assert_no_premature_action
assert_output_contains "evidence\|verify\|run\|claim\|command\|证据\|验证\|运行\|声明\|命令" "mentions evidence-first"
print_skill_summary "verification-before-completion"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/verification-before-completion/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/verification-before-completion/
git commit -m "test(skill-behavior): 添加 verification-before-completion 行为测试"
```

---

## Task 8: 批量验证

- [ ] **Step 1: 顺序运行 7 个 skill**

```bash
for skill in subagent-driven-development executing-plans dispatching-parallel-agents test-driven-development requesting-code-review receiving-code-review verification-before-completion; do
    echo "########## $skill ##########"
    bash "tests/skill-behavior/$skill/run-test.sh" 2>&1 | tail -10
    echo ""
done
```

Expected: 每个 skill `STATUS: PASSED`

- [ ] **Step 2: 失败排查同第 2 批 Task 8 的清单**

---

## Self-Review 检查

**1. Spec coverage**：执行层-实现 4 + 执行层-审查 3 = 7 个 ✓

**2. Placeholder 扫描**：每个 task 完整 prompt + run-test.sh ✓

**3. Type consistency**：所有 run-test.sh 共用 helper 模式；explicit 场景（test-driven-development）重置计数器 ✓

**4. Contract DoD 进度**：
- 第 1 批：1 个（using-superpowers）
- 第 2 批：7 个（决策+设计）
- 本批：7 个（实现+审查）
- 累计：15/28
- 剩余 13 个在第 4 批

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-skill-behavior-batch3-implementation-review.md`.
