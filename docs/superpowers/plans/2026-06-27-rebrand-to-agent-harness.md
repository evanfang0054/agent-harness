# Superpowers → Agent Harness 重命名实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将仓库内所有 `superpowers` 字眼（命名空间、目录、skill 名、插件元数据、文档）重命名为 `agent-harness`，仅在 README 保留对原作者 Jesse Vincent 的致敬段。

**Architecture:** 通过一次性脚本 `scripts/rebrand-to-agent-harness.sh` 顺序执行：①`git mv` 重命名目录/文件保留历史；②分层 `sed` 替换避免误伤（复合 token → 命名空间 → 路径字面量 → 单词）；③JSON `jq` 校验；④plugin 基础设施测试；⑤残留扫描。脚本一次跑完产出原子 rebrand commit。

**Tech Stack:** Bash（macOS BSD sed / Linux GNU sed 双兼容）、`git mv`、`jq`、`grep`、`find`。

**Spec:** `docs/superpowers/specs/2026-06-27-rebrand-to-agent-harness-design.md`

**Commit 策略:** 末尾一次总 commit（rebrand 是原子操作）。

---

## 文件结构

本任务不创建新代码文件（除一次性脚本），改动是对现有 ~197 个文件的标识符与文本替换。涉及的"结构性"文件：

- **新建**：`scripts/rebrand-to-agent-harness.sh`（一次性 rebrand 脚本，跑完保留以供回溯）
- **目录 `git mv`**（共 8 处，最长路径优先）：
  - `.superpowers/` → `.agent-harness/`
  - `docs/superpowers/` → `docs/agent-harness/`
  - `demo/fruit-shop/.superpowers/` → `demo/fruit-shop/.agent-harness/`
  - `demo/fruit-shop/docs/superpowers/` → `demo/fruit-shop/docs/agent-harness/`
  - `demo/docs/superpowers/` → `demo/docs/agent-harness/`
  - `skills/using-superpowers/` → `skills/using-agent-harness/`
  - `tests/skill-behavior/using-superpowers/` → `tests/skill-behavior/using-agent-harness/`
  - `.pi/extensions/superpowers.ts` → `.pi/extensions/agent-harness.ts`
- **sed 文本替换涉及的关键文件**（不一一列举，由脚本统一处理）：
  - `.claude-plugin/plugin.json`、`marketplace.json`
  - `.codex-plugin/plugin.json`
  - `.pi/extensions/agent-harness.ts`（重命名后路径）
  - `.claude/settings.json`、`settings.local.json.example`（如存在）
  - `package.json`
  - `hooks/hooks.json`、`hooks/hooks-cursor.json`、`hooks/hooks-codex.json`（如存在）
  - `hooks/session-start`、`hooks/session-start-codex`、`hooks/stop-hook.sh`
  - `scripts/*.sh`、`scripts/lib/*.sh`
  - `CLAUDE.md`、`skills/CLAUDE.md`、`tests/CLAUDE.md`、`tests/claude-code/README.md`
  - `README.md`、`README_EN.md`、`RELEASE-NOTES.md`
  - `docs/`、`commands/`、`agents/`、`skills/`、`templates/`、`tests/` 下所有 `.md` / `.sh` / `.txt` / `.mjs` / `.ts`

---

## 命名映射规则（脚本核心逻辑，按优先级从高到低）

| 序号 | 原值 | 新值 | 备注 |
|---|---|---|---|
| 1 | `superpowers:using-superpowers` | `agent-harness:using-agent-harness` | 复合 token，最先替换 |
| 2 | `superpowers:` | `agent-harness:` | skill 命名空间前缀 |
| 3 | `using-superpowers` | `using-agent-harness` | skill 名标识符 |
| 4 | `.superpowers/` | `.agent-harness/` | 顶层与 demo 隐藏目录路径 |
| 5 | `docs/superpowers/` | `docs/agent-harness/` | 文档目录路径（含 demo） |
| 6 | `superpowers-dev` | `agent-harness-dev` | marketplace name |
| 7 | `superpowers@superpowers-dev` | `agent-harness@agent-harness-dev` | settings 插件引用 |
| 8 | `Superpowers` | `Agent Harness` | 大驼峰单词 |
| 9 | `superpowers` | `agent-harness` | 全小写兜底 |

**白名单**（sed 全程跳过）：`.git/`、`LICENSE`、二进制（`.png/.jpg/.jpeg/.gif/.icns/.pdf/.DS_Store/.svg/.ai`）。

**特殊保留**：`README.md` / `README_EN.md` / `CLAUDE.md` 中的致敬段由脚本在通用 sed 后用专用补丁段注入或保留。

---

## Task 1: 创建工作分支

**Files:** 无（git 操作）

- [ ] **Step 1.1: 确认 working tree clean**

Run:
```bash
git status --porcelain
```
Expected: 空输出。若非空，先 commit 或 stash 现有改动。

- [ ] **Step 1.2: 创建并切换到 rebrand 分支**

