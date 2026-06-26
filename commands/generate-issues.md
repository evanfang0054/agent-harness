---
description: 只生成 issues，不修复（封装 auto-loop.sh --dry-run）
---

用户想分析会话并提交 GitHub issues，但不修复。参数：$ARGUMENTS

调用 `generate-issues` skill 处理。skill 会把用户的自然语言参数映射到 `scripts/auto-loop.sh --dry-run` 的 CLI 参数。
