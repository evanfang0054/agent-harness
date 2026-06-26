# Auto-Loop Skills 双子分离设计

**日期**: 2026-06-26
**状态**: Draft
**作者**: evanfang0054
**关联**: `scripts/auto-loop.sh`, `skills/auto-loop/orchestrator-prompt.md`

## 背景

当前 `scripts/auto-loop.sh` 是「会话分析 → 提 issue → SDD 修复 → PR」一揽子闭环，用户已通过 `--dry-run` 获得了「只生成 issue 不修复」的能力，但缺少：

1. **直接拉取已存在 issue 修复并提 PR** 的入口（跳过分析+不提新 issue）
2. 两个面向用户的 **skill 入口**，让 Claude 能根据上下文自动选择正确的子能力，而不需要用户记忆 `--dry-run` / `--fix-only` 等 shell 参数

## 目标

- 新增 skill A `generate-issues`：封装 auto-loop.sh `--dry-run`，只做会话分析+提 issue
- 新增 skill B `fix-issues-and-pr`：封装新增的 `--fix-only` 模式，拉取 GitHub issue → SDD 修复 → 单 PR
- 两个 skill 都通过 commands/ 同名 slash 命令显式调用，也支持自动触发
- **不重复实现** SDD/分析逻辑（保持在 auto-loop.sh + orchestrator-prompt.md 内）

## 非目标 (YAGNI)

- ❌ skill 内部不调用 brainstorming / writing-plans / SDD（委托给 auto-loop.sh orchestrator）
- ❌ 不引入新第三方依赖
- ❌ 不为 skill 添加单元测试（skill 是行为塑造文档，非可执行代码；遵循 writing-skills 的目录与 frontmatter 规范即可）
- ❌ 不重构 auto-loop.sh 的现有链路
- ❌ skill B 不重新分析会话、不提新 issue（这是 skill A 的职责）

## 总体架构

```
skills/generate-issues/SKILL.md         (skill A — 只生成 issues)
skills/fix-issues-and-pr/SKILL.md       (skill B — 拉取 issue 修复并提 PR)
commands/generate-issues.md             (slash 命令 /generate-issues)
commands/fix-issues-and-pr.md           (slash 命令 /fix-issues-and-pr)
scripts/auto-loop.sh                    (新增 --fix-only / --max-issues 参数)
skills/auto-loop/orchestrator-prompt.md  (按 MODE 渲染不同链路 + 新占位符)
```

**职责边界**:
- A 实现 = 调用 `auto-loop.sh --dry-run ...`
- B 实现 = 调用 `auto-loop.sh --fix-only "<issue_list>"`
- 两者都不自己跑 SDD / brainstorming，全部委托给 auto-loop.sh

## auto-loop.sh 扩展

### 新参数

| 参数 | 类型 | 行为 |
|------|------|------|
| `--fix-only "[list]"` | string | 跳过分析+不提 issue，直接修复指定 issue（`"all"` 表示拉所有 open issues，或 `"#12,#15"` 显式列表） |
| `--max-issues N` | int | 上限 issue 数（A 模式限制噪音；B 模式 `all` 时限制批量大小） |

### 模式矩阵

| 模式 | 创建分支 | 扫描会话 | 分析 | 提 issue | SDD 修复 | PR |
|------|---------|---------|------|---------|---------|-----|
| 默认 (full) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `--dry-run` (A) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `--fix-only` (B) | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |

### 实现要点

1. **`auto-loop.sh` 参数解析**: 新增 `--fix-only` 与 `--max-issues`，写入 state.json:
   - `.mode = "full" | "dry_run" | "fix_only"`
   - `.target_issues = [] | ["#12", "#15"] | ["all"]`
   - `.max_issues = N | null`

2. **orchestrator-prompt.md 占位符扩展**:
   - 新增 `{{MODE}}`、`{{TARGET_ISSUES}}`、`{{MAX_ISSUES}}`
   - 在 jq `gsub` 调用中加入对应分支
   - 8 步链路开头加 mode 守卫:
     - `MODE == "fix_only"`: 跳过步骤 2-4（扫描/分析/提 issue），从步骤 5 开始；issue 来源 = `state.target_issues`，不是 `state.progress.issues_created`
     - `MODE == "dry_run"`: 完成步骤 4 后停止（保留现有 `PROMPT_DRY_RUN_NOTE`）
     - `MODE == "full"`: 完整 8 步

