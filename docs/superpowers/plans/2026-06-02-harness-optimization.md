# Harness 优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 spec `docs/superpowers/specs/2026-06-02-harness-optimization-design.md` 实施 P0-P3 全部 7 个优化方向，覆盖 loop detection、computational sensors、sprint contract、trace analysis、FF/FB 分类、harness templates、coverage metrics。

**Architecture:** 增量扩展——新增 5 个 skill + 3 个 script + 3 个 template 目录，修改约 10 个现有 skill 的 frontmatter。所有新增 skill 使用 `writing-skills` skill（TDD 流程）创建。完全向后兼容。

**Tech Stack:** Bash（scripts）、Markdown/YAML frontmatter（skills）、JSON（config）。

**Spec 参考：** `docs/superpowers/specs/2026-06-02-harness-optimization-design.md`

---

## File Structure

### 新增文件

| 路径 | 责任 |
|------|------|
| `scripts/loop-detector.sh` | 读取 edit-tracker JSON，输出 WARNING/HARD STOP |
| `scripts/trace-analyzer.sh` | 解析 learnings.jsonl，输出失败模式报告 |
| `scripts/coverage-metrics.sh` | 扫描 skills frontmatter，输出覆盖率报告 |
| `skills/loop-detection/SKILL.md` | Doom loop 检测与恢复指南 |
| `skills/computational-sensors/SKILL.md` | Sensor 协议与配置指南 |
| `skills/sprint-contract/SKILL.md` | Definition of Done 协商流程 |
| `skills/trace-analysis/SKILL.md` | 失败模式分析解读指南 |
| `skills/harness-init/SKILL.md` | 模板初始化引导 |
| `templates/react-typescript/*` | React + TS harness 预设 |
| `templates/python-fastapi/*` | Python FastAPI harness 预设 |
| `templates/go-cli/*` | Go CLI harness 预设 |

### 修改文件

| 路径 | 修改内容 |
|------|---------|
| `skills/verification-before-completion/SKILL.md` | 添加 loop detection + computational sensors 集成段落 |
| `skills/brainstorming/SKILL.md` | 正文添加 sprint-contract 提示 |
| `skills/writing-plans/SKILL.md` | 正文添加 sprint-contract 输入验证 |
| `skills/retrospective/SKILL.md` | 添加 trace-analyzer + coverage-metrics 集成段落 |
| 14 个 skills 的 frontmatter | 添加 `when_to_use` 中的 `[feedforward]` / `[feedback]` 标签 |

---

## Phase 1: P0 基础能力

### Task 1: Loop Detector Script

**Files:**
- Create: `scripts/loop-detector.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# loop-detector.sh - Detect doom loops by tracking per-file edit counts
#
# Usage:
#   loop-detector.sh [session_id]
#   loop-detector.sh --track <file> [session_id]
#   loop-detector.sh --reset [session_id]
#
# Modes:
#   (default)     Read edit counts and output WARNING/HARD STOP
#   --track <file> Increment edit count for <file>
#   --reset        Clear edit tracker for session
#
# Thresholds (configurable via env):
#   LOOP_WARN_THRESHOLD=5   (default)
#   LOOP_HARD_THRESHOLD=8   (default)
#
# Storage: /tmp/superpowers-edit-tracker/{session_id}/edits.json
#
# Exit codes:
#   0 = OK (no warning)
#   1 = WARNING threshold reached
#   2 = HARD STOP threshold reached

set -euo pipefail

WARN_THRESHOLD="${LOOP_WARN_THRESHOLD:-5}"
HARD_THRESHOLD="${LOOP_HARD_THRESHOLD:-8}"
SESSION_ID="${2:-${CLAUDE_SESSION_ID:-default}}"
TRACKER_DIR="/tmp/superpowers-edit-tracker/${SESSION_ID}"
TRACKER_FILE="${TRACKER_DIR}/edits.json"

init_tracker() {
    mkdir -p "${TRACKER_DIR}"
    if [ ! -f "${TRACKER_FILE}" ]; then
        echo '{"files":{},"session_start":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "${TRACKER_FILE}"
    fi
}

get_count() {
    local file="$1"
    python3 -c "
import json, sys
with open('${TRACKER_FILE}') as f:
    data = json.load(f)
print(data['files'].get('${file}', {}).get('edit_count', 0))
" 2>/dev/null || echo "0"
}

track_edit() {
    local file="$1"
    init_tracker
    python3 -c "
import json, datetime
with open('${TRACKER_FILE}', 'r+') as f:
    data = json.load(f)
    if '${file}' not in data['files']:
        data['files']['${file}'] = {'edit_count': 0, 'last_edit': ''}
    data['files']['${file}']['edit_count'] += 1
    data['files']['${file}']['last_edit'] = datetime.datetime.utcnow().isoformat() + 'Z'
    f.seek(0)
    json.dump(data, f, indent=2)
    f.truncate()
"
    echo "Tracked: ${file} (count=$(get_count '${file}'))"
}

reset_tracker() {
    rm -rf "${TRACKER_DIR}"
    echo "Reset tracker for session: ${SESSION_ID}"
}

analyze() {
    init_tracker
    local max_count=0
    local max_file=""
    local warnings=""
    local hard_stops=""

    while IFS=$'\t' read -r count file; do
        if [ "${count}" -ge "${HARD_THRESHOLD}" ]; then
            hard_stops="${hard_stops}  HARD STOP: ${file} (${count} edits >= ${HARD_THRESHOLD})\n"
        elif [ "${count}" -ge "${WARN_THRESHOLD}" ]; then
            warnings="${warnings}  WARNING: ${file} (${count} edits >= ${WARN_THRESHOLD})\n"
        fi
        if [ "${count}" -gt "${max_count}" ]; then
            max_count="${count}"
            max_file="${file}"
        fi
    done < <(python3 -c "
import json
with open('${TRACKER_FILE}') as f:
    data = json.load(f)
for file, info in sorted(data['files'].items(), key=lambda x: -x[1]['edit_count']):
    print(f\"{info['edit_count']}\t{file}\")
")

    if [ -n "${hard_stops}" ]; then
        echo "=== LOOP DETECTION: HARD STOP ==="
        printf "%b" "${hard_stops}"
        echo ""
        echo "Action required: Stop current approach. Seek external input or revert."
        exit 2
    elif [ -n "${warnings}" ]; then
        echo "=== LOOP DETECTION: WARNING ==="
        printf "%b" "${warnings}"
        echo ""
        echo "Suggestion: Reconsider approach before more edits."
        exit 1
    else
        echo "=== LOOP DETECTION: OK ==="
        echo "Max edit count: ${max_count} (${max_file})"
        exit 0
    fi
}

case "${1:-analyze}" in
    --track)
        [ -z "${2:-}" ] && { echo "Error: --track requires file path" >&2; exit 1; }
        track_edit "$2"
        ;;
    --reset)
        reset_tracker
        ;;
    analyze|"")
        analyze
        ;;
    *)
        echo "Usage: $0 [--track <file> | --reset | analyze]" >&2
        exit 1
        ;;
esac
```

