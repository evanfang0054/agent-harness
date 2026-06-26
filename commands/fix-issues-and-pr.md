---
description: 拉取 GitHub issue 并修复，提 PR（封装 auto-loop.sh --fix-only）
---

用户想拉取已存在的 GitHub issues 并修复，最后提一个 PR。参数：$ARGUMENTS（issue 列表如 "#12,#15" 或 "all"）

调用 `fix-issues-and-pr` skill 处理。skill 会把 issue 列表映射到 `scripts/auto-loop.sh --fix-only` 参数。
