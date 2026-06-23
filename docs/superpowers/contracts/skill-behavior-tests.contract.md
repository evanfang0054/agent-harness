# Sprint Contract: skill-behavior 测试套件（阶段二）

## Definition of Done
- [ ] `tests/skill-behavior/_helpers/run-skill.sh` 存在，支持 `run-skill.sh <skill-name> <prompt-file> [max-turns]`，独立 HOME + stream-json 输出
- [ ] `tests/skill-behavior/_helpers/assert-skill-triggered.sh` 提供 `assert_skill_triggered` 与 `assert_output_contains` 两个函数
- [ ] 28 个 skill 目录 `tests/skill-behavior/<skill-name>/` 全部创建，每个含 `run-test.sh` + 至少 1 个 prompt
- [ ] 每个 skill 的 `run-test.sh` 实际 headless 跑通：触发断言 PASS（行为断言可因模型漂移放宽，但触发必须稳定）
- [ ] 所有 `run-test.sh` 退出码语义正确（成功 0、失败非 0）
- [ ] CLAUDE.md "其他测试套件" 新增 skill-behavior 条目，标注全量运行约 15-40 分钟

## Boundary Conditions
- Must support: 单 skill 独立运行（`cd tests/skill-behavior/<skill> && ./run-test.sh`），不依赖父 runner
- Must not break: 现有任何 `tests/*` 套件（新目录独立，不修改现有文件）
- Must not introduce: bats-core / Node tsx / obra drill harness / skill-creator（YAGNI）
- Performance: 单 skill 30-90s 可接受；全量 15-40 分钟可接受

## Acceptance Criteria
- Computational: `ls tests/skill-behavior/ | grep -v _helpers | wc -l` 等于 28
- Computational: 任意挑 3 个 skill 的 `run-test.sh` 实际运行，触发断言全 PASS
- Inferential: prompts 设计自然（不带 skill 名字即可隐式触发），断言关键词覆盖中英文

## Negotiation Record
- Generator Round 1: 初版 spec 已给出 28 skill 断言矩阵
- Evaluator Round 1: 确认接受矩阵分组，但要求拆 4-6 个 PR 而非一个巨型 PR
- Generator Round 2: 按功能分 4 批 plan（决策 / 执行设计 / 执行实现+审查 / 质量+基础设施+元）
- Evaluator Round 2: 接受
