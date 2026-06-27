# 移除 Worktree 支持 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use agent-harness:subagent-driven-development (recommended) or agent-harness:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking。

**Goal:** 完全移除 harness 中的 worktree 功能支持

**Architecture:** 删除 using-git-worktrees skill 目录，清理所有引用该 skill 的文件

**Tech Stack:** Markdown, Shell

---

### Task 1: 删除 using-git-worktrees skill

**Files:**
- Delete: `skills/using-git-worktrees/` (整个目录)

- [ ] **Step 1: 删除目录**

```bash
rm -rf skills/using-git-worktrees
```

- [ ] **Step 2: 验证删除**

```bash
ls skills/using-git-worktrees 2>&1  # 应报错 No such file or directory
```

- [ ] **Step 3: Commit**

```bash
git add -A skills/using-git-worktrees
git commit -f"chore: remove using-git-worktrees skill"
```

---

### Task 2: 清理 subagent-driven-development 引用

**Files:**
- Modify: `skills/subagent-driven-development/SKILL.md`

- [ ] **Step 1: 移除 Integration 段落中的 worktree 引用**

移除以下行：
```
- **agent-harness:using-git-worktrees** - OPTIONAL: Set up isolated workspace if user requests isolation (not required by default). If worktrees are disallowed, run review flow directly in the current workspace.
```

- [ ] **Step 2: Commit**

```bash
git add skills/subagent-driven-development/SKILL.md
git commit -m "chore: remove worktree reference from subagent-driven-development"
```

---

### Task 3: 清理 executing-plans 引用

**Files:**
- Modify: `skills/executing-plans/SKILL.md`

- [ ] **Step 1: 移除 Rule 7**

移除：
```
7. Do not create git worktrees—work directly in the current workspace.
```

- [ ] **Step 2: 移除 Integration 段落中的 worktree 引用**

移除：
```
- **agent-harness:using-git-worktrees** - OPTIONAL: Set up isolated workspace if user requests isolation (not required by default)
```

- [ ] **Step 3: 简化 no-worktree 相关描述**

将：
```
If subagents are available **and** do not conflict with active constraints (for example, no-worktree requirements)
```
改为：
```
If subagents are available
```

- [ ] **Step 4: Commit**

```bash
git add skills/executing-plans/SKILL.md
git commit -m "chore: remove worktree references from executing-plans"
```

---

### Task 4: 简化 finishing-a-development-branch

**Files:**
- Modify: `skills/finishing-a-development-branch/SKILL.md`

- [ ] **Step 1: 删除 Step 5 (Cleanup Worktree)**

删除整个 "### Step 5: Cleanup Worktree" 段落。

- [ ] **Step 2: 更新 Option 3 描述**

将 "Worktree preserved at <path>" 去掉。

- [ ] **Step 3: 更新 Option 4 确认提示**

去掉 "Worktree at <path>" 行。

- [ ] **Step 4: 更新 Quick Reference 表**

去掉 Worktree 列。

- [ ] **Step 5: 更新 Integration 段落**

移除 `using-git-worktrees` 引用。

- [ ] **Step 6: Commit**

```bash
git add skills/finishing-a-development-branch/SKILL.md
git commit -m "chore: remove worktree cleanup from finishing-a-development-branch"
```

---

### Task 5: 清理其他 skill 引用

**Files:**
- Modify: `skills/writing-plans/SKILL.md`
- Modify: `skills/requesting-code-review/SKILL.md`
- Modify: `skills/subagent-driven-development/code-quality-reviewer-prompt.md`

- [ ] **Step 1: writing-plans 移除 worktree 引用**

移除：
```
**Context:** Works on any feature branch. Optionally use a dedicated worktree if user requests isolation.
```

- [ ] **Step 2: requesting-code-review 移除 worktree 提及**

将：
```
Invoke the `code-reviewer` agent (defined in `agents/code-reviewer.md`). It runs in the current workspace—no worktree needed.
```
改为：
```
Invoke the `code-reviewer` agent (defined in `agents/code-reviewer.md`).
```

- [ ] **Step 3: code-quality-reviewer-prompt 移除 worktree 提及**

移除：
```
Runs in current workspace—no worktree needed.
```

- [ ] **Step 4: Commit**

```bash
git add skills/writing-plans/SKILL.md skills/requesting-code-review/SKILL.md skills/subagent-driven-development/code-quality-reviewer-prompt.md
git commit -m "chore: remove worktree references from other skills"
```

---

### Task 6: 清理 README 和 hooks

**Files:**
- Modify: `README.md`
- Modify: `README_EN.md`
- Modify: `hooks/stop-hook.sh`
- Modify: `skills/using-agent-harness/references/codex-tools.md`

- [ ] **Step 1: README.md 移除 worktree 引用**

移除 finishing-a-development-branch 描述中的 "如使用工作树则清理"。
移除 "可选：using-git-worktrees" 段落。
移除技能列表中的 "using-git-worktrees - 并行开发分支"。

- [ ] **Step 2: README_EN.md 移除 worktree 引用**

同上英文版。

- [ ] **Step 3: stop-hook.sh 更新注释**

将 worktree 相关注释简化为通用描述。

- [ ] **Step 4: codex-tools.md 更新环境检测说明**

移除 `using-git-worktrees` 引用和 worktree 检测逻辑。

- [ ] **Step 5: Commit**

```bash
git add README.md README_EN.md hooks/stop-hook.sh skills/using-agent-harness/references/codex-tools.md
git commit -m "chore: remove worktree references from README and hooks"
```

---

### Task 7: 验证清理完整性

- [ ] **Step 1: 搜索残留引用**

```bash
grep -ri worktree skills/ README.md README_EN.md
```

应无结果（除了 systematic-debugging 中的 WorktreeManager 类名，属于外部项目案例代码）。

- [ ] **Step 2: 验证 skill 目录不存在**

```bash
ls skills/using-git-worktrees 2>&1
```

应报错。