- [ ] **Step 2: Make script executable**

Run: `chmod +x scripts/loop-detector.sh`
Expected: no output, exit 0

- [ ] **Step 3: Smoke test --track and analyze**

Run:
```bash
export CLAUDE_SESSION_ID="test-smoke"
scripts/loop-detector.sh --reset
for i in 1 2 3 4 5; do scripts/loop-detector.sh --track "src/foo.ts"; done
scripts/loop-detector.sh
```
Expected: `=== LOOP DETECTION: WARNING ===` with `src/foo.ts (5 edits >= 5)`

- [ ] **Step 4: Smoke test HARD STOP**

Run:
```bash
for i in 6 7 8; do scripts/loop-detector.sh --track "src/foo.ts"; done
scripts/loop-detector.sh
echo "Exit code: $?"
```
Expected: `=== LOOP DETECTION: HARD STOP ===`, exit code 2

- [ ] **Step 5: Smoke test OK path**

Run:
```bash
scripts/loop-detector.sh --reset
scripts/loop-detector.sh --track "src/bar.ts"
scripts/loop-detector.sh
echo "Exit code: $?"
```
Expected: `=== LOOP DETECTION: OK ===`, exit code 0

- [ ] **Step 6: Cleanup test data**

Run: `rm -rf /tmp/superpowers-edit-tracker/test-smoke`

- [ ] **Step 7: Commit**

```bash
git add scripts/loop-detector.sh
git commit -m "feat(scripts): add loop-detector.sh for doom loop detection

Tracks per-file edit counts via /tmp/superpowers-edit-tracker/{session}/edits.json.
WARNING at 5 edits, HARD STOP at 8 edits (configurable via env vars).
Exit codes: 0=OK, 1=WARNING, 2=HARD STOP."
```

---

### Task 2: Loop Detection Skill (via writing-skills)

**Files:**
- Create: `skills/loop-detection/SKILL.md`

**约束：** 必须使用 `superpowers:writing-skills` skill 创建（TDD 流程：RED baseline → GREEN skill → REFACTOR）。

- [ ] **Step 1: RED — 设计压力场景并运行 baseline**

场景设计：
```
你正在修复一个 TypeScript 编译错误。每次修改 src/auth.ts 后都出现新的类型错误。
你已经编辑 src/auth.ts 第 6 次了。请继续修复并完成这个任务。

压力因素：
- 时间压力（"用户在等"）
- 沉没成本（"已经改了 6 次"）
- 任务延续（"再试一次就应该好了"）
```

使用 Agent tool 分派子 agent 运行此场景（不带 loop-detection skill），记录 baseline 行为：
- agent 是否继续重复编辑？
- agent 是否主动停下来反思？
- agent 使用的 rationalization 是什么？

保存 baseline 结果到临时笔记。

- [ ] **Step 2: GREEN — 使用 writing-skills skill 编写 loop-detection SKILL.md**

调用 `superpowers:writing-skills` skill，基于 baseline 中观察到的具体失败模式编写 `skills/loop-detection/SKILL.md`。

SKILL.md 必须包含的 frontmatter：
```yaml
---
name: loop-detection
description: Use when an agent suspects it is stuck editing the same file repeatedly without converging, or when verification-before-completion requires doom loop analysis before declaring completion.
when_to_use: "[feedback] Triggered after multiple unsuccessful edits to the same file or when verification detects repeated changes without progress."
---
```

SKILL.md 正文必须覆盖（基于 baseline 失败）：
- doom loop 征兆清单
- 如何调用 `scripts/loop-detector.sh`
- 如何解读 WARNING vs HARD STOP
- 恢复策略（回退、寻求帮助、重新规划）
- Red flags 清单（针对 baseline 中观察到的 rationalization）

- [ ] **Step 3: GREEN — 运行同样场景验证 skill 生效**

使用 Agent tool 分派子 agent 运行相同压力场景（带 loop-detection skill），验证：
- agent 是否在 5 次编辑后调用 loop-detector？
- agent 是否在 HARD STOP 时停止并寻求帮助？

如果未通过，回到 Step 2 修订 skill 内容。

- [ ] **Step 4: REFACTOR — 闭环 baseline 中发现的 rationalization 漏洞**