3. **`--fix-only "all"` 行为**: orchestrator 通过 `gh issue list --state open --limit N` 拉取 issue 号列表（N 由 `--max-issues` 决定，默认 10），写入 state.target_issues。

4. **多 issue 单 PR 策略**:
   - 分支命名: `feat/fix-issues-<first_issue>-<run_id>` （例如 `feat/fix-issues-12-2026-06-26-103045`）
   - 所有修复打到同一分支
   - PR body 关联: `closes #12, closes #15, closes #18`
   - 多个 issue 共享一次 `verification-before-completion` 和一次 push

5. **`--max-issues` 行为** (A 模式):
   - orchestrator 在步骤 4 提 issue 前，先 `gh issue list` 去重；
   - 如果累计将超过 `max_issues`，停止提新 issue，在 analysis.json 记录 `issues_truncated_at: N`。
   - B 模式下 `--fix-only "all"` 配合 `--max-issues` 决定一次最多修复几个。

### 前置约束

- `--fix-only` 仍走 `check_clean_workspace` + `check_git_remote` + worktree（一致性，避免污染主分支）
- `--fix-only` 不与 `--dry-run` 同时使用（互斥，参数解析时报错退出）

## Skill A: generate-issues

### Frontmatter

```yaml
---
name: generate-issues
description: Use when user wants to analyze Claude Code sessions and create GitHub issues from discovered problems without fixing them — wraps auto-loop.sh --dry-run
---
```

### 触发场景

- 用户说："分析今天的会话提 issue" / "找出最近的会话问题" / "只生成 issue 不修复" / "盘点会话问题"
- 用户调用 `/generate-issues [args]`

### 核心内容 (约 250 字)

- **一句话**: 调用 `scripts/auto-loop.sh --dry-run` 完成「会话扫描 → 分析 → 提 issue」，不修复
- **参数映射表** (用户语言 → CLI):

| 用户表达 | CLI 参数 |
|---------|---------|
| "今天的会话" | (auto-loop.sh 默认 `--from-date "3 days ago"`，可在 REQUEST 里说"今天") |
| "调用了 X skill 的会话" | `--filter "调用了 X 相关 skill"` |
| 指定项目路径 | `--project <path>` |
| 所有项目 | `--all-projects` |
| 最多提 N 个 | `--max-issues N` |

- **调用示例**:
  ```bash
  ./scripts/auto-loop.sh --dry-run \
      --filter "调用了 brainstorming 相关 skill" \
      --max-issues 5 \
      "分析本周 superpowers 相关会话"
  ```
- **前置检查**: claude / gh (已登录) / jq / uv 已装
- **输出位置**: `.claude/auto-loop/runs/<run_id>/analysis.json` + GitHub issues
- **不做什么**: 不修复、不提 PR、不写代码

## Skill B: fix-issues-and-pr

### Frontmatter

```yaml
---
name: fix-issues-and-pr
description: Use when user wants to pull existing GitHub issues and fix them with SDD workflow then create a PR — wraps auto-loop.sh --fix-only
---
```

### 触发场景

- 用户说："修一下 #12" / "把 open issues 都修了提 PR" / "拉 issue 来修" / "fix issue #15"
- 用户调用 `/fix-issues-and-pr #12,#15` 或 `/fix-issues-and-pr all`

### 核心内容 (约 250 字)

- **一句话**: 调用 `scripts/auto-loop.sh --fix-only "<issue_list>"` 完成「拉取 issue → SDD 修复 → 单 PR」
- **参数映射表**:

| 用户表达 | CLI 参数 |
|---------|---------|
| "修 #12 #15" | `--fix-only "#12,#15"` |
| "修所有 open issues" | `--fix-only "all"` |
| "修最多 5 个" | `--max-issues 5` |
| 指定项目 | (B 通常不需要，目标仓库由 auto-loop.sh 固定为 evanfang0054/superpowers) |

