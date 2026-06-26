---
name: generate-issues
description: Use when the user wants to analyze Claude Code sessions and create GitHub issues from discovered problems WITHOUT fixing them. Trigger on phrases like "分析会话提 issue", "找出最近会话问题", "只生成 issue 不修复", "盘点会话问题". Do NOT use when fixing, writing code, or opening PRs.
---

# Generate Issues

## Overview

Wraps `scripts/auto-loop.sh --dry-run`: scans Claude Code session logs → identifies problem patterns → opens GitHub issues on `evanfang0054/superpowers`. **Analysis and issue creation only — no fixes, no code, no PRs.**

## When to Use

- 用户说："分析今天的会话提 issue" / "找出最近的会话问题" / "只生成 issue 不修复" / "盘点会话问题"
- 用户调用 `/generate-issues [args]`
- 想批量从历史会话挖掘问题，暂时不想修复

**When NOT to use:**
- 想修复已有 issue → 用 `fix-issues-and-pr` skill
- 想一次完成 分析+修复+PR → 直接调用 `scripts/auto-loop.sh`（不带 `--dry-run`）

## How to Invoke

Run `./scripts/auto-loop.sh --dry-run "<natural language request>"`. Common flags:

| 用户表达 | CLI 参数 |
|---------|---------|
| "调用了 X 相关 skill 的会话" | `--filter "调用了 X 相关 skill"` |
| 指定项目路径 | `--project <path>` |
| 所有项目 | `--all-projects` |
| "最多提 N 个" | `--max-issues N` |

完整参数列表运行 `./scripts/auto-loop.sh --help`。

## Examples

```bash
./scripts/auto-loop.sh --dry-run \
    --filter "调用了 brainstorming 相关 skill" \
    --max-issues 5 \
    "分析本周 superpowers 相关会话"
```

```bash
./scripts/auto-loop.sh --dry-run --all-projects "盘点所有项目最近的问题"
```

## Prerequisites

调用前确认（或让脚本自检）:
- `claude` CLI、`gh`（已 `gh auth login`）、`jq`、`uv`/`uvx` 可用
- 当前工作区干净（脚本拒绝在脏工作区运行）

## Outputs

- 会话快照: `.claude/auto-loop/runs/<run_id>/sessions.md`
- 分析结果: `.claude/auto-loop/runs/<run_id>/analysis.json`
- 提交的 issues: GitHub `evanfang0054/superpowers`
- dry-run 模式保留 worktree 供检查（脚本侧已处理）

## Scope Boundary (Do NOT)

- ❌ 不修复 issue → 用 `fix-issues-and-pr`
- ❌ 不提 PR、不写代码、不调用 brainstorming / writing-plans / SDD

完整能力见 `scripts/auto-loop.sh` 与 `skills/auto-loop/orchestrator-prompt.md`。