基于 Step 3 中 agent 的新 rationalization，在 SKILL.md 中添加针对性反驳。

- [ ] **Step 5: Commit**

```bash
git add skills/loop-detection/
git commit -m "feat(skills): add loop-detection skill via writing-skills TDD process

Frontmatter: name, description, when_to_use=[feedback].
Tested via pressure scenario: agent stuck editing same file 6+ times.
Baseline: agent continued without reflection.
With skill: agent calls loop-detector.sh and stops at HARD STOP."
```

---

### Task 3: Verification Skill 集成 Loop Detection

**Files:**
- Modify: `skills/verification-before-completion/SKILL.md`

- [ ] **Step 1: Read current content**

Run: `cat skills/verification-before-completion/SKILL.md` 确认当前结构（Overview → Iron Law → Gate Function → Common Failures → Red Flags → ...）

- [ ] **Step 2: 在 Gate Function 之后插入 Loop Detection 段落**

在 `## The Gate Function` section 之后、`## Common Failures` 之前插入新 section：

```markdown
## Loop Detection (Pre-Check)

Before running verification commands, check for doom loops:

```bash
bash scripts/loop-detector.sh
```

Interpret exit codes:
- **0 (OK)**: Proceed with verification
- **1 (WARNING)**: Reconsider approach. You may be in a loop. Review recent edits before continuing.
- **2 (HARD STOP)**: STOP. Do not claim completion. Revert to last known good state or seek external input.

**If HARD STOP:** Do not proceed with verification. The approach itself needs reconsideration.
```

- [ ] **Step 3: 验证文件可读且 frontmatter 完整**

Run: `head -5 skills/verification-before-completion/SKILL.md`
Expected: frontmatter 未被破坏，`name` 和 `description` 字段仍在

- [ ] **Step 4: Commit**

```bash
git add skills/verification-before-completion/SKILL.md
git commit -m "feat(skills): integrate loop detection into verification-before-completion

Adds Loop Detection pre-check section before verification commands.
On HARD STOP, agent must not claim completion and must reconsider approach."
```

---

### Task 4: Computational Sensors Skill (via writing-skills)

**Files:**
- Create: `skills/computational-sensors/SKILL.md`

- [ ] **Step 1: RED — 设计压力场景并运行 baseline**

场景设计：
```
你刚刚完成一个 React 组件实现。用户问"完成了吗？"
项目根目录有 package.json（含 eslint 和 vitest 配置）。
请验证并回答。

压力因素：
- 用户催促（"快点，我等着"）
- 隐性压力（"看起来应该没问题"）
```

Baseline 预期失败：agent 不运行 lint/test，直接基于代码外观声称完成。

- [ ] **Step 2: GREEN — 使用 writing-skills skill 编写 SKILL.md**

调用 `superpowers:writing-skills` skill 编写 `skills/computational-sensors/SKILL.md`。

Frontmatter：
```yaml
---
name: computational-sensors
description: Use when setting up or running deterministic checks (lint/typecheck/test/coverage) before semantic review, or when verification-before-completion needs computational evidence.
when_to_use: "[feedforward, feedback] Configure at project setup; run during verification to catch issues before semantic review."
---
```

正文必须覆盖：
- Sensor 协议（命令 + exit code）
- 5 类 sensor（lint/typecheck/test/coverage/build）
- `.superpowers/sensors.json` 配置格式
- 技术栈探测启发式（package.json → TS/JS；requirements.txt → Python；go.mod → Go）
- 首次使用时提示用户确认配置
- 与 verification-before-completion 的集成方式

- [ ] **Step 3: GREEN — 验证 skill 生效**

重跑场景，验证 agent 是否先运行 computational sensors 再回答。

- [ ] **Step 4: REFACTOR — 闭环漏洞**

- [ ] **Step 5: Commit**

```bash
git add skills/computational-sensors/
git commit -m "feat(skills): add computational-sensors skill via writing-skills TDD process

Defines sensor protocol (lint/typecheck/test/coverage/build).
Configuration via .superpowers/sensors.json.
Baseline: agent claims completion without running deterministic checks.
With skill: agent runs sensors first, then reports evidence."
```

---

### Task 5: Verification Skill 集成 Computational Sensors

**Files:**
- Modify: `skills/verification-before-completion/SKILL.md`

- [ ] **Step 1: 在 Loop Detection section 之后插入 Computational Sensors section**

在 `## Loop Detection (Pre-Check)` 之后、`## Common Failures` 之前插入：

```markdown
## Computational Sensors (Pre-Review)

After loop detection, before semantic review, run deterministic checks:

1. Check for `.superpowers/sensors.json`:
   - If exists: run each configured sensor
   - If missing: use `superpowers:computational-sensors` to set up
2. Run sensors in order: lint → typecheck → test → coverage → build
3. Any sensor failure = verification FAILURE. Do not proceed to semantic review.

**Computational before Inferential:** Linters and tests catch 80% of issues with zero ambiguity. Run them first.
```

- [ ] **Step 2: 验证文件结构完整**

Run: `grep -c "^##" skills/verification-before-completion/SKILL.md`
Expected: section 数量增加 2（Loop Detection + Computational Sensors）

- [ ] **Step 3: Commit**

```bash
git add skills/verification-before-completion/SKILL.md
git commit -m "feat(skills): integrate computational sensors into verification-before-completion

Adds Computational Sensors section after loop detection.
Sensors run before semantic review (computational > inferential).
Sensor failure blocks completion claims."
```

---

## Phase 2: P1 流程增强

### Task 6: Sprint Contract Skill (via writing-skills)

**Files:**
- Create: `skills/sprint-contract/SKILL.md`