Run:
```bash
git checkout -b refactor/rebrand-to-agent-harness
```
Expected: `Switched to a new branch 'refactor/rebrand-to-agent-harness'`

---

## Task 2: 编写 rebrand 脚本框架与安全检查

**Files:**
- Create: `scripts/rebrand-to-agent-harness.sh`

- [ ] **Step 2.1: 编写脚本头部与安全检查**

将以下内容写入 `scripts/rebrand-to-agent-harness.sh`：

```bash
#!/usr/bin/env bash
# Rebrand: superpowers → agent-harness
# Spec: docs/agent-harness/specs/2026-06-27-rebrand-to-agent-harness-design.md
# (注：脚本编写时 docs/superpowers 尚未重命名，运行时第3阶段会同步改名)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# --- 平台检测：macOS BSD sed vs Linux GNU sed ---
if [[ "$(uname)" == "Darwin" ]]; then
    SED_INPLACE=(-i '')
else
    SED_INPLACE=(-i)
fi

# --- 安全检查：working tree 必须 clean ---
if [[ -n "$(git status --porcelain)" ]]; then
    echo "❌ Working tree not clean. Commit or stash first." >&2
    git status --short >&2
    exit 1
fi

# --- 安全检查：必须在仓库根 ---
if [[ ! -f "package.json" ]] || [[ ! -d ".claude-plugin" ]]; then
    echo "❌ Not at repo root (no package.json / .claude-plugin)." >&2
    exit 1
fi

echo "✓ 安全检查通过"
```

- [ ] **Step 2.2: 赋予可执行权限**

Run:
```bash
chmod +x scripts/rebrand-to-agent-harness.sh
```
Expected: 无输出，`ls -la scripts/rebrand-to-agent-harness.sh` 显示 `rwxr-xr-x`

---

## Task 3: 脚本阶段 1 — git mv 目录重命名

**Files:** Modify: `scripts/rebrand-to-agent-harness.sh`（追加 git mv 阶段）

- [ ] **Step 3.1: 在脚本末尾追加 git mv 阶段**

在 `scripts/rebrand-to-agent-harness.sh` 末尾追加（最长路径优先，避免父目录先改失效）：

```bash

# --- 阶段 1：git mv 目录与文件（最长路径优先） ---
echo "▶ 阶段 1/5：git mv 目录与文件重命名"

# demo 子项目（先改，避免主项目 docs/superpowers 先改后路径歧义）
[[ -d "demo/fruit-shop/.superpowers" ]] && git mv "demo/fruit-shop/.superpowers" "demo/fruit-shop/.agent-harness"
[[ -d "demo/fruit-shop/docs/superpowers" ]] && git mv "demo/fruit-shop/docs/superpowers" "demo/fruit-shop/docs/agent-harness"
[[ -d "demo/docs/superpowers" ]] && git mv "demo/docs/superpowers" "demo/docs/agent-harness"

# 主项目顶层目录
[[ -d "docs/superpowers" ]] && git mv "docs/superpowers" "docs/agent-harness"
[[ -d ".superpowers" ]] && git mv ".superpowers" ".agent-harness"

# skill 目录与测试目录
[[ -d "skills/using-superpowers" ]] && git mv "skills/using-superpowers" "skills/using-agent-harness"
[[ -d "tests/skill-behavior/using-superpowers" ]] && git mv "tests/skill-behavior/using-superpowers" "tests/skill-behavior/using-agent-harness"

# pi 扩展文件
[[ -f ".pi/extensions/superpowers.ts" ]] && git mv ".pi/extensions/superpowers.ts" ".pi/extensions/agent-harness.ts"

echo "✓ 阶段 1 完成（目录/文件重命名）"
```

- [ ] **Step 3.2: 语法检查**

Run:
```bash
bash -n scripts/rebrand-to-agent-harness.sh
```
Expected: 无输出（语法 OK）

---

## Task 4: 脚本阶段 2 — 预览与分层 sed 替换

**Files:** Modify: `scripts/rebrand-to-agent-harness.sh`（追加 sed 阶段）

- [ ] **Step 4.1: 在脚本末尾追加预览模式**

```bash

# --- 阶段 2a：预览待改文件清单 ---
echo "▶ 阶段 2/5：预览待改文件清单"

# 收集所有文本文件（排除 .git、LICENSE、二进制）
FILES_TO_PROCESS=$(find . \
    -type f \
    -not -path './.git/*' \
    -not -name 'LICENSE' \
    -not -name '.DS_Store' \
    -not -name '*.png' -not -name '*.jpg' -not -name '*.jpeg' \
    -not -name '*.gif' -not -name '*.icns' -not -name '*.pdf' \
    -not -name '*.svg' -not -name '*.ai' \
    -not -name 'rebrand-to-agent-harness.sh' \
    | sort)

# 统计含 superpowers 的文件（不区分大小写）
AFFECTED=$(echo "$FILES_TO_PROCESS" | xargs grep -li 'superpowers' 2>/dev/null | wc -l | tr -d ' ')
echo "  将处理 $AFFECTED 个文件"
echo "$FILES_TO_PROCESS" | xargs grep -li 'superpowers' 2>/dev/null | head -30
echo "..."
echo ""
read -r -p "确认执行 sed 替换？(Enter 继续 / Ctrl+C 中止): " _CONFIRM
```

