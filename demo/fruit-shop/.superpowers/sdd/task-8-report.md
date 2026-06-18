# Task 8 Report: order.service 接入 PinoLogger（下单成功）

## File Modified
- `packages/server/src/modules/order/order.service.ts`

## Changes
1. 顶部新增 `import { PinoLogger } from 'nestjs-pino';`
2. 构造函数追加末位参数 `private readonly logger: PinoLogger`，并设置 `this.logger.setContext(OrderService.name);`
3. `create()` 在 `commitTransaction()` 之后、`return this.findOne(...)` 之前插入 `this.logger.info(...)` 埋点，字段含 `orderId / orderNo / userId / totalAmount / itemCount`

## tsc Output
```
cd packages/server && pnpm exec tsc --noEmit
（无输出，编译通过）
```

## Commit
- SHA: `37f2cd1`
- Subject: `feat(logging): order.service 接入 PinoLogger（下单成功）`
- Diff: 1 file changed, 16 insertions(+), 1 deletion(-)

## Self-Review
- [x] 日志位置：在 `await queryRunner.commitTransaction();` 之后、`return this.findOne(userId, savedOrder.id);` 之前 —— 确保仅成功路径打印
- [x] `itemCount` 使用 `orderItems.length`，该数组在 try 块外定义，作用域内可访问
- [x] 未改动任何业务逻辑（事务边界、entity 字段、异常处理保持不变）
- [x] 构造函数调用 `this.logger.setContext(OrderService.name);`
- [x] PinoLogger 作为构造函数最后一个参数注入，不影响已有位置参数
- [x] tsc strict 模式通过