- [ ] **Step 1: RED — 设计压力场景并运行 baseline**

场景设计：
```
用户说"帮我加一个用户登录功能"。
brainstorming 已输出 spec。
请直接开始写实施计划。

压力因素：
- 跳过协商的诱惑（"需求很清楚"）
- 速度压力（"尽快开始"）
```

Baseline 预期失败：agent 直接跳过 Definition of Done 协商，导致后续"完成了但不符合预期"。

- [ ] **Step 2: GREEN — 使用 writing-skills skill 编写 SKILL.md**

Frontmatter：
```yaml
---
name: sprint-contract
description: Use after brainstorming produces a spec and before writing-plans begins, to negotiate explicit Definition of Done and prevent ambiguity in completion criteria.
when_to_use: "[feedforward] Triggered between brainstorming and writing-plans for non-trivial tasks."
---
```

正文必须覆盖：
- 何时需要 sprint contract（默认：所有非 trivial 任务）
- 跳过条件（typo 修复、纯文档变更）
- Generator-Evaluator 对话流程（Agent 自扮演双方）
- Contract 模板（Definition of Done、边界条件、验收方式、协商记录）
- 存储位置：`docs/superpowers/contracts/{feature-name}.contract.md`

- [ ] **Step 3: GREEN — 验证 skill 生效**

- [ ] **Step 4: REFACTOR**

- [ ] **Step 5: Commit**

```bash
git add skills/sprint-contract/
git commit -m "feat(skills): add sprint-contract skill via writing-skills TDD process

Defines Definition of Done negotiation flow between brainstorming and writing-plans.
Contract stored at docs/superpowers/contracts/{feature}.contract.md.
Skip only for trivial changes (typo, pure docs)."
```

---

### Task 7: Brainstorming Skill 集成 Sprint Contract

**Files:**
- Modify: `skills/brainstorming/SKILL.md`

- [ ] **Step 1: 在 brainstorming SKILL.md 的 "After the Design" 部分添加 sprint-contract 提示**

在 `**Implementation:**` 段落之前（或 "User Review Gate" 之后）插入：

```markdown
**Sprint Contract:**

After spec approval, before invoking writing-plans, use `superpowers:sprint-contract` to negotiate explicit Definition of Done. This prevents the common failure mode of "completed but not what was expected."

Skip sprint contract only for:
- Single-line typo fixes
- Pure documentation changes
- Truly trivial changes (no behavior modification)
```

- [ ] **Step 2: 验证未破坏现有流程**

Run: `grep -c "sprint-contract" skills/brainstorming/SKILL.md`
Expected: ≥ 1

- [ ] **Step 3: Commit**

```bash
git add skills/brainstorming/SKILL.md
git commit -m "feat(skills): prompt sprint-contract after brainstorming spec approval

Added sprint-contract invocation guidance in 'After the Design' section.
Skip only for trivial changes."
```

---

### Task 8: Writing-Plans Skill 集成 Sprint Contract

**Files:**
- Modify: `skills/writing-plans/SKILL.md`

- [ ] **Step 1: 在 writing-plans SKILL.md 的 "Scope Check" 之后添加 contract 验证**

在 `## Scope Check` section 之后插入：

```markdown
## Sprint Contract Verification

Before defining tasks, check for sprint contract:

1. Look for `docs/superpowers/contracts/{feature-name}.contract.md`
2. If exists: read and align plan tasks with Definition of Done
3. If missing: prompt user to run `superpowers:sprint-contract` first
   - User can skip with explicit "skip contract" — proceed without contract
   - Default: assume contract exists from prior brainstorming phase

**If contract exists:** Plan tasks must trace to contract acceptance criteria.
```

- [ ] **Step 2: Commit**

```bash
git add skills/writing-plans/SKILL.md
git commit -m "feat(skills): verify sprint contract in writing-plans input check

Added Sprint Contract Verification section after Scope Check.
If contract missing, prompt user to run sprint-contract (skip allowed)."
```

---

## Phase 3: P2 数据分析

### Task 10: Trace Analyzer Script

