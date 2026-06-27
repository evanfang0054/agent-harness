# Pi 安装与使用

Agent Harness 作为 Pi package 分发，通过 TypeScript 扩展在 session 启动和压缩后注入 bootstrap。

## 安装

从 GitHub 仓库直接安装：

```bash
pi install git:github.com/evanfang0054/agent-harness
```

## 本地开发模式

用本地 checkout 作为临时 package 运行 Pi：

```bash
pi -e /path/to/agent-harness
```

## 工作原理

Pi 加载 Agent Harness package 后：

1. **skills 发现** — 通过 `package.json` 的 `pi.skills` 字段（指向 `./skills`）发现全部 skills
2. **扩展加载** — 通过 `pi.extensions` 字段加载 `.pi/extensions/agent-harness.ts`
3. **bootstrap 注入** — 扩展监听 5 个事件：
   - `session_start` — 标记需要注入 bootstrap
   - `session_compact` — 压缩后重新标记（关键：Pi 压缩会丢失上下文，必须重新注入）
   - `agent_end` — 单轮 agent 结束后停止注入
   - `context` — 实际注入点，检查去重标记 `BOOTSTRAP_MARKER`，构造 bootstrap message 插入到首个非 `compactionSummary` 消息之前
   - `resources_discover` — 声明 skills 目录给 Pi

bootstrap 内容是 `skills/using-agent-harness/SKILL.md` 正文 + Pi 工具映射表，以 `<EXTREMELY_IMPORTANT>` 标记包裹。

## Pi 原生 skill 系统

Pi 有原生 skills 支持，不暴露 Claude Code 的 `Skill` 工具。当 Agent Harness 指令要求调用 skill 时：
- 用 `read` 工具加载相关 `SKILL.md`，或
- 让人类显式调用 `/skill:name`

## 已知限制

Pi 核心不提供以下能力，需要可选 companion 包：

- **子 agent** — 需要 `pi-subagents` package 提供 `subagent` 工具。未安装时在当前 session 顺序执行，不要伪造 `Task` 调用。
- **任务列表** — 需要安装 todo/task 扩展。未安装时使用 plan 文件或仓库内 `TODO.md` 跟踪任务。
