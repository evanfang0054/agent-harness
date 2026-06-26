---
name: fix-issues-and-pr
description: Use when the user wants to fix existing GitHub issues and open a single PR — wraps auto-loop.sh --fix-only. Trigger on "修 #12", "把 open issues 都修了提 PR", "fix issue #15", "拉 issue 来修". Do NOT use when analyzing sessions or creating new issues.
---

# Fix Issues And PR

## Overview

Wraps `scripts/auto-loop.sh --fix-only`: pulls existing GitHub issues → runs SDD (brainstorming → writing-plans → subagent-driven-development) per issue → **all fixes ship as ONE PR** that closes every target issue. **No session analysis, no new issues.**

## When to Use

- 用户说："修一下 #12" / "把 open issues 都修了提 PR" / "拉 issue 来修" / "fix issue #15"
- 用户调用 `/fix-issues-and-pr #12,#15` 或 `/fix-issues-and-pr all`
- Issues already exist (人工或 `generate-issues` 创建的)，现在要批量修复

**When NOT to use:**
- 想从会话日志挖掘新问题 → 用 `generate-issues`
- 想一次完成 分析+修复+PR → 直接调用 `scripts/auto-loop.sh`（不带 `--fix-only`）

## Key Constraint — One PR for All Issues

> 多 issue 一个 PR：所有修复打到同一分支 `feat/fix-issues-<first_issue>-<date>`，PR body 用 `closes #N`（每行一个，GitHub 自动关闭）。不要拆成多个 PR。

## Parameter Mapping

| 用户表达 | CLI 参数 |
|---------|---------|
| "修 #12 #15" | `--fix-only "#12,#15"` |
| "修所有 open issues" | `--fix-only "all"` |
| "修最多 5 个" | `--max-issues 5`（与 `all` 配合，默认 10） |

## Issue Source — Ask, Don't Guess

- **默认**：用户必须明确给 issue 号。如果用户说"修那个性能 issue"而没给号，**引导用户给号**，不要自己猜。
- **`all`**：拉取 `evanfang0054/superpowers` 所有 open issues，按更新时间排序，受 `--max-issues` 限制。

## Examples

```bash
./scripts/auto-loop.sh --fix-only "#12,#15"
```

```bash
./scripts/auto-loop.sh --fix-only "all" --max-issues 10
```

## Prerequisites

同 `generate-issues`：`claude` / `gh`（已 `gh auth login`） / `jq` / `uv` 可用，工作区干净。

## Outputs

- 分支 `feat/fix-issues-<first_issue>-<date>`，PR body 含 `closes #12\ncloses #15\n...`
- `.claude/auto-loop/state.json` 的 `.progress.fixes_completed` 记录每个 issue 的 commit hash

## Scope Boundary (Do NOT)

- ❌ 不重新分析会话 → 用 `generate-issues`
- ❌ 不提新 issue → issue 来源是已存在的
- ❌ 不拆分多个 PR → 当前实现只支持单 PR

完整能力见 `scripts/auto-loop.sh` 与 `skills/auto-loop/orchestrator-prompt.md` 的 `fix_only` 模式分支。
