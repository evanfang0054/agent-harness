# Session Log Optimization Design

**Date:** 2026-06-24
**Branch:** feat/loop-optimization
**Scope:** 核心仓库（skills, hooks, scripts, tests）

## Background

通过分析最近一个月（2026-06-01 ~ 06-24）的 Claude Code 会话日志，识别出 7 个反复出现的问题模式。经审查当前代码状态，**部分问题已在 v6.0.0 周期的重构中修复**（如 `hooks/session-start` 路径已用 `LEARNINGS_DIR` 变量，`scripts/log-learning.sh` 和 `search-learnings.sh` 已统一为 v2 路径解析）。本 spec 聚焦尚未修复的问题，并增加预防性机制。

## Problem Statement

| # | 问题 | 严重程度 | 当前状态 |
|---|------|---------|---------|
| 1 | design skill 经历 3 次重命名（huashu-design→design→harness-design） | 历史 | 已完成，属流程问题，不在技术修复范围 |
| 2 | SDD/learnings 脚本路径不一致（相对 vs 绝对） | 高 | ✅ 已在 v2 重构中修复 |
| 3 | `.superpowers/learnings.jsonl` 反复被意外 stage 进无关 commit | 高 | ❌ **未修复**——无防护机制 |
| 4 | implementer 子代理跑去分析不相关的游戏项目 | 中 | ❌ **未修复**——task brief 无边界约束 |
| 5 | 斜杠形式 `/skill` 在 headless 模式 (`claude -p`) 下失败 | 中 | ❌ **未修复**——无开发提示 |
| 6 | 电商 demo 页面 10 分钟内被中断 4 次 | 历史 | 单次事件，非系统性问题 |
| 7 | Token 浪费在未完成任务和误诊 bug 上 | 低 | 间接通过 3/4/5 改善 |

## Design Overview

三个优化域，每个域采用 B 方案（中等投入，解决根因）：

- **Domain 1**: 路径一致性 + PreToolUse 提交防护 hook
- **Domain 2**: 子代理边界约束 + SubagentStop 审计 hook
- **Domain 3**: session-start headless 提示 + hook 基础设施整合

---

## Domain 1: Commit Hygiene

### 1.1 路径一致性（已完成，保留为上下文）

`hooks/session-start`、`scripts/log-learning.sh`、`scripts/search-learnings.sh` 均已在 v2 重构中统一使用 `CLAUDE_PROJECT_DIR` 优先、`git rev-parse` 回退的路径解析。本域不再涉及路径修复，聚焦提交防护。

### 1.2 新增 PreToolUse 提交防护 hook

**目标:** 防止 `.superpowers/learnings.jsonl` 和 `.superpowers/sdd/` 等运行时文件被意外 `git add` 进无关 commit。

**新文件:** `scripts/guard-staging.sh`（~30 行）

**工作原理:**
1. 从 stdin 读取 PreToolUse 事件 JSON
2. 提取 `tool_input.command` 字段
3. 检测命令是否匹配 `git add` 模式（`git add .`、`git add -A`、`git add <包含受保护路径>`）
4. 受保护路径列表: `.superpowers/learnings.jsonl`、`.superpowers/sdd/`、`.superpowers/loop-tracker.json`
5. 如果匹配，exit 2 + stderr 输出阻止原因
6. 如果命令包含 `-f` 或 `--force` 标志，允许通过（显式强制操作）
7. 如果命令不涉及 `git add`，exit 0 放行

**hook 配置:** 在 `hooks/hooks.json` 的 `PreToolUse` 事件中注册。

**边界情况:**
- `git add -A` 和 `git add .` 会 stage 所有文件，需要检测并阻止（要求显式列出文件名）
- `git add -f` 用于 force-add `.gitignore` 中的文件（如 skills 目录），应允许
- 用户直接在终端运行 `git add` 不受 hook 影响（hook 只拦截 Claude 的 Bash 工具调用）

---

## Domain 2: Subagent Reliability

### 2.1 强化 SDD task brief 边界约束

**当前问题:** implementer 子代理偶尔偏离任务，探索不相关的代码库。

**修改方案:**

文件: `skills/subagent-driven-development/SKILL.md`

在 dispatch implementer 的提示模板中增加 "CRITICAL BOUNDARIES" 段落：

```markdown
## CRITICAL BOUNDARIES
- ONLY work on the files and tasks listed in this brief
- IGNORE any files, projects, or contexts not explicitly mentioned
- If you find yourself exploring unrelated code, STOP immediately and report this in your output
- Do NOT read files outside the task scope unless required for the specific change
- Your output MUST reference the actual files you modified (with paths and line numbers)
```

**位置:** 在 task brief 模板的 "Task Description" 和 "Context" 之间插入。

### 2.2 新增 SubagentStop 审计 hook

**目标:** 在子代理完成后做轻量级输出检查，检测明显偏离的任务。

**新文件:** `scripts/audit-subagent.sh`（~40 行）

**工作原理:**
1. 从 stdin 读取 SubagentStop 事件 JSON
2. 提取子代理的 agent_type 和输出摘要
3. **软检查**（不阻止，只警告）:
   - 检查输出长度是否异常短（< 50 字符，可能未完成任务）
   - 检查是否包含明显的 off-topic 关键词（如与项目完全无关的技术栈名称）
4. 如果检测到异常，exit 0 + stdout 输出警告信息注入到 context
5. 正常完成时 exit 0 无输出

**hook 配置:** 在 `hooks/hooks.json` 的 `SubagentStop` 事件中注册，matcher 为 `general-purpose|implementer`。

**设计原则:** 这是"软检查"——只注入信息，不阻止流程。避免误判导致的流程中断。

