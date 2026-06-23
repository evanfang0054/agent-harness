# Sprint Contract: Codex + Pi 平台支持补全

## Definition of Done

- [ ] `.codex-plugin/plugin.json` 存在，`jq -r .version .codex-plugin/plugin.json` 输出 `5.0.21-beta.5`
- [ ] `.codex-plugin/plugin.json` 的 `skills` 字段 = `./skills/`，`hooks` 字段 = `./hooks/hooks-codex.json`（与上游字段名和路径一致）
- [ ] `.codex-plugin/plugin.json` 引用的 `assets/superpowers-small.svg` 和 `assets/app-icon.png` 都实际存在
- [ ] `.pi/extensions/superpowers.ts` 存在，`node --check .pi/extensions/superpowers.ts` 退出码 0（注：`--check` 不解析 import，仅语法）
- [ ] `.pi/extensions/superpowers.ts` 监听 5 个事件：`resources_discover`、`session_start`、`session_compact`、`agent_end`、`context`（逐字比对事件名）
- [ ] `.pi/extensions/superpowers.ts` 含 `BOOTSTRAP_MARKER` 和 `EXTREMELY_IMPORTANT_MARKER` 常量
- [ ] `.pi/extensions/superpowers.ts` 保留 `import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"`（type-only）
- [ ] `package.json` 顶层含 `pi.extensions: ["./.pi/extensions/superpowers.ts"]` 和 `pi.skills: ["./skills"]`
- [ ] `package.json` 的 `keywords` 数组含 `pi-package`
- [ ] `package.json` 不含 `main` 字段（因 fork 无 `.opencode/` 目录，避免指向不存在文件）
- [ ] `skills/using-superpowers/references/pi-tools.md` 存在，含「调用 skill」「读写编辑文件」「运行 shell」「分发子 agent」「任务跟踪」五类映射
- [ ] `docs/README.codex.md` 存在，含 Codex App 和 Codex CLI 两种安装方式
- [ ] `docs/README.pi.md` 存在，含 `pi install` 和 `pi -e` 两种安装方式
- [ ] `tests/pi/test-pi-extension.mjs` 存在，`node tests/pi/test-pi-extension.mjs` 退出码 0
- [ ] `tests/codex-plugin-sync/test-sync-to-codex-plugin.sh` 存在，`bash tests/codex-plugin-sync/test-sync-to-codex-plugin.sh` 退出码 0
- [ ] `.version-bump.json` 的 `files` 数组含 `{ "path": ".codex-plugin/plugin.json", "field": "version" }`
- [ ] `./scripts/bump-version.sh --check` 输出 "All declared files are in sync"，无漂移
- [ ] `README.md` 平台支持矩阵含 Codex（App + CLI）和 Pi 两个条目

## Boundary Conditions

- Must support: Codex App 和 Codex CLI 通过同一套 `.codex-plugin/plugin.json` + `hooks/hooks-codex.json` 发现 skills 并注入 bootstrap
- Must support: Pi 通过 `.pi/extensions/superpowers.ts` 在 session 启动和压缩后注入 bootstrap
- Must not break: 现有 Claude Code、Cursor、Copilot CLI、OpenCode 的 hook 机制（不改 `hooks/hooks.json`、`hooks/hooks-cursor.json`、`hooks/session-start`）
- Must not break: 现有 `scripts/bump-version.sh`（数据驱动，仅靠 `.version-bump.json` 新增条目生效）
- Must not break: 版本号保持 `5.0.21-beta.5` 不变（不触发 bump）
- Constraint: 所有新增文档用中文（与 fork 风格一致）
- Constraint: `bump-version.sh` 不改动（已验证数据驱动）

## Acceptance Criteria

- Computational: §Definition of Done 全部 17 条 yes/no 可判定
- Computational: `node tests/pi/test-pi-extension.mjs` 退出码 0
- Computational: `bash tests/codex-plugin-sync/test-sync-to-codex-plugin.sh` 退出码 0
- Computational: `./scripts/bump-version.sh --check` 退出码 0（无漂移）
- Computational: `jq -r '.files[].path' .version-bump.json | grep codex-plugin` 命中
- Inferential: 人工 diff 审查 `.pi/extensions/superpowers.ts` 是否保留了上游的事件契约（5 个事件 + 去重 + 插入位置）
- Inferential: 人工审查 `pi-tools.md` 的工具映射是否覆盖 skill 中出现的所有动作词汇
- Inferential: 人工审查 Codex manifest 的 `interface` 块字段是否与上游结构一致（仅值本地化）

## Negotiation Record

- Generator Round 1：列出 11 条验收（manifest 存在、扩展存在、两测试通过、version-bump 更新、package.json 字段、assets 存在、docs 存在、README 更新）
- Evaluator Round 1：挑战——DoD 不可证伪（"存在"太弱，需具体字段值）；未声明保留 type-only import；未声明 5 个事件名；未约束不改 bump-version.sh；未排除 main 字段
- Generator Round 2：每条改为具体 `jq` / `grep` / `node --check` 可判命令；补 5 个事件名逐字比对；补 `main` 字段必须缺失；补 boundary「bump-version.sh 不改」
- Evaluator Round 2：接受，17 条 DoD 覆盖结构/内容/功能/负面四维，全部 yes/no 可判

## Out of Scope

- `.cursor-plugin/` / `.kimi-plugin/` / `.opencode/` / `gemini-extension.json`（其他平台，本次不补）
- `tests/antigravity` / `tests/kimi` / `tests/hooks` / `tests/shell-lint`（非本次平台的测试）
- 版本号 bump（用户明确要求保持不动）
- 上游 PR 同步（fork 定制）
- Codex marketplace 发布（用户自行处理）
- Pi companion 包（`pi-subagents`、task-list 工具，属于 Pi 生态可选包）
