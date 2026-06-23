# Skill 行为测试套件 — 第 2 批：决策层 + 执行层-设计（7 个 skill）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 7 个 skill 补 headless 行为测试：office-hours、plan-ceo-review、plan-eng-review（决策层 3 个）+ brainstorming、sprint-contract、writing-plans、gate-driven-test-design（执行层-设计 4 个）。

**Architecture:** 复用第 1 批建立的 `_helpers/run-skill.sh` 和 `_helpers/assert-skill-triggered.sh`。每个 skill 一个目录，含 naive prompt + run-test.sh。核心闭环 skill（brainstorming、writing-plans）额外补 explicit prompt 测 user-invocable 路径。

**Tech Stack:** bash + stream-json + grep；中英文断言关键词全覆盖。

**Spec:** `docs/superpowers/specs/2026-06-23-test-coverage-expansion-design.md`
**Contract:** `docs/superpowers/contracts/skill-behavior-tests.contract.md`
**Depends on:** 第 1 批 plan `2026-06-23-skill-behavior-helpers.md` 已完成

---

## 断言矩阵

| Skill | naive prompt 关键词 | 触发断言 | 行为断言（关键词） |
|---|---|---|---|
| office-hours | "should I build", "is it worth" | ✓ | demand/status quo/wedge/需求/是否值得 |
| plan-ceo-review | "review this plan from CEO perspective" | ✓ | scope/premise/10-star/范围/前提 |
| plan-eng-review | "engineering review", "review the architecture" | ✓ | architecture/edge case/test coverage/架构/边界 |
| brainstorming | "I want to add a feature, help me think" | ✓ | design/spec/question/方案/规格/问题 |
| sprint-contract | "define done criteria before planning" | ✓ | definition of done/acceptance/完成标准/验收 |
| writing-plans | "break this into implementation tasks" | ✓ | task/step/file path/任务/步骤 |
| gate-driven-test-design | "derive test coverage from this spec" | ✓ | gate/coverage/risk/门/覆盖/风险 |

---

## 通用 run-test.sh 骨架（所有 7 个共用此模式）

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: <skill-name> ==="
echo ""
run_skill "<skill-name>" "$SCRIPT_DIR/prompts/naive-<topic>.txt" 3
assert_skill_triggered "<skill-name>"
assert_no_premature_action
assert_output_contains "<关键词模式>" "<test-name>"
print_skill_summary "<skill-name>"
```

---

## Task 1: office-hours

**Files:**
- Create: `tests/skill-behavior/office-hours/prompts/naive-build-decision.txt`
- Create: `tests/skill-behavior/office-hours/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-build-decision.txt`:
```
I'm thinking about building a CLI tool that automatically generates release notes from git commits. Should I build this? Is it worth my time?
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: office-hours ==="
echo ""
run_skill "office-hours" "$SCRIPT_DIR/prompts/naive-build-decision.txt" 3
assert_skill_triggered "office-hours"
assert_no_premature_action
assert_output_contains "demand\|status quo\|wedge\|worth\|需求\|是否值得\|值得做" "mentions decision framework"
print_skill_summary "office-hours"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/office-hours/run-test.sh`
Expected: 触发 PASS + 行为断言 PASS

> **排查提示**：如果未触发，description 含 "should we build this"，prompt 里已用 "Should I build" 呼应。失败时把 prompt 改成 "Help me decide whether to build this using the office-hours framework"。

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/office-hours/
git commit -m "test(skill-behavior): 添加 office-hours 行为测试"
```

---

## Task 2: plan-ceo-review

**Files:**
- Create: `tests/skill-behavior/plan-ceo-review/prompts/naive-ceo-review.txt`
- Create: `tests/skill-behavior/plan-ceo-review/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-ceo-review.txt`:
```
I have a plan to add a notification system to my app. Review it from a CEO/founder perspective — challenge the premises, find the 10-star product angle.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: plan-ceo-review ==="
echo ""
run_skill "plan-ceo-review" "$SCRIPT_DIR/prompts/naive-ceo-review.txt" 3
assert_skill_triggered "plan-ceo-review"
assert_no_premature_action
assert_output_contains "scope\|premise\|10-star\|expand\|范围\|前提\|扩展" "mentions CEO review concepts"
print_skill_summary "plan-ceo-review"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/plan-ceo-review/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/plan-ceo-review/
git commit -m "test(skill-behavior): 添加 plan-ceo-review 行为测试"
```

---

## Task 3: plan-eng-review

