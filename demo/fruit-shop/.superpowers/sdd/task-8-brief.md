## Task 8: `order.service` 注入 PinoLogger + 下单埋点

**Files:**
- Modify: `packages/server/src/modules/order/order.service.ts`

- [ ] **Step 1: 修改 import 与构造函数**

文件顶部 import 区追加：
```ts
import { PinoLogger } from 'nestjs-pino';
```

构造函数追加 `private readonly logger: PinoLogger` 参数，并在体内设置 context：
```ts
constructor(
  @InjectRepository(OrderEntity)
  private readonly orderRepo: Repository<OrderEntity>,
  @InjectRepository(OrderItemEntity)
  private readonly orderItemRepo: Repository<OrderItemEntity>,
  @InjectRepository(CartEntity)
  private readonly cartRepo: Repository<CartEntity>,
  private readonly cartService: CartService,
  private readonly dataSource: DataSource,
  private readonly logger: PinoLogger,  // ← 新增
) {
  this.logger.setContext(OrderService.name);
}
```

- [ ] **Step 2: 在 `create` 方法事务提交后埋点**

修改 `create` 方法，在 `await queryRunner.commitTransaction();` 之后、`return this.findOne(userId, savedOrder.id);` 之前插入：

```ts
await queryRunner.commitTransaction();

this.logger.info(
  {
    orderId: savedOrder.id,
    orderNo,
    userId,
    totalAmount,
    itemCount: orderItems.length,
  },
  '订单创建成功',
);

return this.findOne(userId, savedOrder.id);
```

- [ ] **Step 3: 编译验证**

Run:
```bash
cd packages/server && pnpm exec tsc --noEmit
```
Expected: 无报错。

- [ ] **Step 4: 启动验证 D9（下单业务日志）**

前置：需先注册并登录、加购商品。完整 curl 链：
```bash
# 1. 登录拿 token
TOKEN=$(curl -sX POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900000001","password":"Pass1234"}' \
  | grep -o '\"accessToken\":\"[^\"]*\"' | cut -d'"' -f4)

# 2. 拿任意商品 id（公开接口 GET /api/products）
PID=$(curl -s http://localhost:3000/api/products | grep -o '\"id\":[0-9]*' | head -1 | cut -d':' -f2)

# 3. 加购
curl -sX POST http://localhost:3000/api/cart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"productId\":$PID,\"quantity\":1}" >/dev/null

# 4. 下单
curl -sX POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"address":"测试地址","phone":"13900000001"}' >/dev/null
```
Expected（终端 1）：
- 出现 `INFO` 日志：`订单创建成功`
- 字段含 `orderId / orderNo / userId / totalAmount / itemCount`
- 该日志的 `requestId` 与对应 access log 的 `requestId` 一致

- [ ] **Step 5: 提交**

```bash
git add packages/server/src/modules/order/order.service.ts
git commit -m "feat(logging): order.service 接入 PinoLogger（下单成功）"
```

---