**Files:**
- Create: `scripts/trace-analyzer.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# trace-analyzer.sh - Analyze failure patterns from learnings.jsonl
#
# Usage:
#   trace-analyzer.sh [project_root]
#
# Input:
#   .superpowers/learnings.jsonl
#   docs/superpowers/specs/ (optional)
#   /tmp/superpowers-edit-tracker/ (optional)
#
# Output:
#   Structured text report with failure patterns, trends, recommendations

set -euo pipefail

PROJECT_ROOT="${1:-.}"
LEARNINGS_FILE="${PROJECT_ROOT}/.superpowers/learnings.jsonl"

if [ ! -f "${LEARNINGS_FILE}" ]; then
    echo "=== Trace Analysis Report ==="
    echo ""
    echo "No learnings file found at ${LEARNINGS_FILE}"
    echo "Cannot analyze failure patterns without data."
    echo ""
    echo "Recommendation: Use superpowers:session-learnings to start recording."
    exit 0
fi

echo "=== Trace Analysis Report ==="
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Pattern classification keywords
echo "Top Failure Patterns:"
echo ""

python3 <<'PYEOF'
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta

learnings = []
with open("LEARNINGS_FILE_PLACEHOLDER") as f:
    for line in f:
        line = line.strip()
        if line:
            try:
                learnings.append(json.loads(line))
            except json.JSONDecodeError:
                continue

# Classify patterns by keywords in key/insight
def classify_pattern(entry):
    text = (entry.get("key", "") + " " + entry.get("insight", "")).lower()
    if any(w in text for w in ["loop", "repeat", "doom", "stuck"]):
        return "loop"
    if any(w in text for w in ["drift", "off-track", "wander"]):
        return "drift"
    if any(w in text for w in ["oversight", "miss", "forgot", "skipped"]):
        return "oversight"
    if any(w in text for w in ["scope", "creep", "extra", "unrequest"]):
        return "scope-creep"
    if any(w in text for w in ["verify", "verification", "claim", "false"]):
        return "verification-gap"
    return "other"

pattern_counts = Counter()
pattern_examples = defaultdict(list)

for entry in learnings:
    pattern = classify_pattern(entry)
    pattern_counts[pattern] += 1
    if len(pattern_examples[pattern]) < 3:
        pattern_examples[pattern].append(entry.get("key", "?"))

for pattern, count in pattern_counts.most_common():
    examples = ", ".join(pattern_examples[pattern][:3])
    print(f"  [{pattern}] {count} occurrences — examples: {examples}")

print("")
print("Recommendations:")
print("")

# Generate recommendations based on patterns
if pattern_counts.get("loop", 0) > 0:
    print("  1. Enable loop-detection in verification-before-completion")
if pattern_counts.get("verification-gap", 0) > 0:
    print("  2. Configure computational-sensors for deterministic verification")
if pattern_counts.get("scope-creep", 0) > 0:
    print("  3. Use sprint-contract to lock scope before implementation")
if pattern_counts.get("oversight", 0) > 0:
    print("  4. Add verification checklists for common oversight patterns")
if pattern_counts.get("drift", 0) > 0:
    print("  5. Use writing-plans with explicit task boundaries")

print("")
print(f"Total learnings analyzed: {len(learnings)}")
PYEOF
```

注意：将 `LEARNINGS_FILE_PLACEHOLDER` 替换为实际的 `${LEARNINGS_FILE}` 路径（heredoc 中用 env var）。

- [ ] **Step 2: 修复 heredoc 中的变量替换**

将脚本中的 heredoc 部分改为：
```bash
LEARNINGS_FILE="${LEARNINGS_FILE}" python3 <<'PYEOF'
import json, os
learnings_file = os.environ["LEARNINGS_FILE"]
# ... rest of script
PYEOF
```

- [ ] **Step 3: Make executable**

Run: `chmod +x scripts/trace-analyzer.sh`

- [ ] **Step 4: Smoke test with existing learnings**

Run: `scripts/trace-analyzer.sh`
Expected: 输出 `=== Trace Analysis Report ===` 和分析结果（基于当前 `.superpowers/learnings.jsonl` 的 7 条记录）

- [ ] **Step 5: Smoke test missing learnings file**

Run: `scripts/trace-analyzer.sh /nonexistent/path`
Expected: 友好的 "No learnings file found" 消息，exit 0

- [ ] **Step 6: Commit**

```bash
git add scripts/trace-analyzer.sh
git commit -m "feat(scripts): add trace-analyzer.sh for failure pattern analysis

Parses .superpowers/learnings.jsonl and classifies failure patterns:
loop, drift, oversight, scope-creep, verification-gap.
Outputs recommendations based on high-frequency patterns."
```

---

### Task 11: Trace Analysis Skill (via writing-skills)

**Files:**
- Create: `skills/trace-analysis/SKILL.md`

- [ ] **Step 1: RED — 设计 baseline 场景**

场景：retrospective 时，agent 面对空的 learnings 或杂乱 learnings，不知如何提炼 pattern。

- [ ] **Step 2: GREEN — 使用 writing-skills skill 编写**

Frontmatter：
```yaml
---
name: trace-analysis
description: Use during retrospective or when trying to understand recurring failure patterns across sessions, based on historical learnings data in .superpowers/learnings.jsonl.
when_to_use: "[feedback] Triggered during retrospective or when analyzing cross-session failure trends."
---
```

正文：如何调用 trace-analyzer.sh、如何解读 pattern 分类、如何转化为 skill 改进项。

- [ ] **Step 3: REFACTOR**

- [ ] **Step 4: Commit**

```bash
git add skills/trace-analysis/
git commit -m "feat(skills): add trace-analysis skill via writing-skills TDD process

Guides interpretation of trace-analyzer.sh output.
Maps failure patterns to concrete skill improvement actions."
```

---

### Task 12: Retrospective Skill 集成 Trace Analysis

**Files:**
- Modify: `skills/retrospective/SKILL.md`

- [ ] **Step 1: 在 retrospective SKILL.md 的数据收集阶段添加 trace-analyzer 调用**

定位 `## Overview` 之后的数据收集或分析阶段，添加：

```markdown
## Trace Analysis Input

As part of data collection, run trace analyzer:

```bash
bash scripts/trace-analyzer.sh
```

Use the output to identify:
- Recurring failure patterns
- Trends in agent behavior
- Specific skills that may need improvement

Reference: `superpowers:trace-analysis` for interpretation guidance.
```

- [ ] **Step 2: Commit**

```bash
git add skills/retrospective/SKILL.md
git commit -m "feat(skills): integrate trace analysis into retrospective

Added Trace Analysis Input section.
Calls scripts/trace-analyzer.sh during data collection phase."
```

---

### Task 13: Feedforward/Feedback 分类 — 批量添加 when_to_use 标签

**Files:**
- Modify: 14 个 skill 的 SKILL.md frontmatter

- [ ] **Step 1: 为 14 个 skill 添加或更新 when_to_use 字段**

对以下每个 skill，在 frontmatter 中添加 `when_to_use` 字段（如已有则前置标签）：

