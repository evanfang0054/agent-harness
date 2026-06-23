# Codex + Pi 平台支持补全 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让本 fork 在 Codex（App + CLI）和 Pi 两个 harness 上具备 skill 自动加载和 bootstrap 注入能力，与上游 obra/superpowers v6.0.3 行为一致。

**Architecture:** 严格遵循上游三不变量——skills 平台无关（复用现有 `skills/`）、tool mapping 平台特定（新增 `pi-tools.md`）、bootstrap 平台特定（Codex 复用已有 shell hook，Pi 新增 TS 扩展）。Codex 补 `.codex-plugin/plugin.json` manifest + assets；Pi 新增 `.pi/extensions/superpowers.ts` + `package.json` 的 `pi` 字段。

**Tech Stack:** Bash + jq（manifest 测试）、Node.js test runner + assert（Pi 扩展测试）、TypeScript type-only import（Pi 扩展）。

**Contract:** `docs/superpowers/contracts/2026-06-23-codex-pi-platform-support.contract.md`
**Spec:** `docs/superpowers/specs/2026-06-23-codex-pi-platform-support-design.md`

---

## Task 1: 拷贝上游二进制资源 assets

**Files:**
- Create: `assets/app-icon.png`
- Create: `assets/superpowers-small.svg`

- [ ] **Step 1: 创建 assets 目录并拷贝上游资源**

Run:
```bash
mkdir -p assets
cp /tmp/obra-superpowers/assets/app-icon.png assets/app-icon.png
cp /tmp/obra-superpowers/assets/superpowers-small.svg assets/superpowers-small.svg
```

如果 `/tmp/obra-superpowers` 不存在（会话重启），先克隆：
```bash
git clone --depth 1 https://github.com/obra/superpowers.git /tmp/obra-superpowers
```

- [ ] **Step 2: 验证资源存在且非空**

Run:
```bash
ls -l assets/app-icon.png assets/superpowers-small.svg
```
Expected: 两个文件都存在，`app-icon.png` 大小约 48KB，`superpowers-small.svg` 约 1.7KB。

- [ ] **Step 3: Commit**

```bash
git add assets/app-icon.png assets/superpowers-small.svg
git commit -m "feat(assets): 新增 Codex App 图标资源"
```

---

## Task 2: 新增 Codex 插件 manifest `.codex-plugin/plugin.json`

**Files:**
- Create: `.codex-plugin/plugin.json`

- [ ] **Step 1: 创建目录**

Run:
```bash
mkdir -p .codex-plugin
```

- [ ] **Step 2: 写入 manifest**

写入 `.codex-plugin/plugin.json`：

```json
{
  "name": "superpowers",
  "version": "5.0.21-beta.5",
  "description": "为 coding agent 提供的技能框架与软件开发方法论：规划、TDD、调试、协作工作流",
  "author": {
    "name": "evanfang",
    "url": "https://github.com/evanfang0054"
  },
  "homepage": "https://github.com/evanfang0054/superpowers",
  "repository": "https://github.com/evanfang0054/superpowers",
  "license": "MIT",
  "keywords": [
    "brainstorming",
    "subagent-driven-development",
    "skills",
    "planning",
    "tdd",
    "debugging",
    "code-review",
    "workflow"
  ],
  "skills": "./skills/",
  "hooks": "./hooks/hooks-codex.json",
  "interface": {
    "displayName": "Superpowers",
    "shortDescription": "规划、TDD、调试、交付工作流",
    "longDescription": "通过 Superpowers 引导 agent 完成 brainstorming、实现规划、测试驱动开发、系统化调试、并行执行、代码审查和分支收尾工作流。",
    "developerName": "evanfang",
    "category": "Coding",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "defaultPrompt": [
      "我有个想构建的东西的想法。",
      "让我们给这个项目加个功能。"
    ],
    "websiteURL": "https://github.com/evanfang0054/superpowers",
    "privacyPolicyURL": "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
    "termsOfServiceURL": "https://docs.github.com/en/site-policy/github-terms/github-terms-of-service",
    "brandColor": "#F59E0B",
    "composerIcon": "./assets/superpowers-small.svg",
    "logo": "./assets/app-icon.png",
    "screenshots": []
  }
}
```

- [ ] **Step 3: 验证 JSON 合法且关键字段正确**

Run:
```bash
jq -r .version .codex-plugin/plugin.json
jq -r .skills .codex-plugin/plugin.json
jq -r .hooks .codex-plugin/plugin.json
jq -r '.interface.composerIcon' .codex-plugin/plugin.json
```
Expected: 分别输出 `5.0.21-beta.5` / `./skills/` / `./hooks/hooks-codex.json` / `./assets/superpowers-small.svg`。

- [ ] **Step 4: Commit**

```bash
git add .codex-plugin/plugin.json
git commit -m "feat(codex): 新增 .codex-plugin/plugin.json manifest"
```

---