---

## Domain 3: Hook & Skill Infrastructure

### 3.1 session-start 注入 headless 模式提示

**当前问题:** 斜杠形式 `/skill-name` 在 headless 模式下不可靠触发 Skill 工具，但开发者在编写测试或 CI 脚本时不知道这个限制。

**修改方案:**

在 `hooks/session-start` 中无条件注入简短提示（不检测 headless 模式，因为条件检测不可靠）：

```bash
echo ""
echo "## Skill Invocation Best Practice"
echo "When programmatically invoking skills (tests, CI, -p mode), use imperative form:"
echo "  ✅ 'Invoke the Skill tool with brainstorming'"
echo "  ❌ '/brainstorming'"
echo ""
```

这段提示在每次 session-start 时输出，对交互式用户是低干扰的（session-start 输出本就较长），但对 headless 测试场景是关键提醒。

### 3.2 hooks.json 完整配置

在 `hooks/hooks.json` 中整合所有新增 hook：

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "bash \"$CLAUDE_PROJECT_DIR/scripts/guard-staging.sh\""
        }
      ]
    }
  ],
  "SubagentStop": [
    {
      "matcher": "general-purpose|implementer",
      "hooks": [
        {
          "type": "command",
          "command": "bash \"$CLAUDE_PROJECT_DIR/scripts/audit-subagent.sh\""
        }
      ]
    }
  ]
}
```

注意: 现有 `hooks/hooks.json` 的 `SessionStart` 和 `Stop` 配置保持不变，新增的 PreToolUse 和 SubagentStop 配置需要合并到现有结构中。

### 3.3 Cursor 兼容性

`hooks/hooks-cursor.json` 中不需要添加这些 hook（Cursor 不支持 PreToolUse/SubagentStop 事件）。

---

## Files to Create/Modify

| 文件 | 操作 | 域 |
|------|------|-----|
| `hooks/hooks.json` | 修改: 新增 PreToolUse 和 SubagentStop 配置 | 1, 2 |
| `hooks/session-start` | 修改: 注入 headless 提示（路径解析无需改动） | 3 |
| `scripts/guard-staging.sh` | 新建: 提交防护脚本 | 1 |
| `scripts/audit-subagent.sh` | 新建: 子代理审计脚本 | 2 |
| `skills/subagent-driven-development/SKILL.md` | 修改: 增加 CRITICAL BOUNDARIES 段落 | 2 |
| `tests/plugin-infrastructure/test-guard-staging.sh` | 新建: 防护 hook 测试 | 1 |
| `tests/plugin-infrastructure/test-audit-subagent.sh` | 新建: 审计 hook 测试 | 2 |

## Out of Scope

- demo/fruit-shop/ 项目（独立项目，不在核心仓库优化范围内）
- templates/ 目录（起步模板，无运行时行为）
- design skill 命名稳定性（已重命名完成，不再调整；问题本质是缺乏命名决策前置流程，属于流程问题而非技术问题）
- headless skill 触发的根本修复（这是 Claude API 行为问题，非项目可控）
- Stop hook 重入防护（`stop_hook_active` / `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`）——Issue #3 中提到，但属于 hook 基础设施改造，独立于本 spec 的三个优化域；如需处理应开独立 spec

## Linked Issues

本 spec 的实现将关闭以下 GitHub issues：

| Issue | 标题 | 对应域 | 关闭条件 |
|-------|------|--------|---------|
| #1 | bug: scripts use relative paths causing wrong file locations in nested repos | Domain 1 | PreToolUse 防护 hook 上线 + 路径一致性验证通过 |
| #2 | bug: subagent task drift — implementer analyzes unrelated projects | Domain 2 | SDD task brief 增加 CRITICAL BOUNDARIES + SubagentStop 审计 hook 上线 |
| #3 | bug: headless mode skill triggering unreliable, slash-form /skill fails in `claude -p` | Domain 3 | session-start 无条件注入 headless skill 调用提示 |
| #4 | perf: excessive token waste from unfinished tasks, misdiagnosis, and skill naming churn | Domain 1/2/3（间接） | 前三项问题修复后，token 浪费的主要来源（意外 staging 重做、子代理偏离、headless 重试）被消除；关闭时附注说明间接改善 |

**关闭策略：** 实现完成、所有测试通过后，在关闭 issue 的评论中引用本 spec 路径和对应的提交 SHA。Issue #4 以 "indirectly addressed" 关闭，评论说明 token 浪费的根因（问题 3/4/5）已被本 spec 消除，剩余的命名稳定性属流程问题，不在技术修复范围。

## Success Criteria

1. `git add .` 和 `git add -A` 在 Claude 的 Bash 工具中被防护 hook 阻止（当存在受保护运行时文件时）
2. `git add <受保护路径>` 被阻止；`git add -f <受保护路径>` 被允许
3. 子代理偏离任务时，SubagentStop hook 能输出警告信息到 context
4. SDD task brief 包含明确的边界约束段落
5. session-start 无条件输出 headless 模式调用提示
6. 所有新增脚本有对应的测试用例
7. 现有测试全部通过（`tests/plugin-infrastructure/run-all.sh`）

## Risk Assessment

| 风险 | 影响 | 缓解 |
|------|------|------|
| PreToolUse hook 过度阻止正常 git add | 高 | 仅检测特定受保护路径，`-f` 可绕过 |
| SubagentStop 审计产生误报警告 | 低 | 软检查设计，只警告不阻止 |
| session-start 输出增加导致 token 浪费 | 低 | 提示内容 < 10 行，可忽略 |
| hooks.json 格式错误导致 hook 不触发 | 高 | 修改后手动验证 `/hooks` 菜单 |