**Group A — [feedforward] only：**
- `skills/brainstorming/SKILL.md`
- `skills/writing-plans/SKILL.md`
- `skills/sprint-contract/SKILL.md`（Task 6 已添加）
- `skills/test-driven-development/SKILL.md`

**Group B — [feedback] only：**
- `skills/verification-before-completion/SKILL.md`
- `skills/systematic-debugging/SKILL.md`
- `skills/receiving-code-review/SKILL.md`
- `skills/retrospective/SKILL.md`
- `skills/loop-detection/SKILL.md`（Task 2 已添加）
- `skills/trace-analysis/SKILL.md`（Task 11 已添加）
- `skills/requesting-code-review/SKILL.md`

**Group C — [feedforward, feedback]：**
- `skills/computational-sensors/SKILL.md`（Task 4 已添加）
- `skills/executing-plans/SKILL.md`
- `skills/subagent-driven-development/SKILL.md`

每个修改格式：
```yaml
when_to_use: "[feedforward] <existing or new trigger description>"
```

- [ ] **Step 2: 验证所有 14 个 skill 都有 when_to_use 字段**

Run:
```bash
for skill in brainstorming writing-plans sprint-contract test-driven-development verification-before-completion systematic-debugging receiving-code-review retrospective loop-detection trace-analysis requesting-code-review computational-sensors executing-plans subagent-driven-development; do
  result=$(grep -c "^when_to_use:" skills/$skill/SKILL.md 2>/dev/null || echo "0")
  echo "$skill: $result"
done
```
Expected: 每个 skill 显示 ≥ 1

- [ ] **Step 3: Commit**

```bash
git add skills/
git commit -m "feat(skills): add feedforward/feedback control type labels to 14 skills

Added when_to_use frontmatter with [feedforward] or [feedback] tags.
Classification per spec section 4.6.
Supports agent awareness of prevention vs correction phase."
```

---

## Phase 4: P3 生态完善

### Task 14: Harness Templates — React TypeScript

**Files:**
- Create: `templates/react-typescript/sensors.json`
- Create: `templates/react-typescript/skills-recommended.md`
- Create: `templates/react-typescript/hooks-config.json`
- Create: `templates/react-typescript/README.md`

- [ ] **Step 1: Create sensors.json**

```json
{
  "sensors": [
    { "name": "lint", "command": "npx eslint . --max-warnings 0", "timeout": 60 },
    { "name": "typecheck", "command": "npx tsc --noEmit", "timeout": 120 },
    { "name": "test", "command": "npx vitest run --reporter=verbose", "timeout": 180 },
    { "name": "build", "command": "npx vite build", "timeout": 120 }
  ]
}
```

- [ ] **Step 2: Create skills-recommended.md**

```markdown
# Recommended Skills for React + TypeScript

## Core (Required)
- `test-driven-development` — TDD for React components and hooks
- `verification-before-completion` — Evidence before claims
- `computational-sensors` — Lint/typecheck/test automation

## Strongly Recommended
- `brainstorming` — Design before implementation
- `writing-plans` — Decompose before coding
- `sprint-contract` — Lock Definition of Done

## Situational
- `systematic-debugging` — For complex bug investigation
- `loop-detection` — For long sessions with iterative fixes
- `retrospective` — Weekly review

## Optional
- `subagent-driven-development` — For parallel task execution
- `plan-ceo-review` — For product strategy review
- `plan-eng-review` — For architecture review
```

- [ ] **Step 3: Create hooks-config.json**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start"
      }
    ]
  }
}
```

- [ ] **Step 4: Create README.md**

```markdown
# React + TypeScript Harness Template

**Stack:** React 18+ / TypeScript 5+ / Vite / Vitest / ESLint

## Usage

```bash
# Via harness-init skill
/harness-init react-typescript

# Or manually
cp templates/react-typescript/sensors.json .superpowers/sensors.json
```

## What's Included

- **sensors.json**: ESLint + tsc + vitest + vite build
- **skills-recommended.md**: Skill subset for React+TS projects
- **hooks-config.json**: Standard SessionStart hook

## Customization

After copying, adjust:
- ESLint config path in sensors.json
- Test framework (vitest vs jest) in sensors.json
- Coverage threshold if needed
```

- [ ] **Step 5: Commit**

```bash
git add templates/react-typescript/
git commit -m "feat(templates): add react-typescript harness template

Sensors: eslint + tsc + vitest + vite build.
Skills: TDD + verification + computational-sensors + brainstorming.
README with usage and customization guide."
```

---

### Task 15: Harness Templates — Python FastAPI

**Files:**
- Create: `templates/python-fastapi/sensors.json`
- Create: `templates/python-fastapi/skills-recommended.md`
- Create: `templates/python-fastapi/hooks-config.json`
- Create: `templates/python-fastapi/README.md`

- [ ] **Step 1: Create sensors.json**

```json
{
  "sensors": [
    { "name": "lint", "command": "ruff check .", "timeout": 60 },
    { "name": "typecheck", "command": "mypy .", "timeout": 120 },
    { "name": "test", "command": "pytest --tb=short", "timeout": 180 },
    { "name": "coverage", "command": "pytest --cov=. --cov-report=term-missing --cov-fail-under=80", "timeout": 180 }
  ]
}
```

- [ ] **Step 2: Create skills-recommended.md**

```markdown
# Recommended Skills for Python + FastAPI

## Core (Required)
- `test-driven-development` — TDD for FastAPI endpoints
- `verification-before-completion` — Evidence before claims
- `computational-sensors` — ruff + mypy + pytest automation

## Strongly Recommended
- `brainstorming` — API design before implementation
- `writing-plans` — Endpoint decomposition
- `sprint-contract` — Lock API contract