- [ ] **Step 4.2: 追加分层 sed 替换逻辑**

紧接追加：

```bash

# --- 阶段 2b：分层 sed 替换（按优先级从高到低） ---
echo "▶ 阶段 2/5：执行分层 sed 替换"

# 将文件列表写入临时文件，供 xargs 分批处理
TMP_FILELIST="$(mktemp)"
echo "$FILES_TO_PROCESS" > "$TMP_FILELIST"

apply_sed() {
    local pattern="$1"
    local replacement="$2"
    local label="$3"
    echo "  ↳ $label"
    xargs -a "$TMP_FILELIST" grep -li "$pattern" 2>/dev/null | while read -r f; do
        # 跳过 README.md / README_EN.md / CLAUDE.md（阶段 4 单独处理致敬段）
        case "$f" in
            ./README.md|./README_EN.md|./CLAUDE.md) continue ;;
        esac
        sed "${SED_INPLACE[@]}" -e "s|${pattern}|${replacement}|g" "$f"
    done
}

# 规则 1（复合 token）
apply_sed 'superpowers:using-superpowers' 'agent-harness:using-agent-harness' '规则1: 复合 token'

# 规则 2（命名空间）
apply_sed 'superpowers:' 'agent-harness:' '规则2: 命名空间 superpowers: → agent-harness:'

# 规则 3（skill 名标识符）
apply_sed 'using-superpowers' 'using-agent-harness' '规则3: skill 名 using-superpowers'

# 规则 4（隐藏目录路径）
apply_sed '\.superpowers/' '.agent-harness/' '规则4: 路径 .superpowers/'

# 规则 5（docs 路径）
apply_sed 'docs/superpowers/' 'docs/agent-harness/' '规则5: 路径 docs/superpowers/'

# 规则 6（marketplace name）
apply_sed 'superpowers-dev' 'agent-harness-dev' '规则6: marketplace name superpowers-dev'

# 规则 7（settings 插件引用，已被规则 6 覆盖一半，此处显式补全）
apply_sed 'superpowers@agent-harness-dev' 'agent-harness@agent-harness-dev' '规则7: settings 插件引用'

# 规则 8（大驼峰单词，用词边界）
xargs -a "$TMP_FILELIST" grep -liE '\bSuperpowers\b' 2>/dev/null | while read -r f; do
    case "$f" in
        ./README.md|./README_EN.md|./CLAUDE.md) continue ;;
    esac
    sed "${SED_INPLACE[@]}" -E 's/\bSuperpowers\b/Agent Harness/g' "$f"
done

# 规则 9（全小写兜底，用词边界）
xargs -a "$TMP_FILELIST" grep -liE '\bsuperpowers\b' 2>/dev/null | while read -r f; do
    case "$f" in
        ./README.md|./README_EN.md|./CLAUDE.md) continue ;;
    esac
    sed "${SED_INPLACE[@]}" -E 's/\bsuperpowers\b/agent-harness/g' "$f"
done

rm -f "$TMP_FILELIST"
echo "✓ 阶段 2 完成（sed 替换）"
```

- [ ] **Step 4.3: 语法检查**

Run:
```bash
bash -n scripts/rebrand-to-agent-harness.sh
```
Expected: 无输出

---

## Task 5: 脚本阶段 3 — README/CLAUDE.md 致敬段处理

**Files:** Modify: `scripts/rebrand-to-agent-harness.sh`（追加致敬段阶段）

**说明**：README.md / README_EN.md / CLAUDE.md 在阶段 2 被跳过 sed，本阶段单独处理：先做 sed 替换，再注入或保留致敬段。

- [ ] **Step 5.1: 追加 README/CLAUDE.md 专用处理阶段**

在脚本末尾追加：