## Task 3: 新增 Pi 扩展 `.pi/extensions/superpowers.ts`

**Files:**
- Create: `.pi/extensions/superpowers.ts`

- [ ] **Step 1: 创建目录**

Run:
```bash
mkdir -p .pi/extensions
```

- [ ] **Step 2: 写入扩展源码**

写入 `.pi/extensions/superpowers.ts`：

```typescript
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const EXTREMELY_IMPORTANT_MARKER = "<EXTREMELY_IMPORTANT>";
const BOOTSTRAP_MARKER = "superpowers:using-superpowers bootstrap for pi";

const extensionDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(extensionDir, "../..");
const skillsDir = resolve(packageRoot, "skills");
const bootstrapSkillPath = resolve(skillsDir, "using-superpowers", "SKILL.md");

let cachedBootstrap: string | null | undefined;

export default function superpowersPiExtension(pi: ExtensionAPI) {
	let injectBootstrap = true;

	pi.on("resources_discover", async () => ({
		skillPaths: [skillsDir],
	}));

	pi.on("session_start", async () => {
		injectBootstrap = true;
	});

	pi.on("session_compact", async () => {
		injectBootstrap = true;
	});

	pi.on("agent_end", async () => {
		injectBootstrap = false;
	});

	pi.on("context", async (event) => {
		if (!injectBootstrap) return;
		if (event.messages.some(messageContainsBootstrap)) return;

		const bootstrap = getBootstrapContent();
		if (!bootstrap) return;

		const bootstrapMessage = {
			role: "user" as const,
			content: [{ type: "text" as const, text: bootstrap }],
			timestamp: Date.now(),
		};

		const insertAt = firstNonCompactionSummaryIndex(event.messages);
		return {
			messages: [
				...event.messages.slice(0, insertAt),
				bootstrapMessage,
				...event.messages.slice(insertAt),
			],
		};
	});
}

function getBootstrapContent(): string | null {
	if (cachedBootstrap !== undefined) return cachedBootstrap;

	try {
		const skillContent = readFileSync(bootstrapSkillPath, "utf8");
		const body = stripFrontmatter(skillContent);
		cachedBootstrap = `${EXTREMELY_IMPORTANT_MARKER}
${BOOTSTRAP_MARKER}

You have superpowers.

The using-superpowers skill content is included below and is already loaded for this Pi session. Follow it now. Do not try to load using-superpowers again.

${body}

${piToolMapping()}
</EXTREMELY_IMPORTANT>`;
		return cachedBootstrap;
	} catch {
		cachedBootstrap = null;
		return null;
	}
}

function stripFrontmatter(content: string): string {
	const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
	return (match ? match[1] : content).trim();
}

function piToolMapping(): string {
	return `## Pi tool mapping

Pi has native skills but does not expose Claude Code's \`Skill\` tool. When a Superpowers instruction says to invoke a skill, use Pi's native skill system instead: load the relevant \`SKILL.md\` with \`read\` when the skill applies, or let a human invoke \`/skill:name\` explicitly.

Pi's built-in coding tools are lowercase: \`read\`, \`write\`, \`edit\`, \`bash\`, plus optional \`grep\`, \`find\`, and \`ls\`. Use those for the corresponding actions: read a file, create or edit files, run shell commands, search file contents, find files by name, and list directories.

Pi does not ship a standard subagent tool. If a subagent tool such as \`subagent\` from \`pi-subagents\` is available, use it for Superpowers subagent workflows. If no subagent tool is available, do the work in this session or explain the missing capability instead of inventing \`Task\` calls.

Pi does not ship a standard task-list tool. If an installed todo/task tool is available, use it. Otherwise track work in plan files or a repo-local \`TODO.md\` when task tracking is needed. Treat older \`TodoWrite\` references as this task-tracking action.`;
}

function messageContainsBootstrap(message: unknown): boolean {
	const content = (message as { content?: unknown }).content;
	if (typeof content === "string") return content.includes(BOOTSTRAP_MARKER);
	if (!Array.isArray(content)) return false;
	return content.some((part) => {
		return (
			part &&
			typeof part === "object" &&
			(part as { type?: unknown }).type === "text" &&
			typeof (part as { text?: unknown }).text === "string" &&
			(part as { text: string }).text.includes(BOOTSTRAP_MARKER)
		);
	});
}