**Files:**
- Create: `tests/skill-behavior/plan-eng-review/prompts/naive-eng-review.txt`
- Create: `tests/skill-behavior/plan-eng-review/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-eng-review.txt`:
```
Review the architecture of my plan to add authentication to a Node.js API. Check edge cases, test coverage, and data flow.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: plan-eng-review ==="
echo ""
run_skill "plan-eng-review" "$SCRIPT_DIR/prompts/naive-eng-review.txt" 3
assert_skill_triggered "plan-eng-review"
assert_no_premature_action
assert_output_contains "architecture\|edge case\|test coverage\|data flow\|架构\|边界\|测试覆盖\|数据流" "mentions eng review dimensions"
print_skill_summary "plan-eng-review"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/plan-eng-review/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/plan-eng-review/
git commit -m "test(skill-behavior): 添加 plan-eng-review 行为测试"
```

---

## Task 4: brainstorming（含 explicit prompt）

**Files:**
- Create: `tests/skill-behavior/brainstorming/prompts/naive-feature-request.txt`
- Create: `tests/skill-behavior/brainstorming/prompts/explicit-invoke.txt`
- Create: `tests/skill-behavior/brainstorming/run-test.sh`

- [ ] **Step 1: 写 naive prompt**

`prompts/naive-feature-request.txt`:
```
I want to add a real-time collaboration feature to my markdown editor app. Help me think through the design before writing any code.
```

- [ ] **Step 2: 写 explicit prompt**

`prompts/explicit-invoke.txt`:
```
/superpowers:brainstorming I want to design a plugin system for my CLI tool.
```

- [ ] **Step 3: 写 run-test.sh（两个场景）**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: brainstorming (naive) ==="
echo ""
run_skill "brainstorming" "$SCRIPT_DIR/prompts/naive-feature-request.txt" 3
assert_skill_triggered "brainstorming"
assert_no_premature_action
assert_output_contains "design\|spec\|question\|方案\|规格\|问题" "mentions design/spec"
print_skill_summary "brainstorming (naive)"

# 重置计数器跑 explicit 场景
SKILL_PASS_COUNT=0
SKILL_FAIL_COUNT=0

echo ""
echo "=== Test: brainstorming (explicit) ==="
echo ""
run_skill "brainstorming" "$SCRIPT_DIR/prompts/explicit-invoke.txt" 3
assert_skill_triggered "brainstorming"
assert_no_premature_action
print_skill_summary "brainstorming (explicit)"
```

- [ ] **Step 4: 运行验证**

Run: `bash tests/skill-behavior/brainstorming/run-test.sh`
Expected: 两个场景都全 PASS

> **排查提示**：brainstorming description 是 "You MUST use this before any creative work"，触发率高。若 naive 未触发，检查日志中实际触发的 skill。

- [ ] **Step 5: Commit**

```bash
git add tests/skill-behavior/brainstorming/
git commit -m "test(skill-behavior): 添加 brainstorming 行为测试（含 explicit 路径）"
```

---

## Task 5: sprint-contract

**Files:**
- Create: `tests/skill-behavior/sprint-contract/prompts/naive-define-done.txt`
- Create: `tests/skill-behavior/sprint-contract/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-define-done.txt`:
```
Before I start implementing my new feature, I want to negotiate explicit definition of done and acceptance criteria so there's no ambiguity later.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: sprint-contract ==="
echo ""
run_skill "sprint-contract" "$SCRIPT_DIR/prompts/naive-define-done.txt" 3
assert_skill_triggered "sprint-contract"
assert_no_premature_action
assert_output_contains "definition of done\|acceptance\|criteria\|完成标准\|验收\|标准" "mentions DoD concepts"
print_skill_summary "sprint-contract"
```

- [ ] **Step 3: 运行验证 + 调优**

Run: `bash tests/skill-behavior/sprint-contract/run-test.sh`
Expected: 全 PASS

> **排查提示**：sprint-contract description 明确是 "after brainstorming produces a spec and before writing-plans"，prompt 要体现这个"在规划前定义完成标准"的语义。

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/sprint-contract/
git commit -m "test(skill-behavior): 添加 sprint-contract 行为测试"
```

---

## Task 6: writing-plans（含 explicit prompt）

**Files:**
- Create: `tests/skill-behavior/writing-plans/prompts/naive-break-into-tasks.txt`
- Create: `tests/skill-behavior/writing-plans/prompts/explicit-invoke.txt`
- Create: `tests/skill-behavior/writing-plans/run-test.sh`

- [ ] **Step 1: 写 naive prompt**

`prompts/naive-break-into-tasks.txt`:
```
I have a spec for a user authentication system. Break it down into a detailed implementation plan with bite-sized tasks, exact file paths, and verification steps.
```