```bash

# --- 阶段 3：README / CLAUDE.md 专用处理（先 sed，再注入致敬段） ---
echo "▶ 阶段 3/5：README / CLAUDE.md 致敬段处理"

TRIBUTE_ZH='## 致谢 / Acknowledgements

本项目 fork 自 Jesse Vincent（[@obra](https://github.com/obra)）的 [Superpowers](https://github.com/obra/superpowers)，保留了其工作流理念与 skill 架构。感谢原作者的开创性工作。'

TRIBUTE_EN='## Acknowledgements

This project is forked from Jesse Vincent ([@obra](https://github.com/obra))\'s [Superpowers](https://github.com/obra/superpowers). We retain its workflow philosophy and skill architecture. Credit to the original author.'

# README.md：先应用规则 8/9 的替换，再注入致敬段
if [[ -f "README.md" ]]; then
    # 替换大驼峰与小写（致敬词会在最后注入，无需保留）
    sed "${SED_INPLACE[@]}" -E 's/\bSuperpowers\b/Agent Harness/g' README.md
    sed "${SED_INPLACE[@]}" -E 's/\bsuperpowers\b/agent-harness/g' README.md
    sed "${SED_INPLACE[@]}" -E 's/superpowers:/agent-harness:/g' README.md
    sed "${SED_INPLACE[@]}" -E 's/using-superpowers/using-agent-harness/g' README.md
    sed "${SED_INPLACE[@]}" -E 's|\.superpowers/|.agent-harness/|g' README.md
    sed "${SED_INPLACE[@]}" -E 's|docs/superpowers/|docs/agent-harness/|g' README.md
    sed "${SED_INPLACE[@]}" -E 's/superpowers-dev/agent-harness-dev/g' README.md
    # 在第一个一级标题后插入致敬段（若尚未存在）
    if ! grep -q '^## 致谢' README.md; then
        # 用 awk 在第一个 ## 标题（目录或 About）前插入
        awk -v tribute="$TRIBUTE_ZH" '
            NR==1 { print; next }
            /^#/ && !inserted { print tribute; print ""; inserted=1 }
            { print }
        ' README.md > README.md.tmp && mv README.md.tmp README.md
    fi
fi

# README_EN.md：同步处理
if [[ -f "README_EN.md" ]]; then
    sed "${SED_INPLACE[@]}" -E 's/\bSuperpowers\b/Agent Harness/g' README_EN.md
    sed "${SED_INPLACE[@]}" -E 's/\bsuperpowers\b/agent-harness/g' README_EN.md
    sed "${SED_INPLACE[@]}" -E 's/superpowers:/agent-harness:/g' README_EN.md
    sed "${SED_INPLACE[@]}" -E 's/using-superpowers/using-agent-harness/g' README_EN.md
    sed "${SED_INPLACE[@]}" -E 's|\.superpowers/|.agent-harness/|g' README_EN.md
    sed "${SED_INPLACE[@]}" -E 's|docs/superpowers/|docs/agent-harness/|g' README_EN.md
    sed "${SED_INPLACE[@]}" -E 's/superpowers-dev/agent-harness-dev/g' README_EN.md
    if ! grep -q '^## Acknowledgements' README_EN.md; then
        awk -v tribute="$TRIBUTE_EN" '
            NR==1 { print; next }
            /^#/ && !inserted { print tribute; print ""; inserted=1 }
            { print }
        ' README_EN.md > README_EN.md.tmp && mv README_EN.md.tmp README_EN.md
    fi
fi

# CLAUDE.md：保留"基于 Jesse Vincent 的原版 Superpowers 项目"一句作为致敬上下文
# 其余 superpowers 字眼做替换
if [[ -f "CLAUDE.md" ]]; then
    # 用占位符保护致敬句
    sed "${SED_INPLACE[@]}" -E 's/基于 Jesse Vincent 的原版 Superpowers 项目/__TRIBUTE_SENTINEL__/g' CLAUDE.md
    sed "${SED_INPLACE[@]}" -E 's/\bSuperpowers\b/Agent Harness/g' CLAUDE.md
    sed "${SED_INPLACE[@]}" -E 's/\bsuperpowers\b/agent-harness/g' CLAUDE.md
    sed "${SED_INPLACE[@]}" -E 's/superpowers:/agent-harness:/g' CLAUDE.md
    sed "${SED_INPLACE[@]}" -E 's/using-superpowers/using-agent-harness/g' CLAUDE.md
    sed "${SED_INPLACE[@]}" -E 's|\.superpowers/|.agent-harness/|g' CLAUDE.md
    sed "${SED_INPLACE[@]}" -E 's|docs/superpowers/|docs/agent-harness/|g' CLAUDE.md
    sed "${SED_INPLACE[@]}" -E 's/superpowers-dev/agent-harness-dev/g' CLAUDE.md
    # 恢复致敬句
    sed "${SED_INPLACE[@]}" -E 's/__TRIBUTE_SENTINEL__/基于 Jesse Vincent 的原版 Superpowers 项目/g' CLAUDE.md
fi

# skills/CLAUDE.md / tests/CLAUDE.md / tests/claude-code/README.md：标准 sed（无致敬保留）
for f in "skills/CLAUDE.md" "tests/CLAUDE.md" "tests/claude-code/README.md"; do
    [[ -f "$f" ]] || continue
    sed "${SED_INPLACE[@]}" -E 's/\bSuperpowers\b/Agent Harness/g' "$f"
    sed "${SED_INPLACE[@]}" -E 's/\bsuperpowers\b/agent-harness/g' "$f"
    sed "${SED_INPLACE[@]}" -E 's/superpowers:/agent-harness:/g' "$f"
    sed "${SED_INPLACE[@]}" -E 's/using-superpowers/using-agent-harness/g' "$f"
    sed "${SED_INPLACE[@]}" -E 's|\.superpowers/|.agent-harness/|g' "$f"
    sed "${SED_INPLACE[@]}" -E 's|docs/superpowers/|docs/agent-harness/|g' "$f"
    sed "${SED_INPLACE[@]}" -E 's/superpowers-dev/agent-harness-dev/g' "$f"
done

echo "✓ 阶段 3 完成（README / CLAUDE.md 致敬段处理）"
```