function firstNonCompactionSummaryIndex(messages: unknown[]): number {
	let index = 0;
	while ((messages[index] as { role?: unknown } | undefined)?.role === "compactionSummary") {
		index += 1;
	}
	return index;
}
```

- [ ] **Step 3: 验证语法正确**

Run:
```bash
node --check .pi/extensions/superpowers.ts
```
Expected: 无输出（退出码 0）。`node --check` 不解析 import 类型，仅做语法检查，type-only import 不影响。

- [ ] **Step 4: 验证 5 个事件名和关键常量**

Run:
```bash
grep -c 'pi.on("resources_discover"' .pi/extensions/superpowers.ts
grep -c 'pi.on("session_start"' .pi/extensions/superpowers.ts
grep -c 'pi.on("session_compact"' .pi/extensions/superpowers.ts
grep -c 'pi.on("agent_end"' .pi/extensions/superpowers.ts
grep -c 'pi.on("context"' .pi/extensions/superpowers.ts
grep -c 'BOOTSTRAP_MARKER' .pi/extensions/superpowers.ts
grep -c 'EXTREMELY_IMPORTANT_MARKER' .pi/extensions/superpowers.ts
grep -c 'import type { ExtensionAPI }' .pi/extensions/superpowers.ts
```
Expected: 每条都输出 `1` 或更大的数字（`BOOTSTRAP_MARKER` 会多处出现）。

- [ ] **Step 5: Commit**

```bash
git add .pi/extensions/superpowers.ts
git commit -m "feat(pi): 新增 .pi/extensions/superpowers.ts 事件驱动 bootstrap 注入"
```

---

## Task 4: 修改 `package.json` 添加 Pi 字段

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 读取当前 package.json**

Run:
```bash
cat package.json
```
当前内容：
```json
{
  "name": "superpowers",
  "version": "5.0.21-beta.5",
  "type": "module",
  "scripts": {
    "release": "./scripts/bump-version.sh"
  }
}
```

- [ ] **Step 2: 写入新 package.json**

用 Edit 工具把 package.json 完整内容替换为：

```json
{
  "name": "superpowers",
  "version": "5.0.21-beta.5",
  "description": "Superpowers skills and runtime bootstrap for coding agents",
  "type": "module",
  "scripts": {
    "release": "./scripts/bump-version.sh"
  },
  "keywords": [
    "pi-package",
    "skills",
    "tdd",
    "debugging",
    "collaboration",
    "workflow"
  ],
  "pi": {
    "extensions": [
      "./.pi/extensions/superpowers.ts"
    ],
    "skills": [
      "./skills"
    ]
  }
}
```

注意：不设 `main` 字段（fork 无 `.opencode/` 目录）。

- [ ] **Step 3: 验证字段**

Run:
```bash
jq -r '.keywords[]' package.json | grep pi-package
jq -r '.pi.extensions[0]' package.json
jq -r '.pi.skills[0]' package.json
jq -e '.main | not' package.json
```
Expected: 输出 `pi-package` / `./.pi/extensions/superpowers.ts` / `./skills` / `true`（`.main | not` 为 true 表示该字段不存在）。

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat(package): 新增 pi 字段声明 Pi 扩展和 skills 路径"
```

---

## Task 5: 新增 `skills/using-superpowers/references/pi-tools.md`

**Files:**
- Create: `skills/using-superpowers/references/pi-tools.md`

- [ ] **Step 1: 写入 pi-tools.md**

写入 `skills/using-superpowers/references/pi-tools.md`：

````markdown
# Pi 工具映射

Skills 用「动作」描述需求（"分发子 agent"、"创建 todo"、"读取文件"）。在 Pi 上这些动作对应下面的工具。

| Skill 请求的动作 | Pi 等价物 |
| --- | --- |
| 调用 skill | Pi 原生 skills：用 `read` 加载相关 `SKILL.md`，或让人类显式调用 `/skill:name` |
| 读取文件 | `read` |
| 创建文件 | `write` |
| 编辑文件 | `edit` |
| 运行 shell 命令 | `bash` |
| 搜索文件内容 | 可用时 `grep`；否则用 `bash` 配合 `rg` / `grep` |
| 按名查找文件 | 可用时 `find`；否则用 `bash` 配合 shell glob |
| 列出文件和子目录 | 可用时 `ls`；否则用 `bash` 配合 `ls` |
| 分发子 agent（`Subagent (general-purpose):` 模板） | 如果安装了 `pi-subagents` 包提供的 `subagent` 工具，则使用它 |
| 任务跟踪（"创建 todo"、"标记完成"） | 如果安装了 todo/task 工具则使用；否则在 plan 文件或仓库内 `TODO.md` 中跟踪 |

## Skills

Pi 从配置的 skill 目录和已安装的 Pi 包发现 skills。Superpowers Pi 包应通过其 `pi.skills` manifest 条目暴露 `skills/`。Pi 不暴露 Claude Code 的 `Skill` 工具，但 agent 仍应遵循 Superpowers 规则：当某个 skill 适用时，在响应前加载并遵循它。

## Subagents

Pi 核心不提供标准 subagent 工具。`pi-subagents` 包是强有力的可选 companion，提供支持单 agent、链式、并行、异步、forked-context、resume/status 工作流的 `subagent` 工具。如果没有可用的 subagent 工具，不要伪造 `Task` 调用；在当前 session 中顺序执行，或说明该可选 subagent 能力未安装。

## Task lists

