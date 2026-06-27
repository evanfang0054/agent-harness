# Auto-Loop 会话筛选（`--filter`）设计

**日期：** 2026-06-25
**状态：** 已批准，待实现
**关联：** auto-loop.sh / orchestrator-prompt.md / state.sh

## 背景与动机

当前 `./scripts/auto-loop.sh` 在分析会话时是**全量扫描**——把指定范围内的所有 Claude 会话都导出、都分析。用户实际使用时往往只想聚焦某一类会话（例如"只看调用了 superpower 相关 skill 的"），但自然语言需求里的过滤意图不会被约束执行，Claude 会把全会话都盘一遍。

**用户原话：** "我指定只查看有调用【superpower相关 skill】的这种场景貌似没有帮我约束去查看，反而是全会话都盘了一遍。"

**设计目标：** 让用户通过显式 `--filter` 参数传入自然语言过滤条件，Claude 在分析阶段按条件筛选会话，只对符合的会话识别问题。

## 方案选择

经讨论排除两个方案：
- **方案 B（脚本侧 grep 预筛）**：用户过滤意图不固定，grep/正则无法覆盖自然语言语义，且 claude-code-log 导出格式不固定，实现脆弱。
- **方案 C（`--filter` + `--filter-mode` 混合）**：YAGNI，当前无人表达对 grep 模式的需求。

**采纳方案 A：** `--filter` 参数 + orchestrator-prompt 增加"会话筛选协议"。过滤发生在 Claude 分析阶段（步骤 3 之前），由 Claude 按自然语言理解执行。

**理由：**
- 过滤条件不固定，Claude 解析自然语言是其擅长的事
- 改动面最小（KISS/YAGNI）
- 向后兼容（不传 `--filter` 时行为不变）

## 设计

### 1. CLI 接口

新增参数：`--filter "<自然语言过滤条件>"`

```bash
# 用法示例
./scripts/auto-loop.sh --project <path> --filter "调用了 superpower 相关 skill" "分析问题"
./scripts/auto-loop.sh --filter "出现 hook 报错或 PreToolUse 拦截" "找问题"
./scripts/auto-loop.sh "分析会话"   # 不传 --filter，行为不变
```

**参数解析（auto-loop.sh）：**
- 新增变量 `FILTER=""`
- case 分支加 `--filter) FILTER="$2"; shift 2 ;;`
- `state_init` 调用新增第 6 个参数 `"$FILTER"`
- `--resume` 时从 state.json 读 `.filter` 字段
- `{{FILTER}}` 占位符注入 orchestrator-prompt.md

**向后兼容：** `--filter` 未传时，`{{FILTER}}` 渲染为空字符串，prompt 里会话筛选协议标注"未指定 filter，分析全部会话"。

### 2. orchestrator-prompt.md 改动

**新增章节：** `## 会话筛选协议`（插入位置：步骤 2 之后、步骤 3 之前）

```markdown
## 会话筛选协议

用户指定的过滤条件: {{FILTER}}

**判定规则：**
- 如果 {{FILTER}} 为空 → 分析所有导出的会话（默认行为）
- 如果 {{FILTER}} 非空 → **只分析符合该条件的会话**，不符合的会话直接跳过，不计入问题识别

**筛选执行步骤（在步骤 3 分析之前）：**
1. 逐个会话判断是否符合 {{FILTER}} 条件
2. 在 analysis.json 里记录 `filtered_sessions`（保留的会话列表）和
   `excluded_sessions`（排除的会话列表 + 排除原因）
3. 只对 `filtered_sessions` 识别问题

**判定示例（供参考，Claude 按自然语言理解执行）：**
- filter="调用了 superpower 相关 skill" → 会话内出现 Skill 工具调用且 skill 名匹配
  agent-harness skill 列表（brainstorming / writing-plans / subagent-driven-development /
  verification-before-completion / finishing-a-development-branch / auto-loop 等）
- filter="出现 hook 报错" → 会话内有 PreToolUse / SessionStart / Stop hook 的报错文本
- filter="会话时长 > 30 分钟" → 按 timestamp 跨度判断

**重要：**
- 如果 filter 条件模糊或无法判定，宁可保留会话（宁可多分析，不要漏掉）
- excluded_sessions 必须给出明确排除原因，便于用户审计
- 不要因为筛选而跳过 state.json 的步骤更新
```