- **关键约束 (显眼位置)**:
  - **多 issue 一个 PR**（所有修复打到同一分支，PR body 关联 `closes #N`）
  - 不重新分析会话、不提新 issue（这些是 skill A 的职责）
  - 修复流程委托给 auto-loop.sh 内置的 SDD 链路
- **issue 来源决策**:
  - 默认: 用户必须明确指定 issue 号（口语"修性能 issue"时引导用户给号，不要自己猜）
  - `all`: 拉取仓库所有 open issues 按更新时间排序，受 `--max-issues` 限制
- **调用示例**:
  ```bash
  ./scripts/auto-loop.sh --fix-only "#12,#15"
  ./scripts/auto-loop.sh --fix-only "all" --max-issues 10
  ```
- **前置检查**: 同 A

## Slash 命令

### `commands/generate-issues.md`

```markdown
---
description: 只生成 issues，不修复（封装 auto-loop.sh --dry-run）
---

调用 generate-issues skill，用户参数：$ARGUMENTS
```

### `commands/fix-issues-and-pr.md`

```markdown
---
description: 拉取 GitHub issue 并修复，提 PR（封装 auto-loop.sh --fix-only）
---

调用 fix-issues-and-pr skill，issue 列表或选项：$ARGUMENTS
```

## 实现顺序

1. 扩展 `scripts/auto-loop.sh`:
   - 新增 `--fix-only` / `--max-issues` 参数解析
   - 与 `--dry-run` 互斥校验
   - state_init 写入 `.mode` / `.target_issues` / `.max_issues`
2. 扩展 `skills/auto-loop/orchestrator-prompt.md`:
   - 新增 `{{MODE}}` / `{{TARGET_ISSUES}}` / `{{MAX_ISSUES}}` 占位符
   - 8 步链路加 mode 守卫（fix_only 跳 2-4，dry_run 4 后停）
3. 同步 `auto-loop.sh` 的 jq `gsub` 调用加入新占位符
4. 写 `skills/generate-issues/SKILL.md`（遵循 writing-skills 目录与 frontmatter 规范）
5. 写 `skills/fix-issues-and-pr/SKILL.md`
6. 写 `commands/generate-issues.md` + `commands/fix-issues-and-pr.md`
7. 手测:
   - `./scripts/auto-loop.sh --dry-run "测试"`（A 路径）
   - `./scripts/auto-loop.sh --fix-only "#12"`（B 路径，用真实/dry issue 验证）
8. 提 PR

## 测试策略

- **Skill 本身**: 不加单元测试（行为塑造文档，遵循仓库现有 skill 规范）
- **auto-loop.sh 扩展**: 参照现有 `tests/` 模式，至少加入：
  - 参数解析测试（`--fix-only` 互斥 `--dry-run`）
  - 占位符注入测试（`{{MODE}}` / `{{TARGET_ISSUES}}` 正确填充）
- **手测**: 上方第 7 步

## 风险

1. **多 issue 单 PR 策略** 与 auto-loop.sh 现有「逐 issue SDD 修复」链路有冲突。现有 orchestrator 假设 `state.progress.issues_created` 是来源；`--fix-only` 模式需改为读 `state.target_issues`。**缓解**: orchestrator-prompt.md 加分支守卫，明确 issue 来源字段。
2. **`--fix-only "all"` 可能拉太多 issue**。**缓解**: 默认 cap 10，由 `--max-issues` 覆盖。
3. **skill 描述过长导致 Claude 不读正文**。**缓解**: 严格遵循 writing-skills CSO 原则，description 只写触发条件，不写流程摘要。

## 成功标准

- `generate-issues` skill 在用户说"分析会话提 issue"时被自动触发，并正确调用 `--dry-run`
- `fix-issues-and-pr` skill 在用户说"修 #12"时被自动触发，并正确调用 `--fix-only "#12"`
- 多 issue 修复产出单一 PR，PR body 关联所有目标 issue
- 不破坏现有 auto-loop.sh 全链路 + `--dry-run` + `--resume` 行为