Pi 核心不提供标准 task-list 工具。如果安装了 todo/task 扩展，使用其文档化的工具。否则使用 Superpowers plan 文件、Markdown checklist，或仓库内 `TODO.md` 做任务跟踪。较老的 Superpowers 文档可能引用 `TodoWrite`；将其视为上述任务跟踪动作。
````

- [ ] **Step 2: 验证文件覆盖五类动作**

Run:
```bash
grep -c "调用 skill" skills/using-superpowers/references/pi-tools.md
grep -c "读取文件" skills/using-superpowers/references/pi-tools.md
grep -c "运行 shell" skills/using-superpowers/references/pi-tools.md
grep -c "分发子 agent" skills/using-superpowers/references/pi-tools.md
grep -c "任务跟踪" skills/using-superpowers/references/pi-tools.md
```
Expected: 每条至少 `1`。

- [ ] **Step 3: Commit**

```bash
git add skills/using-superpowers/references/pi-tools.md
git commit -m "feat(docs): 新增 Pi 平台工具映射表"
```

---

## Task 6: 新增 Pi 扩展单元测试 `tests/pi/test-pi-extension.mjs`

**Files:**
- Create: `tests/pi/test-pi-extension.mjs`

- [ ] **Step 1: 创建目录**

Run:
```bash
mkdir -p tests/pi
```

- [ ] **Step 2: 写入测试**

写入 `tests/pi/test-pi-extension.mjs`（基于上游测试，完全对齐 5 个事件契约和去重逻辑）：

```javascript
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const packageJsonPath = resolve(repoRoot, 'package.json');
const extensionPath = resolve(repoRoot, '.pi/extensions/superpowers.ts');
const piToolsPath = resolve(repoRoot, 'skills/using-superpowers/references/pi-tools.md');

async function readPackageJson() {
  return JSON.parse(await readFile(packageJsonPath, 'utf8'));
}

async function loadExtension() {
  const handlers = new Map();
  const pi = {
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event).push(handler);
    },
  };
  const mod = await import(pathToFileURL(extensionPath).href + `?cachebust=${Date.now()}-${Math.random()}`);
  mod.default(pi);
  return { handlers };
}

function firstHandler(handlers, event) {
  const eventHandlers = handlers.get(event) ?? [];
  assert.equal(eventHandlers.length, 1, `expected one ${event} handler`);
  return eventHandlers[0];
}

function textOf(message) {
  if (typeof message.content === 'string') return message.content;
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

test('package.json declares a pi package with skills and extension resources', async () => {
  const pkg = await readPackageJson();

  assert.equal(pkg.name, 'superpowers');
  assert.ok(pkg.keywords.includes('pi-package'));
  assert.deepEqual(pkg.pi.skills, ['./skills']);
  assert.deepEqual(pkg.pi.extensions, ['./.pi/extensions/superpowers.ts']);
});

test('extension registers lifecycle hooks without pre-compaction injection', async () => {
  const { handlers } = await loadExtension();

  for (const event of ['resources_discover', 'session_start', 'session_compact', 'context', 'agent_end']) {
    assert.equal((handlers.get(event) ?? []).length, 1, `missing ${event} handler`);
  }
  assert.equal((handlers.get('session_before_compact') ?? []).length, 0);
});

test('resources_discover contributes the bundled skills directory', async () => {
  const { handlers } = await loadExtension();
  const discover = firstHandler(handlers, 'resources_discover');

  const result = await discover({ type: 'resources_discover', cwd: repoRoot, reason: 'startup' }, {});

  assert.deepEqual(result.skillPaths, [resolve(repoRoot, 'skills')]);
});

test('startup context injects the bootstrap as one user message until agent_end', async () => {
  const { handlers } = await loadExtension();
  const sessionStart = firstHandler(handlers, 'session_start');
  const context = firstHandler(handlers, 'context');
  const agentEnd = firstHandler(handlers, 'agent_end');

  await sessionStart({ type: 'session_start', reason: 'startup' }, {});

  const originalMessages = [
    { role: 'user', content: [{ type: 'text', text: 'Let us make a react todo list' }], timestamp: 1 },
  ];
  const result = await context({ type: 'context', messages: originalMessages }, {});

  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].role, 'user');
  assert.match(textOf(result.messages[0]), /You have superpowers/);
  assert.match(textOf(result.messages[0]), /Pi tool mapping/);
  assert.equal(result.messages[1], originalMessages[0]);

  const repeatedProviderRequest = await context({ type: 'context', messages: originalMessages }, {});
  assert.equal(repeatedProviderRequest.messages.length, 2);
  assert.match(textOf(repeatedProviderRequest.messages[0]), /You have superpowers/);

  const alreadyInjected = await context({ type: 'context', messages: result.messages }, {});
  assert.equal(alreadyInjected, undefined, 'bootstrap should not duplicate when already present');

  await agentEnd({ type: 'agent_end', messages: [] }, {});
  const afterEnd = await context({ type: 'context', messages: originalMessages }, {});
  assert.equal(afterEnd, undefined, 'startup bootstrap should clear after agent_end');
});

test('session_compact injects bootstrap after compaction summaries, not before compaction', async () => {
  const { handlers } = await loadExtension();
  const sessionCompact = firstHandler(handlers, 'session_compact');
  const context = firstHandler(handlers, 'context');

  await sessionCompact({ type: 'session_compact', compactionEntry: {}, fromExtension: false }, {});

  const summary = { role: 'compactionSummary', summary: 'Prior work summary', tokensBefore: 123, timestamp: 1 };
  const user = { role: 'user', content: [{ type: 'text', text: 'Continue' }], timestamp: 2 };
  const result = await context({ type: 'context', messages: [summary, user] }, {});

  assert.equal(result.messages.length, 3);
  assert.equal(result.messages[0], summary);
  assert.equal(result.messages[1].role, 'user');
  assert.match(textOf(result.messages[1]), /You have superpowers/);
  assert.equal(result.messages[2], user);
});

test('pi tools reference documents pi-specific mappings', async () => {
  assert.equal(existsSync(piToolsPath), true, 'pi-tools.md should exist');
  const text = await readFile(piToolsPath, 'utf8');

  for (const expected of ['Skill', 'Task', 'TodoWrite', 'read', 'write', 'edit', 'bash']) {
    assert.match(text, new RegExp(expected));
  }
});
```

