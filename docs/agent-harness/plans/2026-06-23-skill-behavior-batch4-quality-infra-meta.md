# Skill 行为测试套件 — 第 4 批：质量层 + 基础设施 + 元/Harness（14 个 skill）

> **For agentic workers:** REQUIRED SUB-SKILL: Use agent-harness:subagent-driven-development (recommended) or agent-harness:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为剩余 14 个 skill 补 headless 行为测试，完成 28 skill 全覆盖：
- 质量层 4 个：qa-testing、post-deploy-monitoring、retrospective、trace-analysis
- 基础设施 5 个：session-learnings、loop-detection、systematic-debugging、documentation-sync、finishing-a-development-branch
- 元/Harness 5 个：writing-skills、harness-design、harness-init、harness-optimizer、computational-sensors

**Architecture:** 复用第 1 批 helpers。本批多数 skill 触发场景较具体（如 harness-optimizer 需会话 ID），prompt 要明确触发词。

**Tech Stack:** bash + stream-json + grep。

**Spec:** `docs/agent-harness/specs/2026-06-23-test-coverage-expansion-design.md`
**Depends on:** 第 1 批 plan `2026-06-23-skill-behavior-helpers.md` 已完成

---

## 断言矩阵

| Skill | naive prompt 关键词 | 触发断言 | 行为断言（关键词） |
|---|---|---|---|
| qa-testing | "QA test this web app, find bugs" | ✓ | qa/test/bug/fix/测试/缺陷/修复 |
| post-deploy-monitoring | "monitor deploy", "check production" | ✓ | console/performance/error/监控/控制台/性能 |
| retrospective | "do a retro", "review the week" | ✓ | retro/accomplish/pattern/复盘/回顾/模式 |
| trace-analysis | "recurring failure patterns across sessions" | ✓ | pattern/learnings/trace/分析/模式/轨迹 |
| session-learnings | "capture this non-obvious pattern" | ✓ | learning/capture/pattern/学习/捕获/模式 |
| loop-detection | "stuck editing same file repeatedly" | ✓ | loop/stuck/converge/循环/卡住/收敛 |
| systematic-debugging | "debug this error, find root cause" | ✓ | root cause/phase/debug/hypothesis/根因/调试/假设 |
| documentation-sync | "sync docs after code changes" | ✓ | doc/readme/changelog/sync/文档/同步 |
| finishing-a-development-branch | "implementation complete, decide merge" | ✓ | merge/PR/cleanup/合并/清理/收尾 |
| writing-skills | "create a new skill, edit existing skill" | ✓ | skill/frontmatter/description/SKILL.md/技能 |
| harness-design | "做原型", "hi-fi design", "HTML 演示" | ✓ | design/prototype/html/visual/设计/原型 |
| harness-init | "initialize agent-harness in new project" | ✓ | tech stack/init/setup/react/python/初始化/技术栈 |
| harness-optimizer | "根据会话 ID 复盘并优化 skill" | ✓ | session/analyze/optimize/会话/分析/优化 |
| computational-sensors | "run lint/typecheck before review" | ✓ | lint/typecheck/test/coverage/sensor/检查/覆盖 |

---

## Task 1: qa-testing

**Files:**
- Create: `tests/skill-behavior/qa-testing/prompts/naive-qa-webapp.txt`
- Create: `tests/skill-behavior/qa-testing/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-qa-webapp.txt`:
```
I have a web app running locally. QA test it systematically — find bugs, then iteratively fix them in the source code.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: qa-testing ==="
echo ""
run_skill "qa-testing" "$SCRIPT_DIR/prompts/naive-qa-webapp.txt" 3
assert_skill_triggered "qa-testing"
assert_no_premature_action
assert_output_contains "qa\|test\|bug\|fix\|测试\|缺陷\|修复\|问题" "mentions QA workflow"
print_skill_summary "qa-testing"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/qa-testing/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/qa-testing/
git commit -m "test(skill-behavior): 添加 qa-testing 行为测试"
```

