# Codex 安装与使用

Agent Harness 支持 Codex App 和 Codex CLI 两种 harness，共用同一套 plugin manifest 和 SessionStart hook。

## Codex App

Agent Harness 可通过 Codex 官方插件市场获取。

1. 在 Codex App 侧边栏点击 **Plugins**
2. 在 **Coding** 区找到 `Agent Harness`
3. 点击 `Agent Harness` 旁边的 `+`，按提示完成安装

## Codex CLI

1. 打开插件搜索界面：

   ```
   /plugins
   ```

2. 搜索 Agent Harness：

   ```
   agent-harness
   ```

3. 选择 `Install Plugin`

## 工作原理

Codex 在 session 启动时执行 `.codex-plugin/plugin.json` 声明的 `hooks/hooks-codex.json`，触发 `hooks/session-start-codex` 脚本。该脚本读取 `skills/using-agent-harness/SKILL.md` 全文，以 `<EXTREMELY_IMPORTANT>` 标记注入到 SessionStart 的 `additionalContext` 字段，让模型在首轮对话前就获得 skills 系统指引。

skills 本身通过 `skills/` 目录被 Codex 直接发现，无需额外注册。

## 故障排查

### hook 没触发

检查 `hooks/hooks-codex.json` 是否被 `.codex-plugin/plugin.json` 的 `hooks` 字段正确引用：

```bash
jq -r .hooks .codex-plugin/plugin.json
# 应输出 ./hooks/hooks-codex.json
```

检查 hook 脚本路径是否存在：

```bash
ls hooks/session-start-codex hooks/run-hook.cmd
```

### Windows 下 hook 不执行

Windows 下 Codex 通过 `hooks/run-hook.cmd`（polyglot 批处理/脚本）查找并调用 Git Bash 执行 hook。请确认系统已安装 Git for Windows 或 MSYS2，`bash` 可在 PATH 中找到。

### skills 没自动触发

SessionStart hook 注入的 `using-agent-harness` skill 负责告知模型「当任务适用时主动加载相应 skill」。如果模型未触发，尝试在首条消息中明确表达任务意图（例如「帮我规划这个功能」而非「加个按钮」），或显式调用 `/skill:brainstorming`。