- [ ] **Step 3: 运行测试，期望全部通过**

Run:
```bash
node --test tests/pi/test-pi-extension.mjs
```
Expected: 6 个 test 全部 pass，退出码 0。如果失败，根据失败信息回 Task 3 修正扩展源码。

- [ ] **Step 4: Commit**

```bash
git add tests/pi/test-pi-extension.mjs
git commit -m "test(pi): 新增 Pi 扩展单元测试（5 事件契约 + 去重 + 压缩后重注入）"
```

---

## Task 7: 新增 Codex plugin 一致性测试 `tests/codex-plugin-sync/test-sync-to-codex-plugin.sh`

**Files:**
- Create: `tests/codex-plugin-sync/test-sync-to-codex-plugin.sh`

注：上游版本测试一个本 fork 没有的 `scripts/sync-to-codex-plugin.sh` 脚本（同步到 Codex 官方 marketplace 的工具）。本 fork 用一个**轻量自写测试**替代，验证 `.codex-plugin/plugin.json` 与仓库元数据的一致性，符合 spec §7.2 的实际意图。

- [ ] **Step 1: 创建目录**

Run:
```bash
mkdir -p tests/codex-plugin-sync
```

- [ ] **Step 2: 写入测试脚本**

写入 `tests/codex-plugin-sync/test-sync-to-codex-plugin.sh`：

```bash
#!/usr/bin/env bash
# Codex plugin manifest 一致性测试
# 验证 .codex-plugin/plugin.json 与仓库其他元数据一致、引用的资源都存在
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

MANIFEST="$REPO_ROOT/.codex-plugin/plugin.json"
PACKAGE_JSON="$REPO_ROOT/package.json"

FAILURES=0

pass() { echo "  [PASS] $1"; }
fail() { echo "  [FAIL] $1"; FAILURES=$((FAILURES + 1)); }

assert_exists() {
    local path="$1"
    local desc="$2"
    if [[ -e "$path" ]]; then
        pass "$desc"
    else
        fail "$desc (路径不存在: $path)"
    fi
}

assert_json_eq() {
    local actual="$1"
    local expected="$2"
    local desc="$3"
    if [[ "$actual" == "$expected" ]]; then
        pass "$desc"
    else
        fail "$desc"
        echo "    expected: $expected"
        echo "    actual:   $actual"
    fi
}

echo "=== Test: Codex plugin manifest 一致性 ==="

# 1. manifest 存在
assert_exists "$MANIFEST" "Codex plugin manifest 存在"

# 2. manifest 的 skills 字段指向存在的目录
SKILLS_DIR="$REPO_ROOT/$(jq -r .skills "$MANIFEST")"
assert_exists "$SKILLS_DIR" "manifest.skills 指向的目录存在"

# 3. manifest 的 hooks 字段指向存在的文件
HOOKS_FILE="$REPO_ROOT/$(jq -r .hooks "$MANIFEST")"
assert_exists "$HOOKS_FILE" "manifest.hooks 指向的文件存在"

# 4. manifest 的 composerIcon 引用存在
COMPOSER_ICON="$REPO_ROOT/$(jq -r '.interface.composerIcon' "$MANIFEST")"
assert_exists "$COMPOSER_ICON" "manifest.interface.composerIcon 引用存在"

# 5. manifest 的 logo 引用存在
LOGO="$REPO_ROOT/$(jq -r '.interface.logo' "$MANIFEST")"
assert_exists "$LOGO" "manifest.interface.logo 引用存在"

# 6. manifest 的 version 与 package.json 的 version 一致（防漂移）
MANIFEST_VERSION=$(jq -r .version "$MANIFEST")
PACKAGE_VERSION=$(jq -r .version "$PACKAGE_JSON")
assert_json_eq "$MANIFEST_VERSION" "$PACKAGE_VERSION" "manifest version 与 package.json version 一致"

# 7. manifest 的 name 与 package.json 的 name 一致
MANIFEST_NAME=$(jq -r .name "$MANIFEST")
PACKAGE_NAME=$(jq -r .name "$PACKAGE_JSON")
assert_json_eq "$MANIFEST_NAME" "$PACKAGE_NAME" "manifest name 与 package.json name 一致"

# 8. 必填字段不为空
DISPLAY_NAME=$(jq -r '.interface.displayName' "$MANIFEST")
if [[ -n "$DISPLAY_NAME" && "$DISPLAY_NAME" != "null" ]]; then
    pass "interface.displayName 非空"
else
    fail "interface.displayName 非空 (实际值: $DISPLAY_NAME)"
fi

if [[ $FAILURES -ne 0 ]]; then
    echo ""
    echo "FAILED: $FAILURES assertion(s) failed."
    exit 1
fi

echo ""
echo "PASS"
```

