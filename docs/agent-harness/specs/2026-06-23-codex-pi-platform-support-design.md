# Codex + Pi 平台支持补全设计

- **日期**: 2026-06-23
- **作者**: evanfang（fork 维护者）
- **状态**: 草案
- **关联上游**: [obra/agent-harness](https://github.com/obra/agent-harness) @ v6.0.3

## 1. 背景与目标

本仓库是 `obra/agent-harness` 的 fork，当前版本 `5.0.21-beta.5`。上游已支持 11 个 coding agent harness，本 fork 当前仅完整支持 Claude Code 与 Cursor，Codex 仅部分支持（有 hooks 但缺 manifest 和测试），Pi 完全缺失。

**目标**：补全 Codex 和 Pi 两个平台的运行时支持，使本 fork 在这两个 harness 上具备与上游一致的 skill 自动加载和 bootstrap 注入能力。

**不在范围内**：
- `.cursor-plugin/` / `.kimi-plugin/` / `.opencode/` / `tests/antigravity` / `tests/kimi` / `tests/hooks` / `tests/shell-lint`（这些是其他平台或非必需测试，本次不补）
- `gemini-extension.json`（Gemini 已有独立的 extension 机制，且无 version 字段需要同步）
- 版本号 bump（用户明确要求保持 `5.0.21-beta.5` 不动）

## 2. 三不变量架构（来自上游 porting-to-a-new-harness.md）

Agent Harness 的跨平台支持遵循三条不变量，本次实现严格遵守：

1. **Skills 是平台无关的源真相** — `skills/` 目录内容对所有平台一致，Pi 和 Codex 复用同一份 `SKILL.md`，不做平台特定分支。
2. **Tool mapping 是平台特定的翻译层** — 每个平台需要一个 `skills/using-agent-harness/references/<harness>-tools.md` 文件，把 skill 中的「动作词汇」（read a file / dispatch a subagent 等）映射到该平台的真实工具名。
3. **Bootstrap 是平台特定的注入器** — 每个平台在 session 启动时需要把 `skills/using-agent-harness/SKILL.md` 全文注入模型上下文，并标注 `<EXTREMELY_IMPORTANT>`。

Codex 通过 shell hook 注入，Pi 通过 TypeScript extension 注入——两种机制都满足不变量 3，只是触发方式不同。

## 3. 文件清单与变更范围

### 3.1 新增文件

| 路径 | 来源 | 说明 |
|---|---|---|
| `.codex-plugin/plugin.json` | 参考上游重写，中文 description | Codex 插件 manifest，声明 skills 路径和 hooks 入口 |
| `.pi/extensions/agent-harness.ts` | 参考上游重写 | Pi 扩展，监听 `session_start` / `session_compact` / `context` 事件注入 bootstrap |
| `assets/app-icon.png` | 上游二进制资源 | Codex App 展示图标 |
| `assets/agent-harness-small.svg` | 上游二进制资源 | Codex App 小图标 |
| `skills/using-agent-harness/references/pi-tools.md` | 参考上游重写，中文 | Pi 平台工具映射表 |
| `docs/README.codex.md` | 参考上游重写，中文 | Codex 安装与使用文档 |
| `docs/README.pi.md` | 参考上游重写，中文 | Pi 安装与使用文档 |
| `tests/pi/test-pi-extension.mjs` | 参考上游重写 | Pi 扩展单元测试（纯 JS，无外部依赖） |
| `tests/codex-plugin-sync/test-sync-to-codex-plugin.sh` | 参考上游重写 | Codex 插件同步测试 |

### 3.2 修改文件

| 路径 | 改动 |
|---|---|
| `package.json` | 新增 `description`、`main`、`keywords`（含 `pi-package`）、顶层 `pi` 字段（声明 extensions 和 skills 路径） |
| `.version-bump.json` | `files` 数组新增 `{ "path": ".codex-plugin/plugin.json", "field": "version" }` |
| `README.md` | 平台支持矩阵补全 Codex 和 Pi 条目，附安装命令 |

### 3.3 不修改的文件

- `scripts/bump-version.sh` — 已是数据驱动（从 `.version-bump.json` 读取清单），无需改动
- `hooks/hooks-codex.json` / `hooks/session-start-codex` — Codex hook 机制已存在，本次只补 manifest 让它能被 Codex 发现
- `hooks/session-start` — 主 session-start 脚本，已有平台分支逻辑，本次不动
- `skills/using-agent-harness/SKILL.md` — 平台无关，不动
- `CLAUDE.md` / `AGENTS.md` — 项目级指令，不动
- `CODEX.md` / `PI.md` — **不新增**。Codex 和 Pi 都通过 plugin manifest 而非项目根指令文件发现 skills，上游也没有这两个文件

## 4. Pi 扩展详细设计

### 4.1 文件：`.pi/extensions/agent-harness.ts`

参考上游实现，保留其事件驱动架构。核心逻辑：

```typescript
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const EXTREMELY_IMPORTANT_MARKER = "<EXTREMELY_IMPORTANT>";
const BOOTSTRAP_MARKER = "agent-harness:using-agent-harness bootstrap for pi";

export default function superpowersPiExtension(pi: ExtensionAPI) {
  let injectBootstrap = true;
  // ... 事件监听
}
```

**事件契约**：
- `resources_discover` — 声明 `skillPaths`，让 Pi 发现 `skills/` 目录
- `session_start` — 标记需要注入 bootstrap
- `session_compact` — 压缩后重新标记（关键：Pi 压缩会丢失上下文，必须重新注入）
- `agent_end` — 单轮 agent 结束后停止注入（避免重复）
- `context` — 实际注入点，检查标记、检查是否已注入（用 `BOOTSTRAP_MARKER` 去重），构造 bootstrap message 插入到首个非 compactionSummary 消息之前

**Bootstrap 内容构造**：
1. 读取 `skills/using-agent-harness/SKILL.md`
2. 剥离 YAML frontmatter
3. 拼接：`<EXTREMELY_IMPORTANT>` + `BOOTSTRAP_MARKER` + 引导语 + SKILL 正文 + `piToolMapping()` + `</EXTREMELY_IMPORTANT>`
4. 缓存到模块级变量 `cachedBootstrap`，避免每次 context 事件重读文件

**依赖处理**：保留 `import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"`（type-only import），不在 fork 的 `package.json` 里声明 `dependencies` 或 `devDependencies`——该类型由 Pi 运行时提供，fork 不做本地 tsc 类型检查。如果用户本地要类型检查，自行 `npm install @earendil-works/pi-coding-agent`。

**去重逻辑**：`messageContainsBootstrap()` 检查 message content（支持 string 和 array of content parts 两种格式）是否已包含 `BOOTSTRAP_MARKER`，避免压缩后在已有 bootstrap 的历史里重复插入。

**插入位置**：`firstNonCompactionSummaryIndex()` 跳过开头的 `compactionSummary` 角色 message，把 bootstrap 插到真实对话开头之前。

### 4.2 文件：`package.json` 的 `pi` 字段

```json
{
  "name": "agent-harness",
  "description": "Agent Harness skills and runtime bootstrap for coding agents",
  "type": "module",
  "scripts": { "release": "./scripts/bump-version.sh" },
  "keywords": ["pi-package", "skills", "tdd", "debugging", "collaboration", "workflow"],
  "pi": {
    "extensions": ["./.pi/extensions/agent-harness.ts"],
    "skills": ["./skills"]
  }
}
```

注意：`main` 字段上游指向 `.opencode/plugins/agent-harness.js`，但本 fork 没有 `.opencode/` 目录。由于 Pi 通过 `pi.extensions` 字段发现扩展而非 `main`，保留该字段不会影响 Pi 运行，但语义上不正确。**决策：fork 不设 `main` 字段**（省略），避免指向不存在的文件。`type: "module"` 保留，因为 `.pi/extensions/agent-harness.ts` 使用 ESM 语法。

### 4.3 文件：`skills/using-agent-harness/references/pi-tools.md`

中文版工具映射表，覆盖以下动作：
- 调用 skill → Pi 原生 skill 系统（`read` 加载 `SKILL.md` 或人类 `/skill:name`）
- 读写编辑文件 → `read` / `write` / `edit`
- 运行 shell → `bash`
- 搜索内容 → `grep`（可用时）或 `bash` 配合 `rg`/`grep`
- 按名查找文件 → `find` 或 `bash` 配合 shell glob
- 列目录 → `ls` 或 `bash`
- 分发子 agent → `pi-subagents` 包提供的 `subagent` 工具（可选）
- 任务跟踪 → 已安装的 todo/task 工具，否则写入 plan 文件或 `TODO.md`

明确说明：Pi 没有标准 subagent 工具和 task-list 工具，不要伪造 `Task` 调用；缺少能力时在当前 session 内顺序执行或说明缺失。

## 5. Codex manifest 详细设计

### 5.1 文件：`.codex-plugin/plugin.json`

```json
{
  "name": "agent-harness",
  "version": "5.0.21-beta.5",
  "description": "为 coding agent 提供的技能框架与软件开发方法论：规划、TDD、调试、协作工作流",
  "author": { "name": "evanfang" },
  "homepage": "https://github.com/evanfang/agent-harness",
  "repository": "https://github.com/evanfang/agent-harness",
  "license": "MIT",
  "keywords": ["brainstorming", "skills", "planning", "tdd", "debugging", "code-review", "workflow"],
  "skills": "./skills/",
  "hooks": "./hooks/hooks-codex.json",
  "interface": {
    "displayName": "Agent Harness",
    "shortDescription": "规划、TDD、调试、交付工作流",
    "longDescription": "...",
    "developerName": "evanfang",
    "category": "Coding",
    "capabilities": ["Interactive", "Read", "Write"],
    "defaultPrompt": ["我有个想构建的东西的想法。", "让我们给这个项目加个功能。"],
    "websiteURL": "https://github.com/evanfang/agent-harness",
    "composerIcon": "./assets/agent-harness-small.svg",
    "logo": "./assets/app-icon.png",
    "screenshots": []
  }
}
```

**与上游差异**：
- `version` 用 fork 当前版本 `5.0.21-beta.5`
- `author` 改为 fork 维护者
- `homepage` / `repository` / `websiteURL` 指向 fork 仓库
- `description` / `shortDescription` / `longDescription` / `defaultPrompt` 用中文
- 结构（字段名、`skills` 路径、`hooks` 指向 `hooks-codex.json`、`interface` 块）与上游一致

### 5.2 Codex 的 hook 机制复用

`hooks/hooks-codex.json` 和 `hooks/session-start-codex` 在本 fork 已存在，本次不修改。Codex manifest 通过 `"hooks": "./hooks/hooks-codex.json"` 引用它们，完成 bootstrap 注入。

### 5.3 Codex App 和 Codex CLI 共用同一套 hook

上游 README 把 Codex App 和 Codex CLI 分开列出，但它们都通过 `.codex-plugin/plugin.json` + `hooks/hooks-codex.json` 工作，App 通过 marketplace 安装、CLI 通过 `/plugins` 安装，底层机制一致。本设计不为 CLI 单独建一套 hooks。

## 6. 资源文件

### 6.1 `assets/app-icon.png` 和 `assets/agent-harness-small.svg`

从上游拷贝二进制资源（这些是图标，非代码），供 `.codex-plugin/plugin.json` 的 `interface.composerIcon` 和 `interface.logo` 引用。不做修改。

## 7. 测试设计

### 7.1 `tests/pi/test-pi-extension.mjs`

参考上游测试，纯 Node.js（`.mjs` 扩展名确保 ESM），**不依赖 `@earendil-works/pi-coding-agent`**——测试用 mock ExtensionAPI：

- **mock ExtensionAPI**：实现 `on(event, handler)` 把 handler 存入 Map，提供 `emit(event, payload)` 触发
- **mock `readFileSync`**：用 `import.meta` 路径解析 + 手动注入 fake skill 内容，或用 monkey-patch
- **断言用例**：
  1. `resources_discover` 返回正确的 `skillPaths`（指向真实 `skills/` 目录）
  2. `session_start` 后触发 `context`，返回的 messages 数组包含 bootstrap message
  3. bootstrap message 的 text 包含 `<EXTREMELY_IMPORTANT>` 和 `using-agent-harness` 内容
  4. `session_compact` 后再次触发 `context`，重新注入 bootstrap
  5. 连续两次 `context` 事件不会重复注入（`BOOTSTRAP_MARKER` 去重生效）
  6. `agent_end` 后触发 `context` 不注入
  7. 当 messages 开头是 `compactionSummary` 时，bootstrap 插在其后

测试入口：`node tests/pi/test-pi-extension.mjs`，无外部依赖，退出码 0 表示通过。本 fork 没有顶层 `npm test`，该测试通过直接运行 node 脚本或后续集成到测试 runner。

### 7.2 `tests/codex-plugin-sync/test-sync-to-codex-plugin.sh`

参考上游测试，验证 `.codex-plugin/plugin.json` 与仓库其他元数据的一致性：
- `plugin.json` 的 `skills` 字段指向存在的目录
- `plugin.json` 的 `hooks` 字段指向存在的文件
- `plugin.json` 引用的 `assets/` 资源都存在
- `plugin.json` 的 `version` 与 `package.json` 的 `version` 一致（防漂移）

测试入口：`bash tests/codex-plugin-sync/test-sync-to-codex-plugin.sh`，纯 bash + jq，退出码 0 表示通过。

## 8. 文档变更

### 8.1 `docs/README.codex.md`（新增，中文）

包含：
- Codex App 安装步骤（通过 marketplace）
- Codex CLI 安装步骤（`/plugins`）
- 工作原理简介（SessionStart hook 注入 bootstrap）
- 故障排查（hook 不触发时的检查项）

### 8.2 `docs/README.pi.md`（新增，中文）

包含：
- `pi install git:github.com/evanfang/agent-harness` 安装
- `pi -e /path/to/agent-harness` 本地开发模式
- Pi 扩展工作原理（事件驱动 bootstrap 注入，压缩后重注入）
- Pi 原生 skill 系统说明
- 已知限制（subagent 和 task-list 需要可选 companion 包）

### 8.3 `README.md`（修改）

平台支持矩阵新增 Codex（App + CLI）和 Pi 条目，附各自安装命令。保留 fork 现有的中文风格和结构。

## 9. `.version-bump.json` 变更

`files` 数组新增一行：

```json
{ "path": ".codex-plugin/plugin.json", "field": "version" }
```

Pi 扩展走 `package.json` 的 `pi` 字段，无独立 version 字段，**不加入** `.version-bump.json`。

`scripts/bump-version.sh` 无需修改——它从 `.version-bump.json` 数据驱动读取文件清单。

## 10. 验收标准

实现完成后，以下条件全部成立：

1. `ls .codex-plugin/plugin.json` 存在且 `jq .version .codex-plugin/plugin.json` 输出 `5.0.21-beta.5`
2. `ls .pi/extensions/agent-harness.ts` 存在，`node --check` 语法正确（注：type-only import 不报错）
3. `node tests/pi/test-pi-extension.mjs` 退出码 0
4. `bash tests/codex-plugin-sync/test-sync-to-codex-plugin.sh` 退出码 0
5. `jq -r '.files[].path' .version-bump.json` 包含 `.codex-plugin/plugin.json`
6. `jq -r '.pi.extensions[0]' package.json` 输出 `./.pi/extensions/agent-harness.ts`
7. `jq -r '.keywords[]' package.json` 包含 `pi-package`
8. `ls assets/app-icon.png assets/agent-harness-small.svg` 都存在
9. `ls skills/using-agent-harness/references/pi-tools.md docs/README.codex.md docs/README.pi.md` 都存在
10. `./scripts/bump-version.sh --check` 输出所有已声明文件版本一致（不漂移）
11. `README.md` 平台矩阵包含 Codex 和 Pi

## 11. 风险与回滚

**风险**：
- Pi 的 `@earendil-works/pi-coding-agent` 类型包版本演进可能导致 `ExtensionAPI` 接口变化。**缓解**：type-only import，运行时由 Pi 提供；上游锁定特定版本，本 fork 跟随上游。
- Codex marketplace 审核要求可能与本 fork 的中文描述冲突。**缓解**：description 字段保留英文 fallback 或同时提供中英双语。

**回滚**：本次改动全部是新增文件或新增字段，无破坏性修改。回滚等于删除新增文件 + 还原 `package.json` / `.version-bump.json` / `README.md` 三个文件的新增部分。`git revert` 单个 commit 即可。