---

## Task 2: post-deploy-monitoring

**Files:**
- Create: `tests/skill-behavior/post-deploy-monitoring/prompts/naive-monitor-deploy.txt`
- Create: `tests/skill-behavior/post-deploy-monitoring/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-monitor-deploy.txt`:
```
I just deployed my app to production. Monitor the deploy — check for console errors, performance regressions, and page failures.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: post-deploy-monitoring ==="
echo ""
run_skill "post-deploy-monitoring" "$SCRIPT_DIR/prompts/naive-monitor-deploy.txt" 3
assert_skill_triggered "post-deploy-monitoring"
assert_no_premature_action
assert_output_contains "console\|performance\|error\|monitor\|canary\|监控\|控制台\|性能\|错误" "mentions monitoring dimensions"
print_skill_summary "post-deploy-monitoring"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/post-deploy-monitoring/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/post-deploy-monitoring/
git commit -m "test(skill-behavior): 添加 post-deploy-monitoring 行为测试"
```

---

## Task 3: retrospective

**Files:**
- Create: `tests/skill-behavior/retrospective/prompts/naive-do-retro.txt`
- Create: `tests/skill-behavior/retrospective/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-do-retro.txt`:
```
Let's do a retro on this week's work. Review what we accomplished and analyze patterns from commits and learnings to improve future work.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: retrospective ==="
echo ""
run_skill "retrospective" "$SCRIPT_DIR/prompts/naive-do-retro.txt" 3
assert_skill_triggered "retrospective"
assert_no_premature_action
assert_output_contains "retro\|accomplish\|pattern\|commit\|learning\|复盘\|回顾\|模式\|提交\|学习" "mentions retro analysis"
print_skill_summary "retrospective"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/retrospective/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/retrospective/
git commit -m "test(skill-behavior): 添加 retrospective 行为测试"
```

---

## Task 4: trace-analysis

**Files:**
- Create: `tests/skill-behavior/trace-analysis/prompts/naive-analyze-patterns.txt`
- Create: `tests/skill-behavior/trace-analysis/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-analyze-patterns.txt`:
```
I want to understand recurring failure patterns across my recent sessions, based on the historical learnings data.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: trace-analysis ==="
echo ""
run_skill "trace-analysis" "$SCRIPT_DIR/prompts/naive-analyze-patterns.txt" 3
assert_skill_triggered "trace-analysis"
assert_no_premature_action
assert_output_contains "pattern\|learnings\|trace\|failure\|session\|模式\|分析\|轨迹\|失败\|会话" "mentions trace analysis"
print_skill_summary "trace-analysis"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/trace-analysis/run-test.sh`
Expected: 全 PASS

