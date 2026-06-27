# 移除 Worktree 支持

## 背景

当前 harness 架构中包含 `using-git-worktrees` skill，用于创建隔离的 git worktree 工作空间。实际上该功能已被标记为 OPTIONAL，且 `executing-plans` 明确禁止创建 worktree。用户认为该功能不必要，决定完全移除。

## 变更清单

### 1. 删除 skill 目录

删除 `skills/using-git-worktrees/` 整个目录。

### 2. 清理 subagent-driven-development

**文件:** `skills/subagent-driven-development/SKILL.md`

移除 Integration 段落中对 worktrees 的引用（约第 303 行）：
```
- **agent-harness:using-git-worktrees** - OPTIONAL: Set up isolated workspace if user requests isolation (not required by default). If worktrees are disallowed, run review flow directly in the current workspace.
```

### 3. 清理 executing-plans

**文件:** `skills/executing-plans/SKILL.md`

- 移除 Rule 7："Do not create git worktrees—work directly in the current workspace."
- 移除 Integration 段落中对 worktrees 的引用（约第 98 行）

### 4. 简化 finishing-a-development-branch

**文件:** `skills/finishing-a-development-branch/SKILL.md`

- 删除 Step 5 (Cleanup Worktree) 整个段落
- Option 3 改为 "Keep the branch as-is (I'll handle it later)"，去掉 worktree 描述
- Option 4 确认提示中去掉 "Worktree at <path>"
- Quick reference 表去掉 Worktree 列和 Cleanup Worktree 行
- Integration 段落移除 `using-git-worktrees` 引用

### 5. 清理 writing-plans

**文件:** `skills/writing-plans/SKILL.md`

移除 2 处 worktree 引用：
- 第 169 行（可选 skill 说明）
- 第 196 行（并行开发分支）

### 6. 清理 requesting-code-review

**文件:** `skills/requesting-code-review/SKILL.md`

移除第 34 行 worktree 提及。

### 7. 清理 code-quality-reviewer-prompt

**文件:** `skills/subagent-driven-development/code-quality-reviewer-prompt.md`

移除第 11 行 worktree 提及。

### 8. 清理 README.md

移除 worktree 相关引用（约第 16、168、170、197 行）。

### 9. 清理 README_EN.md

移除 worktree 相关引用（约第 16、168、170、197 行）。

### 10. 清理 stop-hook.sh

移除 `hooks/stop-hook.sh` 中 worktree 相关注释（第 17 行）。

### 不变更

- `RELEASE-NOTES.md` — 历史记录保留不动
- `docs/` 下的设计文档 — 历史记录保留不动
- `.agent-harness/learnings.jsonl` — 学习记录保留不动

## 验证

1. `grep -ri worktree skills/` 应无结果
2. `grep -ri worktree README.md README_EN.md` 应无结果
3. 各 skill 文件语法正确、链接不broken