- [ ] **Step 3: 赋予执行权限并运行**

Run:
```bash
chmod +x tests/codex-plugin-sync/test-sync-to-codex-plugin.sh
bash tests/codex-plugin-sync/test-sync-to-codex-plugin.sh
```
Expected: 8 条 `[PASS]`，最后输出 `PASS`，退出码 0。

- [ ] **Step 4: Commit**

```bash
git add tests/codex-plugin-sync/test-sync-to-codex-plugin.sh
git commit -m "test(codex): 新增 Codex plugin manifest 一致性测试"
```

---

## Task 8: 修改 `.version-bump.json` 加入 Codex manifest

**Files:**
- Modify: `.version-bump.json`

- [ ] **Step 1: 读取当前内容**

当前 `.version-bump.json`：
```json
{
  "files": [
    { "path": "package.json", "field": "version" },
    { "path": ".claude-plugin/plugin.json", "field": "version" },
    { "path": ".claude-plugin/marketplace.json", "field": "plugins.0.version" }
  ],
  ...
}
```

- [ ] **Step 2: 用 Edit 新增一行到 files 数组**

在 `{ "path": ".claude-plugin/plugin.json", "field": "version" },` 之后插入：

```
    { "path": ".codex-plugin/plugin.json", "field": "version" },
```

- [ ] **Step 3: 验证 bump-version.sh --check 无漂移**

Run:
```bash
./scripts/bump-version.sh --check
```
Expected: 输出包含 `.codex-plugin/plugin.json (version)  5.0.21-beta.5`，且最终显示 `All declared files are in sync at 5.0.21-beta.5`，退出码 0。

- [ ] **Step 4: Commit**

```bash
git add .version-bump.json
git commit -m "chore(version-bump): 新增 .codex-plugin/plugin.json 到 version 同步清单"
```

---

## Task 9: 新增 `docs/README.codex.md` 中文文档

**Files:**
- Create: `docs/README.codex.md`

- [ ] **Step 1: 写入文档**

写入 `docs/README.codex.md`：

````markdown
# Codex 安装与使用

Superpowers 支持 Codex App 和 Codex CLI 两种 harness，共用同一套 plugin manifest 和 SessionStart hook。

## Codex App

Superpowers 可通过 Codex 官方插件市场获取。

1. 在 Codex App 侧边栏点击 **Plugins**
2. 在 **Coding** 区找到 `Superpowers`
3. 点击 `Superpowers` 旁边的 `+`，按提示完成安装

## Codex CLI

1. 打开插件搜索界面：

   ```
   /plugins
   ```

2. 搜索 Superpowers：

   ```
   superpowers
   ```

3. 选择 `Install Plugin`

## 工作原理

Codex 在 session 启动时执行 `.codex-plugin/plugin.json` 声明的 `hooks/hooks-codex.json`，触发 `hooks/session-start-codex` 脚本。该脚本读取 `skills/using-superpowers/SKILL.md` 全文，以 `<EXTREMELY_IMPORTANT>` 标记注入到 SessionStart 的 `additionalContext` 字段，让模型在首轮对话前就获得 skills 系统指引。

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

SessionStart hook 注入的 `using-superpowers` skill 负责告知模型「当任务适用时主动加载相应 skill」。如果模型未触发，尝试在首条消息中明确表达任务意图（例如「帮我规划这个功能」而非「加个按钮」），或显式调用 `/skill:brainstorming`。
````

- [ ] **Step 2: 验证包含两种安装方式**

Run:
```bash
grep -c "Codex App" docs/README.codex.md
grep -c "Codex CLI" docs/README.codex.md
```
Expected: 每条至少 `1`。