> **排查提示**：description 是 "Use during retrospective or when trying to understand recurring failure patterns"。prompt 已含 "recurring failure patterns"。

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/trace-analysis/
git commit -m "test(skill-behavior): 添加 trace-analysis 行为测试"
```

---

## Task 5: session-learnings

**Files:**
- Create: `tests/skill-behavior/session-learnings/prompts/naive-capture-learning.txt`
- Create: `tests/skill-behavior/session-learnings/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-capture-learning.txt`:
```
I just discovered a non-obvious pattern in this codebase: the auth middleware validates JWT twice due to legacy reasons. Capture this as a learning so future sessions don't repeat the same mistake.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: session-learnings ==="
echo ""
run_skill "session-learnings" "$SCRIPT_DIR/prompts/naive-capture-learning.txt" 3
assert_skill_triggered "session-learnings"
assert_no_premature_action
assert_output_contains "learning\|capture\|pattern\|pitfall\|knowledge\|学习\|捕获\|模式\|陷阱\|知识" "mentions learning capture"
print_skill_summary "session-learnings"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/session-learnings/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/session-learnings/
git commit -m "test(skill-behavior): 添加 session-learnings 行为测试"
```

---

## Task 6: loop-detection

**Files:**
- Create: `tests/skill-behavior/loop-detection/prompts/naive-stuck-editing.txt`
- Create: `tests/skill-behavior/loop-detection/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-stuck-editing.txt`:
```
I suspect I'm stuck — I've been editing the same file repeatedly without converging on a solution. Help me detect if I'm in a doom loop and how to break out.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: loop-detection ==="
echo ""
run_skill "loop-detection" "$SCRIPT_DIR/prompts/naive-stuck-editing.txt" 3
assert_skill_triggered "loop-detection"
assert_no_premature_action
assert_output_contains "loop\|stuck\|converge\|repeat\|doom\|循环\|卡住\|收敛\|重复" "mentions loop detection"
print_skill_summary "loop-detection"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/loop-detection/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/loop-detection/
git commit -m "test(skill-behavior): 添加 loop-detection 行为测试"
```

---

## Task 7: systematic-debugging

**Files:**
- Create: `tests/skill-behavior/systematic-debugging/prompts/naive-debug-error.txt`
- Create: `tests/skill-behavior/systematic-debugging/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-debug-error.txt`:
```
I'm encountering a bug: my Node.js API returns 500 on login intermittently. Help me find the root cause systematically before proposing any fix.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: systematic-debugging ==="
echo ""
run_skill "systematic-debugging" "$SCRIPT_DIR/prompts/naive-debug-error.txt" 3
assert_skill_triggered "systematic-debugging"
assert_no_premature_action
assert_output_contains "root cause\|phase\|debug\|hypothesis\|reproduce\|根因\|调试\|假设\|复现\|阶段" "mentions systematic debug"
print_skill_summary "systematic-debugging"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/systematic-debugging/run-test.sh`
Expected: 全 PASS

> **排查提示**：description 是 "Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes"。prompt 已含 "bug" + "before proposing any fix"。

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/systematic-debugging/
git commit -m "test(skill-behavior): 添加 systematic-debugging 行为测试"
```

---

## Task 8: documentation-sync

**Files:**
- Create: `tests/skill-behavior/documentation-sync/prompts/naive-sync-docs.txt`
- Create: `tests/skill-behavior/documentation-sync/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-sync-docs.txt`:
```
I just committed code changes to add a new feature. Before creating a PR, sync all project documentation — update README, ARCHITECTURE, CHANGELOG to match what shipped.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: documentation-sync ==="
echo ""
run_skill "documentation-sync" "$SCRIPT_DIR/prompts/naive-sync-docs.txt" 3
assert_skill_triggered "documentation-sync"
assert_no_premature_action
assert_output_contains "doc\|readme\|changelog\|sync\|update\|文档\|同步\|更新" "mentions doc sync"
print_skill_summary "documentation-sync"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/documentation-sync/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/documentation-sync/
git commit -m "test(skill-behavior): 添加 documentation-sync 行为测试"
```

---

## Task 9: finishing-a-development-branch

**Files:**
- Create: `tests/skill-behavior/finishing-a-development-branch/prompts/naive-finish-branch.txt`
- Create: `tests/skill-behavior/finishing-a-development-branch/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-finish-branch.txt`:
```
My implementation is complete and all tests pass. I need to decide how to integrate the work — merge, create PR, or cleanup the branch.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: finishing-a-development-branch ==="
echo ""
run_skill "finishing-a-development-branch" "$SCRIPT_DIR/prompts/naive-finish-branch.txt" 3
assert_skill_triggered "finishing-a-development-branch"
assert_no_premature_action
assert_output_contains "merge\|PR\|cleanup\|branch\|integrate\|合并\|清理\|分支\|集成" "mentions branch finishing"
print_skill_summary "finishing-a-development-branch"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/finishing-a-development-branch/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/finishing-a-development-branch/
git commit -m "test(skill-behavior): 添加 finishing-a-development-branch 行为测试"
```

---

## Task 10: writing-skills