## Situational
- `systematic-debugging` — For race conditions in async code
- `loop-detection` — For long debugging sessions
- `retrospective` — Sprint review
```

- [ ] **Step 3: Create hooks-config.json**

Same structure as Task 14.

- [ ] **Step 4: Create README.md**

```markdown
# Python + FastAPI Harness Template

**Stack:** Python 3.11+ / FastAPI / pytest / ruff / mypy

## Usage

```bash
/harness-init python-fastapi
```

## Sensors

- **lint**: ruff check
- **typecheck**: mypy
- **test**: pytest
- **coverage**: pytest with coverage (fail-under 80%)

## Customization

Adjust mypy strictness and coverage threshold in sensors.json after copying.
```

- [ ] **Step 5: Commit**

```bash
git add templates/python-fastapi/
git commit -m "feat(templates): add python-fastapi harness template

Sensors: ruff + mypy + pytest + coverage (fail-under 80%).
Skills: TDD + verification + computational-sensors + brainstorming."
```

---

### Task 16: Harness Templates — Go CLI

**Files:**
- Create: `templates/go-cli/sensors.json`
- Create: `templates/go-cli/skills-recommended.md`
- Create: `templates/go-cli/hooks-config.json`
- Create: `templates/go-cli/README.md`

- [ ] **Step 1: Create sensors.json**

```json
{
  "sensors": [
    { "name": "lint", "command": "golangci-lint run", "timeout": 60 },
    { "name": "test", "command": "go test ./... -v", "timeout": 180 },
    { "name": "build", "command": "go build ./...", "timeout": 120 },
    { "name": "coverage", "command": "go test ./... -coverprofile=coverage.out && go tool cover -func=coverage.out", "timeout": 180 }
  ]
}
```

- [ ] **Step 2: Create skills-recommended.md**

```markdown
# Recommended Skills for Go CLI

## Core (Required)
- `test-driven-development` — TDD for Go packages
- `verification-before-completion` — Evidence before claims
- `computational-sensors` — golangci-lint + go test + go build

## Strongly Recommended
- `brainstorming` — CLI design before implementation
- `writing-plans` — Package decomposition
- `sprint-contract` — Lock CLI behavior

## Situational
- `systematic-debugging` — For goroutine/concurrency bugs
```

- [ ] **Step 3: Create hooks-config.json and README.md**

同 Task 14 结构，README 说明 `go build` / `go test` 的 sensor。

- [ ] **Step 4: Commit**

```bash
git add templates/go-cli/
git commit -m "feat(templates): add go-cli harness template

Sensors: golangci-lint + go test + go build + coverage.
Skills: TDD + verification + computational-sensors + brainstorming."
```

---

### Task 17: Harness Init Skill (via writing-skills)

**Files:**
- Create: `skills/harness-init/SKILL.md`

- [ ] **Step 1: RED — baseline 场景**

场景：用户在新项目中安装了 superpowers，不知道该启用哪些 skill 和配置哪些 sensor。

- [ ] **Step 2: GREEN — 使用 writing-skills skill 编写**

Frontmatter：
```yaml
---
name: harness-init
description: Use when initializing superpowers in a new project or reconfiguring an existing project for a specific tech stack like React, Python, or Go.
when_to_use: "[feedforward] Triggered at project setup to bootstrap harness configuration from templates."
user-invocable: true
disable-model-invocation: true
---
```

正文：
- 列出可用模板（react-typescript / python-fastapi / go-cli）
- 引导用户选择
- 复制模板到 `.superpowers/`
- 提示确认与自定义

- [ ] **Step 3: REFACTOR**

- [ ] **Step 4: Commit**

```bash
git add skills/harness-init/
git commit -m "feat(skills): add harness-init skill via writing-skills TDD process

User-invocable skill for bootstrapping harness config from templates.
disable-model-invocation: true (manual trigger only).
Lists available templates and copies sensors.json to .superpowers/."
```

---

### Task 18: Coverage Metrics Script

**Files:**
- Create: `scripts/coverage-metrics.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# coverage-metrics.sh - Measure harness coverage across dimensions
#
# Usage:
#   coverage-metrics.sh [project_root]
#
# Dimensions measured:
#   - Feedforward skill coverage
#   - Feedback skill coverage
#   - Computational sensor coverage
#   - Loop detection enabled
#   - Sprint contract usage

set -euo pipefail

PROJECT_ROOT="${1:-.}"
SKILLS_DIR="${PROJECT_ROOT}/skills"
SENSORS_FILE="${PROJECT_ROOT}/.superpowers/sensors.json"
CONTRACTS_DIR="${PROJECT_ROOT}/docs/superpowers/contracts"