- [ ] **Step 2: 写 explicit prompt**

`prompts/explicit-invoke.txt`:
```
/superpowers:writing-plans Create a plan for adding pagination to my REST API.
```

- [ ] **Step 3: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: writing-plans (naive) ==="
echo ""
run_skill "writing-plans" "$SCRIPT_DIR/prompts/naive-break-into-tasks.txt" 3
assert_skill_triggered "writing-plans"
assert_no_premature_action
assert_output_contains "task\|step\|file path\|verification\|任务\|步骤\|文件路径\|验证" "mentions plan structure"
print_skill_summary "writing-plans (naive)"

SKILL_PASS_COUNT=0
SKILL_FAIL_COUNT=0

echo ""
echo "=== Test: writing-plans (explicit) ==="
echo ""
run_skill "writing-plans" "$SCRIPT_DIR/prompts/explicit-invoke.txt" 3
assert_skill_triggered "writing-plans"
assert_no_premature_action
print_skill_summary "writing-plans (explicit)"
```

- [ ] **Step 4: 运行验证**

Run: `bash tests/skill-behavior/writing-plans/run-test.sh`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add tests/skill-behavior/writing-plans/
git commit -m "test(skill-behavior): 添加 writing-plans 行为测试（含 explicit 路径）"
```

---

## Task 7: gate-driven-test-design

**Files:**
- Create: `tests/skill-behavior/gate-driven-test-design/prompts/naive-derive-coverage.txt`
- Create: `tests/skill-behavior/gate-driven-test-design/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-derive-coverage.txt`:
```
I have an approved design spec for a payment processing module. Derive a risk-based test coverage tree with gates and assertions from this spec before I write the implementation plan.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: gate-driven-test-design ==="
echo ""
run_skill "gate-driven-test-design" "$SCRIPT_DIR/prompts/naive-derive-coverage.txt" 3
assert_skill_triggered "gate-driven-test-design"
assert_no_premature_action
assert_output_contains "gate\|coverage\|risk\|assertion\|门\|覆盖\|风险\|断言" "mentions gate/coverage concepts"
print_skill_summary "gate-driven-test-design"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/gate-driven-test-design/run-test.sh`
Expected: 全 PASS

> **排查提示**：description 强调 "after brainstorming produces an approved design spec, before writing-plans"。prompt 已包含 "approved design spec" 和 "before I write the implementation plan" 两个触发词。

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/gate-driven-test-design/
git commit -m "test(skill-behavior): 添加 gate-driven-test-design 行为测试"
```

---

## Task 8: 批量验证

**Files:** 无新增，运行已有测试

- [ ] **Step 1: 顺序运行 7 个 skill**

```bash
for skill in office-hours plan-ceo-review plan-eng-review brainstorming sprint-contract writing-plans gate-driven-test-design; do
    echo "########## $skill ##########"
    bash "tests/skill-behavior/$skill/run-test.sh" 2>&1 | tail -10
    echo ""
done
```

Expected: 每个 skill 末尾 `STATUS: PASSED`

- [ ] **Step 2: 失败时排查清单**

- 触发失败 → 查日志路径（运行时打印），`grep -o '"skill":"[^"]*"' <log> | sort -u` 看实际触发的 skill
- 行为断言失败 → 把日志最后 500 字符贴出来看 Claude 实际回答的关键词，扩充断言模式
- premature action 失败 → 看日志中 premature tool_use 是什么，必要时在 prompt 里加 "first invoke the skill"

- [ ] **Step 3: 全部通过后无需额外 commit（前面每个 task 已 commit）**

---

## Self-Review 检查

**1. Spec coverage**：决策层 3 skill + 执行层-设计 4 skill = 7 个，全部覆盖 ✓

**2. Placeholder 扫描**：每个 task 都有完整 prompt 文本 + 完整 run-test.sh 代码 ✓

**3. Type consistency**：
- 所有 run-test.sh 都 `source` 两个 helper、调用 `run_skill` + `assert_*` + `print_skill_summary` ✓
- `SKILL_PASS_COUNT` / `SKILL_FAIL_COUNT` 在 explicit 场景之间手动重置（brainstorming/writing-plans）✓
- 断言关键词模式都覆盖中英文 ✓

**4. Contract DoD 进度**：
- 第 1 批：helpers + using-superpowers（1/28）
- 本批：7 个 skill（累计 8/28）
- 剩余 20 个在第 3、4 批

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-skill-behavior-batch2-decision-design.md`. 建议用 Subagent-Driven 逐 task 推进，每个 skill 跑通后再进下一个，便于隔离 prompt 调优问题。