**state.json 新增字段：**
- `.filter`（字符串，顶层）
- `.progress.filtered_sessions`（数组）
- `.progress.excluded_sessions`（数组）

### 3. auto-loop.sh 改动清单

| 位置 | 改动 |
|------|------|
| L23-L29 变量声明 | 新增 `FILTER=""` |
| L51-L61 参数解析 | 新增 `--filter) FILTER="$2"; shift 2 ;;` |
| L131 附近（resume） | `FILTER=$(state_get "$STATE_DIR" '.filter // ""')` |
| L161 state_init 调用 | 新增第 6 个参数 `"$FILTER"` |
| L211-L232 prompt 组装 | 新增 `--arg filter "$FILTER_VAL"` 和 `gsub("{{FILTER}}"; $filter)` |
| L32-L48 usage | 加 `--filter` 说明和示例 |

**scripts/lib/state.sh 改动：**
- `state_init` 函数签名从 5 参数扩到 6 参数：新增 `filter="${6:-}"`
- jq 构造的 JSON 加 `--arg filter "$filter"` 和 `filter: $filter` 字段

### 4. 测试与验证策略

**纯脚本单元测试（秒级）：**
- `state_init` 传入 filter 后，state.json 的 `.filter` 字段正确
- `--resume` 能从 state.json 读回 filter 并注入 prompt
- 不传 `--filter` 时 `{{FILTER}}` 渲染为空字符串（向后兼容）
- jq 占位符填充对含特殊字符的 filter 字符串（如双引号、反斜杠）安全

**dry-run 端到端验证：**
```bash
./scripts/auto-loop.sh --project <path> --dry-run --filter "调用了 superpower" "分析"
# 检查 runs/<run_id>/ 下的 analysis.json 是否有 filtered_sessions / excluded_sessions
# 检查 state.json 的 .filter 字段
```

**orchestrator-prompt.md 占位符验证：**
按 CLAUDE.md 的开发注意，修改后至少跑一次 `--dry-run` 验证占位符填充正确（空/非空两种情况都不残留 `{{FILTER}}` 字面量）。

**行为验证（可选，依赖 Claude API 配额）：**
跑真实 dry-run 看 Claude 是否：
- 只分析符合 filter 的会话
- 在 analysis.json 记录 excluded_sessions
- 空 filtered_sessions 时给出明确说明而非崩溃

## 非目标

- 不做脚本侧 grep 预筛（方案 B）
- 不做 `--filter-mode` 切换（方案 C）
- 不做跨多会话的 skill 行为对抗性压力测试（本次改动是脚本+prompt 层，纯脚本测试足够覆盖）

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| Claude 误解 filter 语义 | prompt 里给判定示例 + "宁可保留"原则 |
| filter 过严导致空 filtered_sessions | analysis.json 要求明确说明，不崩溃 |
| 特殊字符破坏 jq 注入 | state.sh 已用 `jq --arg` 安全注入，filter 走同样路径 |
| state.json 旧版本无 `.filter` 字段 | 所有读取用 `.filter // ""` 兜底，向后兼容 |

## 实现顺序建议

1. `scripts/lib/state.sh` 的 `state_init` 加 filter 参数
2. `auto-loop.sh` CLI 参数解析 + state_init 调用 + resume 读取
3. `auto-loop.sh` prompt 组装加 `{{FILTER}}` 占位符
4. `skills/auto-loop/orchestrator-prompt.md` 加会话筛选协议章节
5. `auto-loop.sh` usage 文档更新
6. 纯脚本单元测试
7. dry-run 端到端验证