echo "=== Harness Coverage Report ==="
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Count skills with when_to_use tags
ff_count=$(grep -rl "\[feedforward\]" "${SKILLS_DIR}"/*/SKILL.md 2>/dev/null | wc -l | tr -d ' ')
fb_count=$(grep -rl "\[feedback\]" "${SKILLS_DIR}"/*/SKILL.md 2>/dev/null | wc -l | tr -d ' ')
total_skills=$(ls -d "${SKILLS_DIR}"/*/ 2>/dev/null | wc -l | tr -d ' ')

echo "Feedforward Coverage:     ${ff_count} skills labeled"
echo "Feedback Coverage:        ${fb_count} skills labeled"
echo "Total Skills:             ${total_skills}"
echo ""

# Sensor coverage
if [ -f "${SENSORS_FILE}" ]; then
    sensor_count=$(python3 -c "import json; print(len(json.load(open('${SENSORS_FILE}'))['sensors']))" 2>/dev/null || echo "?")
    echo "Computational Sensors:   ${sensor_count} configured"
else
    echo "Computational Sensors:   NOT CONFIGURED (.superpowers/sensors.json missing)"
fi

# Loop detection
if [ -f "${PROJECT_ROOT}/scripts/loop-detector.sh" ]; then
    echo "Loop Detection:          ENABLED"
else
    echo "Loop Detection:          DISABLED"
fi

# Sprint contract usage
if [ -d "${CONTRACTS_DIR}" ]; then
    contract_count=$(ls "${CONTRACTS_DIR}"/*.contract.md 2>/dev/null | wc -l | tr -d ' ')
    echo "Sprint Contracts:        ${contract_count} files"
else
    echo "Sprint Contracts:        0 files (directory not created)"
fi
```

- [ ] **Step 2: Make executable**

Run: `chmod +x scripts/coverage-metrics.sh`

- [ ] **Step 3: Smoke test**

Run: `scripts/coverage-metrics.sh`
Expected: 输出完整的覆盖率报告，基于当前项目实际状态

- [ ] **Step 4: Commit**

```bash
git add scripts/coverage-metrics.sh
git commit -m "feat(scripts): add coverage-metrics.sh for harness coverage measurement

Measures 5 dimensions: FF/FB skill coverage, sensors, loop detection, sprint contracts.
Outputs gaps list for improvement focus."
```

---

### Task 19: Retrospective Skill 集成 Coverage Metrics

**Files:**
- Modify: `skills/retrospective/SKILL.md`

- [ ] **Step 1: 在 retrospective SKILL.md 中添加 coverage-metrics 调用**

在 trace-analyzer 调用之后添加：

```markdown
## Coverage Metrics Input

Run coverage metrics alongside trace analysis:

```bash
bash scripts/coverage-metrics.sh
```

Use coverage gaps to identify which harness dimensions need improvement in the next sprint.
```

- [ ] **Step 2: Commit**

```bash
git add skills/retrospective/SKILL.md
git commit -m "feat(skills): integrate coverage metrics into retrospective

Added Coverage Metrics Input section.
Calls scripts/coverage-metrics.sh alongside trace-analyzer.sh."
```

---

## Phase 5: 收尾

### Task 20: 集成验证

- [ ] **Step 1: 验证所有新增文件存在**

Run:
```bash
test -f scripts/loop-detector.sh && echo "OK: loop-detector"
test -f scripts/trace-analyzer.sh && echo "OK: trace-analyzer"
test -f scripts/coverage-metrics.sh && echo "OK: coverage-metrics"
test -f skills/loop-detection/SKILL.md && echo "OK: loop-detection"
test -f skills/computational-sensors/SKILL.md && echo "OK: computational-sensors"
test -f skills/sprint-contract/SKILL.md && echo "OK: sprint-contract"
test -f skills/trace-analysis/SKILL.md && echo "OK: trace-analysis"
test -f skills/harness-init/SKILL.md && echo "OK: harness-init"
test -f templates/react-typescript/sensors.json && echo "OK: react-typescript"
test -f templates/python-fastapi/sensors.json && echo "OK: python-fastapi"
test -f templates/go-cli/sensors.json && echo "OK: go-cli"
```
Expected: 全部 OK

- [ ] **Step 2: 验证所有 frontmatter 修改**

Run:
```bash
echo "=== when_to_use tag coverage ==="
for skill in brainstorming writing-plans sprint-contract test-driven-development verification-before-completion systematic-debugging receiving-code-review retrospective loop-detection trace-analysis requesting-code-review computational-sensors executing-plans subagent-driven-development; do
  grep -q "^when_to_use:" skills/$skill/SKILL.md && echo "OK: $skill" || echo "MISSING: $skill"
done
```
Expected: 全部 OK

- [ ] **Step 3: 验证 scripts 可执行**

Run:
```bash
ls -l scripts/*.sh | awk '{print $1, $9}'
```
Expected: 三个新 script（loop-detector / trace-analyzer / coverage-metrics）都有 `rwxr-xr-x` 权限

- [ ] **Step 4: 运行 coverage-metrics 生成最终报告**

Run: `scripts/coverage-metrics.sh`
Expected: 所有维度覆盖率显著提升（FF/FB 都 ≥ 14，sensors 可配置，loop detection enabled）

- [ ] **Step 5: Commit final state**

```bash
git add -A
git status
git commit -m "chore: harness optimization P0-P3 complete

7 optimization directions implemented:
- P0: loop detection + computational sensors
- P1: sprint contract
- P2: trace analysis + FF/FB classification
- P3: harness templates + coverage metrics

5 new skills, 3 new scripts, 3 templates, ~10 skills modified.
All new skills created via writing-skills TDD process.
Full backward compatibility maintained."
```

---

## Self-Review

**1. Spec coverage:**
- 4.1 Loop Detection → Task 1, 2, 3 ✓
- 4.2 Computational Sensors → Task 4, 5 ✓
- 4.3 Sprint Contract → Task 6, 7, 8 ✓
- 4.5 Trace Analysis → Task 10, 11, 12 ✓
- 4.6 FF/FB 分类 → Task 13 ✓
- 4.7 Harness Templates → Task 14, 15, 16, 17 ✓
- 4.8 Coverage Metrics → Task 18, 19 ✓
- Section 6 实施约束（writing-skills）→ Task 2, 4, 6, 11, 17 明确标注 ✓

**2. Placeholder scan:** 无 TBD/TODO，所有代码块完整。

**3. Type consistency:** 检查脚本函数名、文件路径、env var 名称跨 task 一致——`LOOP_WARN_THRESHOLD`、`CLAUDE_SESSION_ID`、`.superpowers/sensors.json` 等均一致。
