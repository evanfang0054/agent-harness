# 设计：将 agent-harness 重命名为 agent-harness

- 日期：2026-06-27
- 类型：refactor / rebrand
- 状态：spec（待用户复核）

## 1. 背景与目标

本仓库 fork 自 Jesse Vincent 的 [Agent Harness](https://github.com/obra/agent-harness)。经过大量自定义改动后，需将项目转变为独立项目，仅在 README 中保留对原作者的致敬，其余所有 `agent-harness` 字眼一律改为 `agent-harness`。

**目标**：

- 命名空间、目录、skill 名、插件元数据、文档中所有 `agent-harness` 字眼统一改为 `agent-harness`。
- 保留 README.md 致敬段、LICENSE 原作者署名、git 历史。
- 通过现有 plugin 基础设施测试与 JSON 合法性校验。
- 提交一次原子的 rebrand commit，并同步重命名 GitHub 远程仓库。

**非目标**：

- 不重写 skill 内容、不调整工作流语义，仅做标识符与文本替换。
- 不动 LICENSE 与 git 历史。
- 不进行任何除"重命名"以外的重构。

## 2. 范围

**全局统计**（spec 撰写时）：`grep -r agent-harness` 命中 197 个文件、1222 处。

### 2.1 必须改名

- **顶层目录**：
  - `.agent-harness/` → `.agent-harness/`
  - `docs/agent-harness/` → `docs/agent-harness/`
- **demo 子项目**（独立 monorepo，同步改名）：
  - `demo/fruit-shop/.agent-harness/` → `demo/fruit-shop/.agent-harness/`
  - `demo/fruit-shop/docs/agent-harness/` → `demo/fruit-shop/docs/agent-harness/`
  - `demo/docs/agent-harness/` → `demo/docs/agent-harness/`
- **skill 目录**：
  - `skills/using-agent-harness/` → `skills/using-agent-harness/`
  - 对应测试目录 `tests/skill-behavior/using-agent-harness/` 同步
- **skill 命名空间**（所有 SKILL.md 与跨 skill 调用）：
  - `agent-harness:using-agent-harness` → `agent-harness:using-agent-harness`
  - `agent-harness:<skill>` → `agent-harness:<skill>`
- **skill 名标识符**：`using-agent-harness` → `using-agent-harness`（YAML frontmatter `name` 字段、目录名、引用）
- **插件元数据**：
  - `.claude-plugin/plugin.json`：`name: agent-harness` → `name: agent-harness`
  - `.claude-plugin/marketplace.json`：`agent-harness-dev` → `agent-harness-dev`；其中 `name: agent-harness` → `agent-harness`
  - `package.json`：`name: agent-harness` → `agent-harness`；`description` 中 `Agent Harness` 字样替换
  - `.codex-plugin/plugin.json`、`.pi/extensions/agent-harness.ts` 同步
- **配置引用**：
  - `.claude/settings.json` / `settings.local.json.example` 中 `enabledPlugins.agent-harness@agent-harness-dev` → `agent-harness@agent-harness-dev`
- **hooks 与 scripts**：
  - `hooks/session-start`、`hooks/session-start-codex`、`hooks/stop-hook.sh` 中读取 `using-agent-harness` 的路径同步
  - `scripts/*learnings.sh`、`scripts/auto-loop.sh`、`scripts/guard-staging.sh`、`scripts/loop-detector.sh`、`scripts/trace-analyzer.sh`、`scripts/coverage-metrics.sh`、`scripts/audit-subagent.sh`、`scripts/setup-ralph-loop.sh`、`scripts/log-learning.sh` 中 `.agent-harness/` 路径引用同步
- **文档**：
  - `README.md`、`README_EN.md`：除"致敬段"外，所有 `Agent Harness` / `agent-harness` 替换
  - `RELEASE-NOTES.md`、`CLAUDE.md`、`skills/CLAUDE.md`、`tests/CLAUDE.md`、`tests/claude-code/README.md`、`docs/testing.md`、`docs/README.opencode.md`、`docs/README.codex.md`、`docs/README.pi.md`：文本替换
  - `docs/agent-harness/` 下历史 specs / plans / contracts 文档（文件名与内容）：一并改名与替换
- **skill 内部文档与子代理提示**：所有 `skills/*/SKILL.md`、`skills/*/references/*`、`skills/*/scripts/*`、`skills/brainstorming/spec-document-reviewer-prompt.md`、`skills/subagent-driven-development/references/controller-guide.md`、`skills/auto-loop/orchestrator-prompt.md` 等
- **templates**：`templates/react-typescript/README.md`
- **agents/commands**：`agents/code-reviewer.md`、`commands/help.md`
- **测试套件**：所有 `tests/**/*.{sh,mjs,txt}` 中对命名空间、目录、skill 名的引用

### 2.2 保留不动（白名单）

- `LICENSE`：原作者署名与许可证文本
- `README.md` 与 `README_EN.md` 中的"致敬段"（spec 中明确新增的一段，见 §4）
- `CLAUDE.md` 中"基于 Jesse Vincent 的原版 Agent Harness 项目"一句（作为致敬上下文）
- `.git/` 与全部 git 历史
- 二进制资产（`assets/`、`.DS_Store`）不替换文本

## 3. 命名映射规则

按优先级从高到低执行，避免误伤：

| 序号 | 原值（正则/字面） | 新值 | 适用范围 |
|---|---|---|---|
| 1 | `agent-harness:using-agent-harness` | `agent-harness:using-agent-harness` | 复合 token，最先替换 |
| 2 | `agent-harness:` | `agent-harness:` | skill 命名空间前缀 |
| 3 | `using-agent-harness` | `using-agent-harness` | skill 名标识符 |
| 4 | `.agent-harness/` | `.agent-harness/` | 顶层与 demo 隐藏目录路径 |
| 5 | `docs/agent-harness/` | `docs/agent-harness/` | 文档目录路径（含 demo） |
| 6 | `agent-harness-dev` | `agent-harness-dev` | marketplace name |
| 7 | `agent-harness@agent-harness-dev` | `agent-harness@agent-harness-dev` | settings 插件引用 |
| 8 | `Agent Harness` | `Agent Harness` | 大驼峰单词（标题、品牌） |
| 9 | `agent-harness` | `agent-harness` | 全小写单词（兜底） |

**正则原则**：使用单词边界 `\b` 防止误伤子串。序号 1-3 必须先于序号 9 执行；序号 4-5 必须先于序号 9 执行；否则 `.agent-harness/` 中的 `agent-harness` 会被规则 9 错误改写但点号 `.` 与斜杠 `/` 已被词边界处理，需显式前置。

## 4. README 致敬段

在 `README.md` 顶部（标题下方、目录之前）新增一段：

> ## 致谢 / Acknowledgements
>
> 本项目 fork 自 Jesse Vincent（[@obra](https://github.com/obra)）的 [Agent Harness](https://github.com/obra/agent-harness)，保留了其工作流理念与 skill 架构。感谢原作者的开创性工作。

该段是仓库中**唯一**保留 `Agent Harness` 字样的"现在时"位置（LICENSE 与 git 历史除外）。所有其他位置一律替换。`README_EN.md` 同步新增对应英文段。

`CLAUDE.md` 中"基于 Jesse Vincent 的原版 Agent Harness 项目"一句保留作为致敬上下文（项目说明文档的元信息）。若用户希望在 CLAUDE.md 中也彻底去除，可在实现时调整。

## 5. 实现机制

### 5.1 一次性脚本：`scripts/rebrand-to-agent-harness.sh`

**为什么用脚本**：197 文件 1222 处替换，直接 bash + sed 难以 review；脚本可重复跑、可 code review、可 `git reset` 回滚，PR diff 是脚本本身而非千行 sed 输出。

**执行流程**：

1. **前置检查**
   - `git rev-parse --is-inside-work-tree`
   - `git diff --quiet && git diff --cached --quiet`（要求 clean working tree，否则中止）
   - 当前分支可创建 `refactor/rebrand-to-agent-harness` 分支

2. **创建工作分支**：`git checkout -b refactor/rebrand-to-agent-harness`

3. **目录与文件 `git mv`**（最长路径优先，避免父目录先改导致子路径失效）：
   - `demo/fruit-shop/.agent-harness` → `demo/fruit-shop/.agent-harness`
   - `demo/fruit-shop/docs/agent-harness` → `demo/fruit-shop/docs/agent-harness`
   - `demo/docs/agent-harness` → `demo/docs/agent-harness`
   - `docs/agent-harness` → `docs/agent-harness`
   - `.agent-harness` → `.agent-harness`
   - `skills/using-agent-harness` → `skills/using-agent-harness`
   - `tests/skill-behavior/using-agent-harness` → `tests/skill-behavior/using-agent-harness`
   - `.pi/extensions/agent-harness.ts` → `.pi/extensions/agent-harness.ts`

4. **预览模式**：先以 `grep -rln` 列出待改文件清单输出到终端，提示"按 Enter 继续，Ctrl+C 中止"，确保用户对范围有最后确认机会。

5. **分层 `sed -i ''` 替换**（macOS BSD sed 语法；脚本检测平台，Linux 用 `sed -i`）：
   - 按第 §3 节的 9 条规则顺序执行
   - `find` 范围：仓库根下所有文本文件，排除 `.git/`、`LICENSE`、二进制（`.png/.jpg/.gif/.icns/.pdf/.DS_Store`）
   - README.md / README_EN.md / CLAUDE.md 在通用 sed 后，用专用补丁段恢复或保留致敬词（见 §4）

6. **README 致敬段注入**：用 `sed` 在 README.md / README_EN.md 标题下方插入第 §4 节定义的致敬段（若已存在则跳过，幂等）。

7. **JSON 合法性校验**：对 `plugin.json`、`marketplace.json`、`package.json`、`hooks.json`、`.codex-plugin/plugin.json`、`.claude/settings*.json` 运行 `jq . <file> > /dev/null`，任一失败立即中止。

8. **插件基础设施测试**：`./tests/plugin-infrastructure/run-all.sh` 必须全部通过，失败则中止并保留工作现场。

9. **残留扫描**：
   ```bash
   grep -rni 'agent-harness' \
     --exclude-dir=.git --exclude=LICENSE \
     --exclude=README.md --exclude=README_EN.md --exclude=CLAUDE.md \
     .
   ```
   预期输出为空。若 README/CLAUDE.md 命中，需人工核对是否为致敬段（预期命中）。

10. **提交**：
    ```bash
    git add -A
    git commit -m "refactor: rebrand agent-harness → agent-harness (preserve attribution in README)"
    ```
    分阶段 `git add`（先 `git mv` 产物，再 sed 产物）使 diff 更易读。

11. **脚本自删**：`git rm scripts/rebrand-to-agent-harness.sh` 并 amend，或保留脚本作为历史记录（由用户决定，默认保留以便回溯）。

### 5.2 平台兼容

- macOS（darwin，BSD sed）：`sed -i '' -e 's/.../.../'`
- Linux（GNU sed）：`sed -i -e 's/.../.../'`
- 脚本用 `uname` 检测并选择对应语法

### 5.3 风险与缓解

| 风险 | 缓解 |
|---|---|
| 误伤 `agent-harness` 子串 | 使用 `\b` 词边界；规则 1-7 先于规则 9；预览模式让用户最后确认 |
| skill 自动触发链断裂 | hooks/session-start 读取路径已纳入 sed；目录改名用 `git mv` 保留可追踪性 |
| JSON 结构破坏 | `jq .` 校验，失败即中止 |
| GitHub 远程仓库名不一致 | commit 推送后单独 `gh repo rename`，脚本只动本地 |
| upstream 同步冲突 | rebrand 后不再与 upstream 同步；如需 sync，单独处理冲突 |
| 二进制文件被 sed 破坏 | `find` 排除已知二进制扩展名 |

## 6. 验证策略

1. **plugin 基础设施测试**（秒级，必跑）：`./tests/plugin-infrastructure/run-all.sh`
2. **SessionStart 注入测试**（关键）：`tests/plugin-infrastructure/test-session-start-injection.sh` 必须验证新 skill 名与 `.agent-harness/` 路径能被 hook 正确读取
3. **JSON 合法性**：所有 `.json` 配置文件 `jq .` 通过
4. **残留扫描**：第 §5.1 第 9 步的 grep 输出为空（白名单除外）
5. **README 致敬段**：人工 review 确认保留
6. **可选**（依赖 Claude API 配额，慢）：`./tests/claude-code/run-skill-tests.sh` 验证 skill 加载与触发

## 7. 提交与远程策略

- **本地提交**：一次原子的 rebrand commit（rebrand 不拆分，否则难 review）
- **commit message**：`refactor: rebrand agent-harness → agent-harness (preserve attribution in README)`
- **推送前**：根据 CLAUDE.md「核心贡献规则」，向用户展示完整 diff 并获明确批准
- **远程仓库重命名**（推送后）：
  ```bash
  gh repo rename agent-harness -R evanfang0054/agent-harness --yes
  git remote set-url origin https://github.com/evanfang0054/agent-harness.git
  ```
  GitHub 自动建立旧 URL → 新 URL 的重定向
- **PR**：rebrand 是大改动，遵循仓库规则，需人类审查完整 diff

## 8. 实施步骤概览

1. 创建工作分支 `refactor/rebrand-to-agent-harness`
2. 编写 `scripts/rebrand-to-agent-harness.sh`
3. 在干净 working tree 上执行脚本（预览 → 确认 → 写入）
4. 跑 `./tests/plugin-infrastructure/run-all.sh`
5. 跑 JSON `jq .` 校验
6. 残留扫描
7. 人工 review README 致敬段
8. 向用户展示 diff，获批准
9. 一次 commit
10. 推送 + `gh repo rename` + 更新 remote URL

## 9. 开放问题

无。所有命名、范围、保留项、实现方式、提交策略均已与用户确认。
