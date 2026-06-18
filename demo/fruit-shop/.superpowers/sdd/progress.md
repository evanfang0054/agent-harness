# SDD Progress: Server 基础设施增强

- Plan: `docs/superpowers/plans/2026-06-18-server-infra-enhancement.md`
- Branch base: `4f9f636`
- Final HEAD: `993a5a2` (final-review fixes included)

## Tasks

- [x] Task 1: 安装依赖与 Jest 配置 (b8ad206..1afdcac, review clean; Important: NestJS-version peer dep risk — 已在 final review 修复：swagger 降级 v8)
- [x] Task 2: 接入 Swagger (d5c2cd4, review clean; final review 降级 @nestjs/swagger 11→8 b89f721)
- [x] Task 3: 接入速率限制 (cfd5b4e, review clean; final review 993a5a2 规范化 ThrottlerException message)
- [x] Task 4: 接入健康检查 (aadc7b6..6ef3b59, review clean; final review 993a5a2 加 @SkipThrottle)
- [x] Task 5: Auth 模块单元测试 (429341d, review clean)
- [x] Task 6: User 模块单元测试 (b8ad206, review clean)
- [x] Task 7: Product + Category 模块单元测试 (80adbe3, review clean)
- [x] Task 8: Cart 模块单元测试 (8f766fd..be20fd8, review clean)
- [x] Task 9: Order 模块单元测试 (09f27e8, review clean; Minor: findAll 缺少显式 toHaveBeenCalledWith)
- [x] Task 10: 集成测试基础设施 (16a55d6..cd5a8a3, review clean; Minor: any 类型)
- [x] Task 11: Auth 集成测试 (16a55d6..cd5a8a3, review APPROVED; 修复生产 bootstrap bug: AppModule providers)
- [x] Task 12: User 集成测试 (cd5a8a3..d994a77, review APPROVED clean)
- [x] Task 13: Product + Category 集成测试 (d994a77..c76df70, review APPROVED; Minor: cleanDatabase 不清 Redis 缓存)
- [x] Task 14: Cart 集成测试 (c76df70..731795b, review APPROVED clean)
- [x] Task 15: Order 集成测试 (731795b..c7ab487, review APPROVED clean)
- [x] Task 16: Health 集成测试 (c7ab487..4d7e37f, review APPROVED clean)
- [x] Task 17: 全量测试 + 限流验证 (4d7e37f..85b3dfd, review APPROVED; Minor: any 类型；brief Promise.all 改顺序循环避免 ECONNRESET)

## Final whole-branch review (832ed45..993a5a2)

- Reviewer verdict: Ready to merge with fixes
- Fixes applied (3 commits):
  - f9c00cb: Critical — `.env.test` 实际加载（NODE_ENV=test）+ REDIS_DB 生效；附带修复 JWT 字符串过期时间 bug
  - b89f721: Important — @nestjs/swagger 11→8（Nest 10 peer dep；npm 无 v9/v10，v8.1.1 是 Nest 10 最新兼容）
  - 993a5a2: Important — ThrottlerException body 规范化 + HealthController @SkipThrottle
- Post-fix 验证：unit 20/20、e2e 45/45、build clean
- Pending human action: `fruit_shop_test` 数据库需在运行 e2e 的机器上预创建 + seed（见 final-review-fix-report.md）