**Files:**
- Create: `tests/skill-behavior/writing-skills/prompts/naive-create-skill.txt`
- Create: `tests/skill-behavior/writing-skills/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-create-skill.txt`:
```
I want to create a new skill for my project that automates release notes generation. Help me write the SKILL.md file with proper frontmatter, description, and when_to_use fields following best practices.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: writing-skills ==="
echo ""
run_skill "writing-skills" "$SCRIPT_DIR/prompts/naive-create-skill.txt" 3
assert_skill_triggered "writing-skills"
assert_no_premature_action
assert_output_contains "skill\|frontmatter\|description\|SKILL.md\|when_to_use\|技能" "mentions skill authoring"
print_skill_summary "writing-skills"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/writing-skills/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/writing-skills/
git commit -m "test(skill-behavior): 添加 writing-skills 行为测试"
```

---

## Task 11: harness-design

**Files:**
- Create: `tests/skill-behavior/harness-design/prompts/naive-prototype.txt`
- Create: `tests/skill-behavior/harness-design/run-test.sh`

> **注意**：harness-design description 是中文为主，触发词含"做原型""设计Demo""HTML演示"。prompt 必须用中文才能稳定触发。

- [ ] **Step 1: 写 prompt**

`prompts/naive-prototype.txt`:
```
帮我做一个高保真的 HTML 原型 Demo，用来展示一个待办事项 App 的交互界面。要有真实的视觉效果，双击就能打开的那种。
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: harness-design ==="
echo ""
run_skill "harness-design" "$SCRIPT_DIR/prompts/naive-prototype.txt" 3
assert_skill_triggered "harness-design"
assert_no_premature_action
assert_output_contains "design\|prototype\|html\|visual\|mockup\|设计\|原型\|视觉\|Demo" "mentions design/prototype"
print_skill_summary "harness-design"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/harness-design/run-test.sh`
Expected: 全 PASS

> **排查提示**：description 含大量中文触发词，prompt 必须中文。若未触发，检查日志中实际触发的 skill，可能被 brainstorming 抢走。

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/harness-design/
git commit -m "test(skill-behavior): 添加 harness-design 行为测试"
```

---

## Task 12: harness-init

**Files:**
- Create: `tests/skill-behavior/harness-init/prompts/naive-init-project.txt`
- Create: `tests/skill-behavior/harness-init/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-init-project.txt`:
```
I'm starting a new React + TypeScript project. Initialize agent-harness in this project and configure it for my tech stack.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: harness-init ==="
echo ""
run_skill "harness-init" "$SCRIPT_DIR/prompts/naive-init-project.txt" 3
assert_skill_triggered "harness-init"
assert_no_premature_action
assert_output_contains "tech stack\|init\|setup\|react\|python\|template\|技术栈\|初始化\|配置" "mentions project init"
print_skill_summary "harness-init"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/harness-init/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/harness-init/
git commit -m "test(skill-behavior): 添加 harness-init 行为测试"
```

---

## Task 13: harness-optimizer

**Files:**
- Create: `tests/skill-behavior/harness-optimizer/prompts/naive-optimize-from-session.txt`
- Create: `tests/skill-behavior/harness-optimizer/run-test.sh`

> **注意**：description 是中文，明确要求"用户提供 Claude Code 会话 ID"。prompt 必须中文 + 提供会话 ID。

- [ ] **Step 1: 写 prompt**

`prompts/naive-optimize-from-session.txt`:
```
我有一个 Claude Code 会话 ID：abc-123-def。根据这个会话复盘，帮我优化我的项目工作流。
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: harness-optimizer ==="
echo ""
run_skill "harness-optimizer" "$SCRIPT_DIR/prompts/naive-optimize-from-session.txt" 3
assert_skill_triggered "harness-optimizer"
assert_no_premature_action
assert_output_contains "session\|analyze\|optimize\|workflow\|skill\|会话\|分析\|优化\|工作流" "mentions session-based optimization"
print_skill_summary "harness-optimizer"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/harness-optimizer/run-test.sh`
Expected: 全 PASS

> **排查提示**：description 强调会话 ID 场景。若未触发，prompt 改成 "根据会话 abc-123 复盘并优化这个 skill"。

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/harness-optimizer/
git commit -m "test(skill-behavior): 添加 harness-optimizer 行为测试"
```