- [ ] **Step 5.2: 语法检查**

Run:
```bash
bash -n scripts/rebrand-to-agent-harness.sh
```
Expected: 无输出

---

## Task 6: 脚本阶段 4 — JSON 合法性校验

**Files:** Modify: `scripts/rebrand-to-agent-harness.sh`（追加 JSON 校验阶段）

- [ ] **Step 6.1: 追加 JSON 校验阶段**

在脚本末尾追加：

```bash

# --- 阶段 4：JSON 合法性校验 ---
echo "▶ 阶段 4/5：JSON 合法性校验"

JSON_FILES=(
    ".claude-plugin/plugin.json"
    ".claude-plugin/marketplace.json"
    ".codex-plugin/plugin.json"
    "package.json"
    "hooks/hooks.json"
    ".claude/settings.json"
)

for jf in "${JSON_FILES[@]}"; do
    if [[ -f "$jf" ]]; then
        if ! jq . "$jf" > /dev/null 2>&1; then
            echo "❌ JSON 校验失败：$jf" >&2
            jq . "$jf" >&2 || true
            exit 1
        fi
        echo "  ✓ $jf"
    fi
done

# settings.local.json.example（若存在）
if [[ -f ".claude/settings.local.json.example" ]]; then
    if ! jq . ".claude/settings.local.json.example" > /dev/null 2>&1; then
        echo "❌ JSON 校验失败：.claude/settings.local.json.example" >&2
        exit 1
    fi
    echo "  ✓ .claude/settings.local.json.example"
fi

echo "✓ 阶段 4 完成（JSON 合法）"
```

- [ ] **Step 6.2: 语法检查**

Run:
```bash
bash -n scripts/rebrand-to-agent-harness.sh
```
Expected: 无输出

---

## Task 7: 脚本阶段 5 — 残留扫描

**Files:** Modify: `scripts/rebrand-to-agent-harness.sh`（追加残留扫描阶段）

- [ ] **Step 7.1: 追加残留扫描阶段**

在脚本末尾追加：

```bash

# --- 阶段 5：残留扫描 ---
echo "▶ 阶段 5/5：残留 superpowers 字眼扫描"

# 白名单：LICENSE、README.md、README_EN.md、CLAUDE.md（致敬段）
RESIDUAL=$(grep -rni 'superpowers' \
    --exclude-dir=.git \
    --exclude=LICENSE \
    --exclude=README.md \
    --exclude=README_EN.md \
    --exclude=CLAUDE.md \
    --exclude=rebrand-to-agent-harness.sh \
    . 2>/dev/null || true)

if [[ -n "$RESIDUAL" ]]; then
    echo "⚠️  发现残留 superpowers 字眼（非白名单）：" >&2
    echo "$RESIDUAL" >&2
    echo "" >&2
    echo "请人工检查上述命中是否为致敬上下文。若非致敬，回到阶段 2 补充 sed 规则。" >&2
    exit 1
fi

echo "✓ 阶段 5 完成（无残留）"

# 致敬段位置确认
echo ""
echo "📋 致敬段确认（应保留 Superpowers 字样）："
echo "--- README.md ---"
grep -A2 '^## 致谢' README.md 2>/dev/null || echo "(未找到致敬段，请检查)"
echo "--- README_EN.md ---"
grep -A2 '^## Acknowledgements' README_EN.md 2>/dev/null || echo "(未找到致敬段，请检查)"
echo "--- CLAUDE.md 致敬句 ---"
grep '基于 Jesse Vincent' CLAUDE.md 2>/dev/null || echo "(未找到致敬句)"

echo ""
echo "🎉 rebrand 完成。下一步：运行 plugin 基础设施测试（见 Task 9）"
```

- [ ] **Step 7.2: 语法检查**

Run:
```bash
bash -n scripts/rebrand-to-agent-harness.sh
```
Expected: 无输出

---

## Task 8: 预演 — 模拟 git mv 与 sed 替换命中范围

**Files:** 无修改（只读预演）

**目的**：在实际跑脚本前，先验证 `git mv` 目标路径存在、sed 规则的命中范围符合预期，避免脚本跑了一半失败留下中间状态。

- [ ] **Step 8.1: 验证所有 git mv 源路径存在**