- [ ] **Step 3: Commit**

```bash
git add docs/README.codex.md
git commit -m "docs(codex): 新增 Codex 安装与使用文档"
```

---

## Task 10: 新增 `docs/README.pi.md` 中文文档

**Files:**
- Create: `docs/README.pi.md`

- [ ] **Step 1: 写入文档**

写入 `docs/README.pi.md`：

````markdown
# Pi 安装与使用

Superpowers 作为 Pi package 分发，通过 TypeScript 扩展在 session 启动和压缩后注入 bootstrap。

## 安装

从 GitHub 仓库直接安装：

```bash
pi install git:github.com/evanfang0054/superpowers
```

## 本地开发模式

用本地 checkout 作为临时 package 运行 Pi：

```bash
pi -e /path/to/superpowers
```

## 工作原理

Pi 加载 Superpowers package 后：

1. **skills 发现** — 通过 `package.json` 的 `pi.skills` 字段（指向 `./skills`）发现全部 skills
2. **扩展加载** — 通过 `pi.extensions` 字段加载 `.pi/extensions/superpowers.ts`
3. **bootstrap 注入** — 扩展监听 5 个事件：
   - `session_start` — 标记需要注入 bootstrap
   - `session_compact` — 压缩后重新标记（关键：Pi 压缩会丢失上下文，必须重新注入）
   - `agent_end` — 单轮 agent 结束后停止注入
   - `context` — 实际注入点，检查去重标记 `BOOTSTRAP_MARKER`，构造 bootstrap message 插入到首个非 `compactionSummary` 消息之前
   - `resources_discover` — 声明 skills 目录给 Pi

bootstrap 内容是 `skills/using-superpowers/SKILL.md` 正文 + Pi 工具映射表，以 `<EXTREMELY_IMPORTANT>` 标记包裹。

## Pi 原生 skill 系统

Pi 有原生 skills 支持，不暴露 Claude Code 的 `Skill` 工具。当 Superpowers 指令要求调用 skill 时：
- 用 `read` 工具加载相关 `SKILL.md`，或
- 让人类显式调用 `/skill:name`

## 已知限制

Pi 核心不提供以下能力，需要可选 companion 包：

- **子 agent** — 需要 `pi-subagents` package 提供 `subagent` 工具。未安装时在当前 session 顺序执行，不要伪造 `Task` 调用。
- **任务列表** — 需要安装 todo/task 扩展。未安装时使用 plan 文件或仓库内 `TODO.md` 跟踪任务。
````

- [ ] **Step 2: 验证包含两种安装方式**

Run:
```bash
grep -c "pi install" docs/README.pi.md
grep -c "pi -e" docs/README.pi.md
```
Expected: 每条至少 `1`。

- [ ] **Step 3: Commit**

```bash
git add docs/README.pi.md
git commit -m "docs(pi): 新增 Pi 安装与使用文档"
```

---

## Task 11: 修改 `README.md` 补全平台矩阵

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 读取当前 README 的安装段**

当前 `README.md:57-65` 已有 Codex 段但内容简陋，`README.md:67-75` 有 OpenCode 段但无 Pi 段。

- [ ] **Step 2: 替换 Codex 段**

用 Edit 工具把 `README.md` 的 Codex 段：

```markdown
### Codex

告诉 Codex：

\`\`\`
Fetch and follow instructions from https://raw.githubusercontent.com/evanfang0054/superpowers/refs/heads/main/.codex/INSTALL.md
\`\`\`

**详细文档：** [docs/README.codex.md](docs/README.codex.md)
```

替换为：

```markdown
### Codex App

在 Codex App 侧边栏点击 **Plugins**，在 **Coding** 区找到 `Superpowers`，点击 `+` 安装。

### Codex CLI

打开插件搜索界面 `/plugins`，搜索 `superpowers`，选择 `Install Plugin`。

**详细文档：** [docs/README.codex.md](docs/README.codex.md)
```

- [ ] **Step 3: 在 OpenCode 段之前插入 Pi 段**

用 Edit 工具，在 `### OpenCode` 之前插入：

```markdown
### Pi

从 GitHub 仓库安装：

```bash
pi install git:github.com/evanfang0054/superpowers
```

本地开发模式：

```bash
pi -e /path/to/superpowers
```

**详细文档：** [docs/README.pi.md](docs/README.pi.md)

```

- [ ] **Step 4: 验证 README 含 Codex 和 Pi**

Run:
```bash
grep -c "Codex App" README.md
grep -c "Codex CLI" README.md
grep -c "### Pi" README.md
grep -c "pi install" README.md
```
Expected: 每条至少 `1`。

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs(readme): 补全 Codex App/CLI 和 Pi 平台安装说明"
```

---

## Task 12: 全量验收（对照 Contract 的 17 条 DoD）

**Files:** 无新增/修改，仅验证

- [ ] **Step 1: 跑全部 17 条 DoD 检查**

Run:
```bash
echo "=== DoD 1-2: codex manifest version 和 skills/hooks 字段 ==="
jq -r .version .codex-plugin/plugin.json
jq -r .skills .codex-plugin/plugin.json
jq -r .hooks .codex-plugin/plugin.json