---

## Task 14: computational-sensors

**Files:**
- Create: `tests/skill-behavior/computational-sensors/prompts/naive-run-sensors.txt`
- Create: `tests/skill-behavior/computational-sensors/run-test.sh`

- [ ] **Step 1: 写 prompt**

`prompts/naive-run-sensors.txt`:
```
Before doing a semantic code review on my changes, set up and run the computational sensors — lint, typecheck, test, and coverage checks — to gather deterministic evidence.
```

- [ ] **Step 2: 写 run-test.sh**

```bash
#!/usr/bin/env bash
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../_helpers/run-skill.sh"
source "$SCRIPT_DIR/../_helpers/assert-skill-triggered.sh"

echo "=== Test: computational-sensors ==="
echo ""
run_skill "computational-sensors" "$SCRIPT_DIR/prompts/naive-run-sensors.txt" 3
assert_skill_triggered "computational-sensors"
assert_no_premature_action
assert_output_contains "lint\|typecheck\|test\|coverage\|sensor\|check\|检查\|覆盖\|传感器" "mentions computational sensors"
print_skill_summary "computational-sensors"
```

- [ ] **Step 3: 运行验证**

Run: `bash tests/skill-behavior/computational-sensors/run-test.sh`
Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add tests/skill-behavior/computational-sensors/
git commit -m "test(skill-behavior): 添加 computational-sensors 行为测试"
```

---

## Task 15: 全量验证 + Contract 验收

**Files:** 无新增

- [ ] **Step 1: 顺序运行本批 14 个 skill**

```bash
for skill in qa-testing post-deploy-monitoring retrospective trace-analysis session-learnings loop-detection systematic-debugging documentation-sync finishing-a-development-branch writing-skills harness-design harness-init harness-optimizer computational-sensors; do
    echo "########## $skill ##########"
    bash "tests/skill-behavior/$skill/run-test.sh" 2>&1 | tail -10
    echo ""
done
```

Expected: 每个 skill `STATUS: PASSED`

- [ ] **Step 2: Contract DoD 最终验收**

```bash
# 验收：skill 目录数 = 28（排除 _helpers）
COUNT=$(ls tests/skill-behavior/ | grep -v _helpers | wc -l | tr -d ' ')
echo "Skill directories: $COUNT"
[ "$COUNT" = "28" ] && echo "PASS: 28 skills" || echo "FAIL: expected 28, got $COUNT"
```

Expected: `PASS: 28 skills`

- [ ] **Step 3: 随机抽 3 个 skill 实际运行验证触发**

```bash
for skill in $(ls tests/skill-behavior/ | grep -v _helpers | shuf -n 3); do
    echo "########## spot check: $skill ##########"
    bash "tests/skill-behavior/$skill/run-test.sh" 2>&1 | tail -6
done
```

Expected: 3 个全 PASS

---

## Self-Review 检查

**1. Spec coverage**：
- 质量层 4 + 基础设施 5 + 元/Harness 5 = 14 个 ✓
- 累计 28/28 全覆盖 ✓

**2. Placeholder 扫描**：每个 task 完整 prompt + run-test.sh ✓

**3. Type consistency**：
- 所有 run-test.sh 共用 helper 模式 ✓
- 中文触发 skill（harness-design、harness-optimizer）prompt 用中文，断言关键词中英文都覆盖 ✓

**4. Contract DoD 最终验收**：
- helpers 存在 + 28 skill 目录全覆盖 + 触发断言稳定 + 退出码语义正确 + CLAUDE.md 更新 ✓

---

## Execution Handoff

Plan complete and saved to `docs/agent-harness/plans/2026-06-23-skill-behavior-batch4-quality-infra-meta.md`. 本批完成后整个测试覆盖率补全项目结束。