Run:
```bash
for p in \
    "demo/fruit-shop/.superpowers" \
    "demo/fruit-shop/docs/superpowers" \
    "demo/docs/superpowers" \
    "docs/superpowers" \
    ".superpowers" \
    "skills/using-superpowers" \
    "tests/skill-behavior/using-superpowers" \
    ".pi/extensions/superpowers.ts"; do
    if [[ -e "$p" ]]; then echo "✓ $p"; else echo "✗ 缺失: $p"; fi
done
```
Expected: 全部 `✓`。若有 `✗ 缺失`，更新脚本 Task 3 中对应的 `[[ -d ... ]]` / `[[ -f ... ]]` 守卫（脚本已有 `[[ ]]` 守卫，缺失会自动跳过，但需确认是否漏改）。

- [ ] **Step 8.2: 统计各 sed 规则的命中文件数**

Run:
```bash
echo "规则1 复合 token:  $(grep -rl 'superpowers:using-superpowers' --exclude-dir=.git . | wc -l | tr -d ' ')"
echo "规则2 命名空间:    $(grep -rl 'superpowers:' --exclude-dir=.git . | wc -l | tr -d ' ')"
echo "规则3 skill名:     $(grep -rl 'using-superpowers' --exclude-dir=.git . | wc -l | tr -d ' ')"
echo "规则4 .superpowers/: $(grep -rl '\.superpowers/' --exclude-dir=.git . | wc -l | tr -d ' ')"
echo "规则5 docs/superpowers/: $(grep -rl 'docs/superpowers/' --exclude-dir=.git . | wc -l | tr -d ' ')"
echo "规则6 marketplace:  $(grep -rl 'superpowers-dev' --exclude-dir=.git . | wc -l | tr -d ' ')"
echo "规则7 settings引用: $(grep -rl 'superpowers@superpowers-dev' --exclude-dir=.git . | wc -l | tr -d ' ')"
echo "规则8 大驼峰:       $(grep -rlE '\bSuperpowers\b' --exclude-dir=.git . | wc -l | tr -d ' ')"
echo "规则9 小写兜底:     $(grep -rlE '\bsuperpowers\b' --exclude-dir=.git . | wc -l | tr -d ' ')"
```
Expected: 数字合理（总计约 197 文件命中）。若某规则为 0，检查正则是否正确。

- [ ] **Step 8.3: 预演 dry-run sed（在临时副本上验证）**

可选但推荐。在 `/tmp` 建一个文件副本，跑一次规则 8/9，确认输出无意外：

```bash
mkdir -p /tmp/rebrand-preview
grep -rlE '\b(superpowers|Superpowers)\b' --exclude-dir=.git . \
    | grep -vE 'README\.md|README_EN\.md|CLAUDE\.md|LICENSE|rebrand-to-agent-harness\.sh' \
    | head -5 \
    | while read -r f; do
        mkdir -p "/tmp/rebrand-preview/$(dirname "$f")"
        cp "$f" "/tmp/rebrand-preview/$f"
        sed -E 's/\bSuperpowers\b/Agent Harness/g; s/\bsuperpowers\b/agent-harness/g' "$f" > "/tmp/rebrand-preview/$f"
        echo "=== $f ==="
        diff "$f" "/tmp/rebrand-preview/$f" | head -20
      done
```
Expected: diff 输出符合预期，无误伤子串。

---

## Task 9: 执行脚本

**Files:** 无修改（脚本驱动所有改动）

- [ ] **Step 9.1: 执行 rebrand 脚本**

Run:
```bash
./scripts/rebrand-to-agent-harness.sh
```
Expected:
- 各阶段输出 `✓ ... 完成`
- 预览阶段列出待改文件，按 Enter 继续
- JSON 校验全 `✓`
- 残留扫描输出 `✓ 阶段 5 完成（无残留）`
- 致敬段确认区显示 README/CLAUDE.md 致敬内容

**失败处理**：
- 若 JSON 校验失败：查看是哪个 JSON 文件、jq 错误信息，修正脚本中该文件的 sed 规则，重跑（先 `git checkout .` 还原，修脚本后重跑）
- 若残留扫描失败：查看残留命中，判断是致敬上下文（白名单遗漏）还是规则缺失；前者加入 `--exclude`，后者补 sed 规则

- [ ] **Step 9.2: 验证关键文件改动正确**

Run:
```bash
echo "=== plugin.json ==="
cat .claude-plugin/plugin.json | jq '{name, description}'
echo "=== marketplace.json ==="
cat .claude-plugin/marketplace.json | jq '{name, plugins: [.plugins[].name]}'
echo "=== package.json ==="
cat package.json | jq '{name, pi: .pi.extensions}'
echo "=== settings.json ==="
cat .claude/settings.json
echo "=== skill name ==="
head -5 skills/using-agent-harness/SKILL.md
echo "=== pi extension ==="
head -8 .pi/extensions/agent-harness.ts
```
Expected:
- `plugin.json` name = `"agent-harness"`
- `marketplace.json` name = `"agent-harness-dev"`, plugins[0].name = `"agent-harness"`
- `package.json` name = `"agent-harness"`, pi.extensions 含 `"./.pi/extensions/agent-harness.ts"`
- `settings.json` 含 `"agent-harness@agent-harness-dev": true`
- `skills/using-agent-harness/SKILL.md` 第2行 `name: using-agent-harness`
- `.pi/extensions/agent-harness.ts` 含 `BOOTSTRAP_MARKER` 改为 `"agent-harness:using-agent-harness bootstrap for pi"`