echo "=== DoD 3: codex manifest 引用的 assets 存在 ==="
ls -l assets/superpowers-small.svg assets/app-icon.png

echo "=== DoD 4-6: pi 扩展 5 事件 + 常量 + type-only import ==="
node --check .pi/extensions/superpowers.ts
grep -c 'pi.on("resources_discover"' .pi/extensions/superpowers.ts
grep -c 'pi.on("session_start"' .pi/extensions/superpowers.ts
grep -c 'pi.on("session_compact"' .pi/extensions/superpowers.ts
grep -c 'pi.on("agent_end"' .pi/extensions/superpowers.ts
grep -c 'pi.on("context"' .pi/extensions/superpowers.ts
grep -c 'BOOTSTRAP_MARKER = ' .pi/extensions/superpowers.ts
grep -c 'EXTREMELY_IMPORTANT_MARKER = ' .pi/extensions/superpowers.ts
grep -c 'import type { ExtensionAPI }' .pi/extensions/superpowers.ts

echo "=== DoD 7-10: package.json pi 字段 ==="
jq -r '.pi.extensions[0]' package.json
jq -r '.pi.skills[0]' package.json
jq -r '.keywords[]' package.json | grep pi-package
jq -e '.main | not' package.json

echo "=== DoD 11: pi-tools.md 五类动作 ==="
grep -c "调用 skill" skills/using-superpowers/references/pi-tools.md
grep -c "读写\|读取文件" skills/using-superpowers/references/pi-tools.md
grep -c "运行 shell" skills/using-superpowers/references/pi-tools.md
grep -c "分发子 agent" skills/using-superpowers/references/pi-tools.md
grep -c "任务跟踪" skills/using-superpowers/references/pi-tools.md

echo "=== DoD 12-13: docs 存在 ==="
grep -c "Codex App" docs/README.codex.md
grep -c "Codex CLI" docs/README.codex.md
grep -c "pi install" docs/README.pi.md
grep -c "pi -e" docs/README.pi.md

echo "=== DoD 14: pi 测试通过 ==="
node --test tests/pi/test-pi-extension.mjs

echo "=== DoD 15: codex 测试通过 ==="
bash tests/codex-plugin-sync/test-sync-to-codex-plugin.sh

echo "=== DoD 16: version-bump.json 含 codex-plugin ==="
jq -r '.files[].path' .version-bump.json | grep codex-plugin

echo "=== DoD 17-18: bump-version --check 无漂移 ==="
./scripts/bump-version.sh --check

echo "=== DoD 19: README 含 Codex 和 Pi ==="
grep -c "Codex App" README.md
grep -c "### Pi" README.md
```

Expected: 所有命令退出码 0，最终 `bump-version.sh --check` 显示 `All declared files are in sync at 5.0.21-beta.5`。

- [ ] **Step 2: 如果任何检查失败，回相应 Task 修正后重跑 Step 1**

- [ ] **Step 3: 最终提交（如果有遗漏的修改）**

如果 Step 1 发现问题导致额外修改：
```bash
git add -A
git commit -m "fix: 验收检查发现的遗漏"
```

如果全部通过，无需额外提交。

---

## Self-Review

**Spec coverage check:**
- §3.1 新增文件 9 项 → Task 1-3, 5-7, 9-10 全覆盖
- §3.2 修改文件 3 项（package.json / .version-bump.json / README.md）→ Task 4, 8, 11 全覆盖
- §4 Pi 扩展详细设计 → Task 3（扩展源码）+ Task 4（package.json pi 字段）+ Task 5（pi-tools.md）
- §5 Codex manifest → Task 2
- §6 assets → Task 1
- §7 测试 → Task 6（Pi）+ Task 7（Codex）
- §8 文档 → Task 9, 10, 11
- §9 .version-bump.json → Task 8
- §10 验收 11 条 → Task 12 全覆盖

**Placeholder scan:** 无 TBD / TODO / "add error handling" 等。所有代码块都是完整可运行内容。

**Type consistency:**
- `BOOTSTRAP_MARKER` / `EXTREMELY_IMPORTANT_MARKER` 在 Task 3 扩展源码、Task 6 测试断言中一致使用
- 5 个事件名（`resources_discover` / `session_start` / `session_compact` / `agent_end` / `context`）在 Task 3 源码、Task 6 测试、Contract DoD 中逐字一致
- `pi-package` keyword 在 Task 4 package.json、Task 6 测试、Contract DoD 中一致
- 版本号 `5.0.21-beta.5` 在 Task 2 manifest、Task 4 package.json、Task 8 version-bump、Contract DoD 中一致

无遗漏。