---

## Task 10: 运行 plugin 基础设施测试

**Files:** 无修改（测试驱动验证）

- [ ] **Step 10.1: 运行 plugin 基础设施测试套件**

Run:
```bash
./tests/plugin-infrastructure/run-all.sh
```
Expected: 所有测试 PASS。重点关注：
- `test-session-start-injection.sh`：验证新 skill 名 `using-agent-harness` 与 `.agent-harness/` 路径能被 hook 正确读取
- `test-guard-staging.sh`：验证 guard-staging 引用路径正确

**失败处理**：
- 若 `test-session-start-injection.sh` 失败：检查 `hooks/session-start` 中 `${PLUGIN_ROOT}/skills/using-superpowers/SKILL.md` 是否已改为 `${PLUGIN_ROOT}/skills/using-agent-harness/SKILL.md`，以及 `.superpowers/learnings.jsonl` 是否已改为 `.agent-harness/learnings.jsonl`
- 若其他测试失败：查看具体断言，对应 sed 规则可能漏改某文件

- [ ] **Step 10.2: 运行 SessionStart 注入测试单独确认**

Run:
```bash
cd tests/plugin-infrastructure
./test-session-start-injection.sh
cd "$OLDPWD"
```
Expected: PASS。该测试验证新会话能收到包含 `using-agent-harness` skill 和 learnings 块的 `hookSpecificOutput.additionalContext`。

- [ ] **Step 10.3: 再次残留扫描确认**

Run:
```bash
grep -rni 'superpowers' \
    --exclude-dir=.git \
    --exclude=LICENSE \
    --exclude=README.md \
    --exclude=README_EN.md \
    --exclude=CLAUDE.md \
    --exclude=rebrand-to-agent-harness.sh \
    . 2>/dev/null
```
Expected: 空输出（除白名单外无残留）。

---

## Task 11: 人工 review 关键改动

**Files:** 无修改（review only）

- [ ] **Step 11.1: review README 致敬段**

Run:
```bash
head -20 README.md
echo "---"
head -20 README_EN.md
```
Expected: 标题下方紧跟「## 致谢 / Acknowledgements」段，内容含 `Jesse Vincent`、`@obra`、`Superpowers`（链接到 obra/superpowers）。无其他 `Superpowers` 字样（除致谢段）。

- [ ] **Step 11.2: review CLAUDE.md 致敬句**

Run:
```bash
grep -n 'Jesse Vincent\|Superpowers\|superpowers' CLAUDE.md
```
Expected: 仅命中「基于 Jesse Vincent 的原版 Superpowers 项目」一句；其余原 `Superpowers` 字样已替换为 `Agent Harness` / `agent-harness`。

- [ ] **Step 11.3: review hooks/session-start 关键引用**

Run:
```bash
grep -n 'using-superpowers\|using-agent-harness\|\.superpowers\|\.agent-harness' hooks/session-start
```
Expected: 全部为 `using-agent-harness` 与 `.agent-harness/`，无 `using-superpowers` 或 `.superpowers/` 残留。

- [ ] **Step 11.4: review diff 规模**

Run:
```bash
git diff --stat main..HEAD | tail -5
```
Expected: 改动文件数与命中数大致相符（约 197 文件），无意外巨型文件改动。

---

## Task 12: 提交

**Files:** 无修改（commit 操作）

- [ ] **Step 12.1: 暂存所有改动**

Run:
```bash
git add -A
```
Expected: 无输出。

- [ ] **Step 12.2: 验证暂存区无敏感文件**

Run:
```bash
git diff --cached --name-only | grep -E '\.env|credentials|secret|\.pem|\.key' || echo "✓ 无敏感文件"
```
Expected: `✓ 无敏感文件`。

- [ ] **Step 12.3: 创建 rebrand commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
refactor: rebrand superpowers → agent-harness (preserve attribution in README)

- 全量重命名 superpowers → agent-harness（命名空间、目录、skill 名、插件元数据、文档）
- skills/using-superpowers/ → skills/using-agent-harness/
- .superpowers/ → .agent-harness/，docs/superpowers/ → docs/agent-harness/（含 demo 子项目）
- plugin.json / marketplace.json / package.json / settings.json 同步更新
- README.md / README_EN.md 保留对原作者 Jesse Vincent (@obra) 的致谢段
- CLAUDE.md 保留"基于 Jesse Vincent 的原版 Superpowers 项目"致敬句
- 通过 plugin 基础设施测试与 JSON 合法性校验

Spec: docs/agent-harness/specs/2026-06-27-rebrand-to-agent-harness-design.md
EOF
)"
```
Expected: commit 创建成功。

- [ ] **Step 12.4: 确认 commit 状态**

Run:
```bash
git log --oneline -1
git status
```
Expected: 顶部为 rebrand commit；working tree clean。

---

## Task 13: 推送与远程仓库改名

**Files:** 无修改（git remote + gh 操作）

**注意**：此任务涉及对外可见的操作（push、repo rename）。执行前需向用户展示完整 diff 并获明确批准。

- [ ] **Step 13.1: 向用户展示 diff 摘要并获批准**

向用户展示：
```bash
git diff --stat main..HEAD | tail -10
echo "---"
echo "提交：$(git log --oneline -1)"
echo "分支：$(git branch --show-current)"
```

询问用户："是否推送并重命名 GitHub 远程仓库（evanfang0054/superpowers → evanfang0054/agent-harness）？"
- 用户明确同意后继续
- 用户拒绝则停在此步，本地 commit 已就绪

- [ ] **Step 13.2: 推送分支**

Run:
```bash
git push -u origin refactor/rebrand-to-agent-harness
```
Expected: 推送成功。

- [ ] **Step 13.3: 重命名 GitHub 远程仓库**

Run:
```bash
gh repo rename agent-harness -R evanfang0054/superpowers --yes
```
Expected: `✓ Renamed repository evanfang0054/superpowers to evanfang0054/agent-harness`

GitHub 会自动建立旧 URL → 新 URL 的重定向。

- [ ] **Step 13.4: 更新本地 remote URL**

Run:
```bash
git remote set-url origin https://github.com/evanfang0054/agent-harness.git
git remote -v
```
Expected: origin 指向 `evanfang0054/agent-harness.git`。

- [ ] **Step 13.5: 创建 PR（可选）**

若需创建 PR 合并到 main：

```bash
gh pr create --title "refactor: rebrand superpowers → agent-harness" --body "$(cat <<'EOF'
## Summary
- 全量重命名 superpowers → agent-harness（命名空间、目录、skill 名、插件元数据、文档）
- 保留对原作者 Jesse Vincent (@obra) 的致谢（README 致谢段 + CLAUDE.md 致敬句）
- 通过 plugin 基础设施测试与 JSON 合法性校验

## Spec
docs/agent-harness/specs/2026-06-27-rebrand-to-agent-harness-design.md

## Test plan
- [x] ./tests/plugin-infrastructure/run-all.sh 全通过
- [x] JSON jq . 校验合法
- [x] 残留扫描除白名单外为空
- [x] README 致谢段保留
- [ ] 人工 review SessionStart 注入在新会话中正常工作（需新会话验证）
EOF
)"
```
Expected: PR 创建成功，返回 PR URL。

---

## 验证清单（全部任务完成后）

- [ ] `./tests/plugin-infrastructure/run-all.sh` 全 PASS
- [ ] 所有 JSON 配置 `jq .` 合法
- [ ] `grep -rni superpowers`（除白名单 LICENSE / README.md / README_EN.md / CLAUDE.md）输出为空
- [ ] README.md / README_EN.md 含致谢段，含 `Jesse Vincent`、`@obra`、`Superpowers`（链接）
- [ ] CLAUDE.md 含「基于 Jesse Vincent 的原版 Superpowers 项目」一句
- [ ] `skills/using-agent-harness/SKILL.md` 的 `name: using-agent-harness`
- [ ] `.claude-plugin/plugin.json` 的 `name: agent-harness`
- [ ] `.claude/settings.json` 含 `agent-harness@agent-harness-dev`
- [ ] git commit 已创建（message 含 `refactor: rebrand`）
- [ ] 远程仓库已重命名（若用户批准 Task 13）

---

## Self-Review 结果

**Spec 覆盖率检查**：
- §2.1 必须改名项 → Task 3（目录）、Task 4（sed）、Task 5（README/CLAUDE）
- §2.2 白名单 → Task 4 find 排除规则 + Task 5 README/CLAUDE 特殊处理
- §3 命名映射 → Task 4 的 9 条规则
- §4 README 致敬段 → Task 5 Step 5.1
- §5.1 脚本流程 → Task 2-7 完整覆盖 5 阶段
- §5.2 平台兼容 → Task 2 Step 2.1 SED_INPLACE 检测
- §5.3 风险缓解 → Task 4 预览模式、Task 6 JSON 校验、Task 7 残留扫描
- §6 验证策略 → Task 9-11
- §7 提交与远程策略 → Task 12-13

**Placeholder 扫描**：无 TBD / TODO / 模糊引用。所有 sed 规则、git mv 路径、JSON 文件清单、测试命令均为具体值。

**类型一致性**：命名映射规则 9 条贯穿 Task 4（脚本）与 Task 8（预演）一致；commit message 与 spec §7 一致。

**Scope Scan（全局替换影响面）**：本计划本身就是全局 token 替换，Task 8 已通过 grep 验证全部命中文件。无需额外 cleanup 任务。
