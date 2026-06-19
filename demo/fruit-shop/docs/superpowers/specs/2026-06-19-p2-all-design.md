# P2 全业务域设计

- **日期**：2026-06-19
- **状态**：待评审
- **作者**：brainstorming session
- **关联**：`docs/superpowers/specs/2026-06-19-web-api-gap-design.md` 第 7 节 P2
- **前置**：P0 + P1-A + P1-BC 已完成

---

## 1. 背景

P0 修复接口 bug + 库存校验，P1-A 落地用户中心，P1-BC 落地商品规格 + Banner + 推荐位迭代 + 清空购物车。P2 是 11 个全新业务域，一次性落地建立完整电商闭环。

## 2. 目标

1. **订单闭环**：支付→发货→收货→评价资格，退款流程
2. **用户互动**：地址簿、商品评价、收藏
3. **营销促销**：优惠券领取与下单抵扣
4. **搜索增强**：多维筛选、销量排序、搜索联想
5. **基础设施**：图片上传、分类 Admin CRUD

## 3. 非目标

- 不做支付网关接入（模拟支付）
- 不做评价回复（商家回复评价）
- 不做优惠券叠加使用（一单一券）
- 不做销量定时统计表（实时聚合 + 缓存）
- 不做搜索分词/ES（仅 LIKE）
- 不做对象存储（本地 uploads）
- 不做分类多级（仅一级）
- 不做图片压缩/水印

## 4. 总体架构

### 4.1 五组交付单元

```
P2-A 订单闭环（强耦合，先做）
  P2-6 状态流转：pay/ship/confirm
  P2-5 物流：ShippingEntity + Admin 发货
  P2-7 退款：OrderStatus 扩展 + RefundEntity + Admin 审批

P2-B 用户互动（独立）
  P2-1 地址簿：AddressEntity + /addresses CRUD + 独立管理页 + Checkout 接入
  P2-2 评价：ReviewEntity + /products/:id/reviews + /orders/:id/reviews
  P2-3 收藏：FavoriteEntity + toggle + /favorites 页

P2-C 营销（独立，影响 OrderEntity）
  P2-4 优惠券：CouponTemplate + UserCoupon 双表 + Admin CRUD + claim + 下单抵扣

P2-D 搜索增强（无新 entity）
  P2-9 多维筛选：QueryProductDto 扩展 + 销量聚合缓存
  P2-10 联想：/products/suggest + SearchBar 浮层

P2-E 基础设施（独立）
  P2-8 图片上传：multer + 本地 uploads/ + useStaticAssets
  P2-11 分类 Admin CRUD：拒绝删除有关联商品的分类
```

### 4.2 三端改动概览

```
shared（最先改最先生效）
├── types/order.ts        + REFUNDING/REFUNDED 枚举 + couponId/discountAmount/paidAt/shippedAt
├── types/address.ts      (新建)
├── types/review.ts       (新建)
├── types/favorite.ts     (新建)
├── types/coupon.ts       (新建)
├── types/shipping.ts     (新建)
├── types/refund.ts       (新建)
├── constants.ts          + 6 段业务码（退款/评价/收藏/地址/优惠券/上传/分类）
└── 必须重 build

server（NestJS）
├── entities/             + Address/Review/Favorite/Coupon/UserCoupon/Shipping/Refund 7 新 entity
├── modules/order/        + pay/ship/confirm/refund/approveRefund/rejectRefund 方法
├── modules/address/      (新建 module)
├── modules/review/       (新建 module)
├── modules/favorite/     (新建 module)
├── modules/coupon/       (新建 module)
├── modules/shipping/     (新建 module)
├── modules/refund/       (新建 module)
├── modules/upload/       (新建 module，multer)
├── modules/product/      + suggest + findAll 多维筛选 + category CRUD + bestsellers
├── main.ts               + useStaticAssets('/uploads/')
├── app.module.ts         + 注册新 module
└── uploads/              (新建目录)

web（React）
├── api/                  + address/review/favorite/coupon/shipping/refund/upload
├── pages/                + Addresses / Favorites / AdminCoupons / AdminCategories / AdminRefunds
├── components/           + ReviewSection / FavoriteToggle / UploadButton / SuggestionDropdown
├── pages/Checkout.tsx    接地址簿 + 优惠券
├── pages/ProductDetail.tsx + 评价区 + 收藏 toggle
├── pages/OrderDetail.tsx + 状态按钮（支付/确认收货/评价/退款）
├── pages/Profile.tsx     + 收藏/地址/优惠券菜单项
├── components/SearchBar.tsx + 联想浮层
└── router/index.tsx      + 新路由
```

## 5. P2-A 详细设计：订单闭环

### 5.1 数据模型

**OrderStatus 扩展**（shared/types/order.ts）：
```typescript
PENDING = 0, PAID = 1, SHIPPED = 2, COMPLETED = 3,
CANCELLED = 4, REFUNDING = 5, REFUNDED = 6
```

**OrderEntity 追加字段**：
```typescript
@Column({ name: 'coupon_id', nullable: true }) couponId: number | null;
@Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 }) discountAmount: number;
@Column({ name: 'paid_at', type: 'timestamp', nullable: true }) paidAt: Date | null;
@Column({ name: 'shipped_at', type: 'timestamp', nullable: true }) shippedAt: Date | null;
```

**ShippingEntity**（新建 `entities/shipping.entity.ts`）：
```typescript
@Entity('shippings')
export class ShippingEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'order_id' }) orderId: number;
  @Column({ length: 100 }) company: string;
  @Column({ name: 'tracking_no', length: 100 }) trackingNo: string;
  @Column({ name: 'shipped_at', type: 'timestamp' }) shippedAt: Date;
  @Column({ type: 'smallint', default: 0 }) status: number;  // 0=运输中 1=已签收
  @CreateDateColumn() createdAt: Date;
}
```

**RefundEntity**（新建 `entities/refund.entity.ts`）：
```typescript
@Entity('refunds')
export class RefundEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'order_id' }) orderId: number;
  @Column({ name: 'user_id' }) userId: number;
  @Column({ length: 500 }) reason: string;
  @Column({ name: 'prev_status', type: 'smallint' }) prevStatus: number;  // 申请退款前的状态（PAID 或 SHIPPED）
  @Column({ type: 'smallint', default: 0 }) status: number;  // 0=待审批 1=通过 2=拒绝
  @Column({ name: 'admin_note', length: 500, nullable: true }) adminNote: string | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

### 5.2 状态机

合法流转：
- `pay`（用户）：仅 `PENDING → PAID`
- `ship`（Admin）：仅 `PAID → SHIPPED`，同时创建 ShippingEntity
- `confirm`（用户）：仅 `SHIPPED → COMPLETED`
- `refund`（用户申请）：仅 `PAID` 或 `SHIPPED → REFUNDING`，记录 prevStatus
- `approveRefund`（Admin）：`REFUNDING → REFUNDED`，事务内回补库存 + 解绑优惠券
- `rejectRefund`（Admin）：`REFUNDING → 恢复 prevStatus`
- 非法流转抛 `ORDER_STATUS_ERROR`（40402 复用）

### 5.3 接口

| 方法 | 路径 | 守卫 | 说明 |
|---|---|---|---|
| PUT | `/api/orders/:id/pay` | JWT | 模拟支付，PENDING→PAID |
| POST | `/api/admin/orders/:id/ship` | JWT+ADMIN | 发货，body `{company, trackingNo}` |
| PUT | `/api/orders/:id/confirm` | JWT | 确认收货 |
| POST | `/api/orders/:id/refund` | JWT | 申请退款，body `{reason}` |
| GET | `/api/orders/:id/shipping` | JWT | 查物流 |
| GET | `/api/admin/refunds` | JWT+ADMIN | 退款列表（分页） |
| POST | `/api/admin/refunds/:id/approve` | JWT+ADMIN | 通过退款（回补库存 + 解绑券） |
| POST | `/api/admin/refunds/:id/reject` | JWT+ADMIN | 拒绝退款，body `{adminNote}` |

### 5.4 前端

- `OrderDetail.tsx` 按 status 显示按钮：PENDING→「去支付」、PAID/SHIPPED→「申请退款」、SHIPPED→「确认收货」、COMPLETED→「去评价」、REFUNDING→「退款审核中」、REFUNDED→「已退款」
- 新建 `pages/AdminRefunds.tsx`：退款审批页（表格 + 通过/拒绝 + 拒绝填 adminNote）

## 6. P2-B 详细设计：用户互动

### 6.1 地址簿（P2-1）

**AddressEntity**（新建）：
```typescript
@Entity('addresses')
export class AddressEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'user_id' }) userId: number;
  @Column({ name: 'recipient_name', length: 50 }) recipientName: string;
  @Column({ length: 20 }) phone: string;
  @Column({ length: 50 }) province: string;
  @Column({ length: 50 }) city: string;
  @Column({ length: 50 }) district: string;
  @Column({ length: 200 }) detail: string;
  @Column({ name: 'is_default', type: 'boolean', default: false }) isDefault: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

**接口**：
| 方法 | 路径 | 守卫 | 说明 |
|---|---|---|---|
| GET | `/api/addresses` | JWT | 全部地址，默认排第一 |
| POST | `/api/addresses` | JWT | 新建（若 isDefault，事务内其他置 false） |
| PUT | `/api/addresses/:id` | JWT | 修改 |
| DELETE | `/api/addresses/:id` | JWT | 删除（默认地址不可删，抛 ADDRESS_IS_DEFAULT） |
| PUT | `/api/addresses/:id/default` | JWT | 设为默认（事务内其他置 false） |

**CreateOrderDto 扩展**：增加 `addressId?: number`。下单时若有 addressId，读 AddressEntity 快照写入 Order.address/phone。

**前端**：
- 新建 `/addresses` 路由 + `pages/Addresses.tsx`（列表 + CRUD modal + 设默认）
- `Profile.tsx` 追加菜单项「我的地址」
- `Checkout.tsx` 地址区域改为「从地址簿选择 + 显示默认 + 跳转 /addresses 管理」，保留手输 fallback

### 6.2 评价（P2-2）

**ReviewEntity**（新建）：
```typescript
@Entity('reviews')
@Unique(['orderId', 'productId'])  // 一件一评
export class ReviewEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'product_id' }) productId: number;
  @Column({ name: 'user_id' }) userId: number;
  @Column({ name: 'order_id' }) orderId: number;
  @Column({ type: 'tinyint' }) rating: number;  // 1-5
  @Column({ type: 'text' }) content: string;
  @Column({ type: 'simple-json', nullable: true }) images: string[] | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

**接口**：
| 方法 | 路径 | 守卫 | 说明 |
|---|---|---|---|
| GET | `/api/products/:id/reviews?page=&limit=` | @Public | 商品评价列表（分页），含 user 昵称/头像 |
| POST | `/api/orders/:id/reviews` | JWT | 批量评价订单商品，body `{ reviews: [{productId, rating, content, images?}] }` |
| GET | `/api/reviews/mine` | JWT | 我的评价 |

**评价资格**：订单 status === COMPLETED + 归属当前用户 + `(orderId, productId)` 未评过。

**前端**：
- 新建 `components/ReviewSection.tsx`（商品详情页评价区，分页 + 平均分）
- `ProductDetail.tsx` 在 Description 与 RecommendFruits 之间插入 `<ReviewSection productId={product.id} />`
- `OrderDetail.tsx` COMPLETED 订单显示「去评价」按钮 → 弹 modal 批量评价

### 6.3 收藏（P2-3）

**FavoriteEntity**（新建）：
```typescript
@Entity('favorites')
@Unique(['userId', 'productId'])
export class FavoriteEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'user_id' }) userId: number;
  @Column({ name: 'product_id' }) productId: number;
  @CreateDateColumn() createdAt: Date;
}
```

**接口**：
| 方法 | 路径 | 守卫 | 说明 |
|---|---|---|---|
| POST | `/api/products/:id/favorite` | JWT | 收藏（已收藏抛 FAVORITE_EXISTS） |
| DELETE | `/api/products/:id/favorite` | JWT | 取消（未收藏抛 FAVORITE_NOT_FOUND） |
| GET | `/api/favorites?page=&limit=` | JWT | 我的收藏分页 |
| GET | `/api/products/:id/favorite-status` | JWT | 查是否已收藏 |

**前端**：
- 新建 `components/FavoriteToggle.tsx`（心形图标，已收藏实心）
- `ProductDetail.tsx` 导航栏插入 `<FavoriteToggle productId={id} />`
- 新建 `pages/Favorites.tsx`（分页列表）
- `Profile.tsx` 追加菜单项「我的收藏」→ `/favorites`

## 7. P2-C 详细设计：优惠券

### 7.1 数据模型

**CouponTemplateEntity**（Admin 配置，新建）：
```typescript
@Entity('coupon_templates')
export class CouponTemplateEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 100 }) name: string;
  @Column({ type: 'smallint' }) type: number;  // 0=满减 1=折扣 2=无门槛
  @Column({ name: 'min_amount', type: 'decimal', precision: 10, scale: 2, default: 0 }) minAmount: number;
  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 }) discountAmount: number;
  @Column({ name: 'discount_rate', type: 'decimal', precision: 3, scale: 2, nullable: true }) discountRate: number | null;
  @Column({ name: 'category_id', nullable: true }) categoryId: number | null;
  @Column({ name: 'total_count', type: 'int', default: 0 }) totalCount: number;
  @Column({ name: 'claimed_count', type: 'int', default: 0 }) claimedCount: number;
  @Column({ name: 'start_at', type: 'timestamp' }) startAt: Date;
  @Column({ name: 'end_at', type: 'timestamp' }) endAt: Date;
  @Column({ type: 'smallint', default: 1 }) status: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

**UserCouponEntity**（用户领取实例，新建）：
```typescript
@Entity('user_coupons')
export class UserCouponEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'user_id' }) userId: number;
  @Column({ name: 'coupon_id' }) couponId: number;
  @Column({ name: 'order_id', nullable: true }) orderId: number | null;
  @Column({ name: 'used_at', type: 'timestamp', nullable: true }) usedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}
```

### 7.2 类型与计算

| type | 名称 | 规则 |
|---|---|---|
| 0 | 满减 | subtotal >= minAmount → 减 discountAmount |
| 1 | 折扣 | subtotal >= minAmount → subtotal * discountRate |
| 2 | 无门槛 | 直接减 discountAmount |

适用范围：categoryId 为 null 时全场可用；否则限定该分类商品小计参与计算。

### 7.3 接口

| 方法 | 路径 | 守卫 | 说明 |
|---|---|---|---|
| GET | `/api/coupons/available` | JWT | 可领取模板（status=1 + 有效期内 + 未领完） |
| GET | `/api/coupons/mine` | JWT | 我的未使用券（含 template 详情） |
| POST | `/api/coupons/:id/claim` | JWT | 领取（事务内 totalCount 校验 + claimedCount++） |
| POST | `/api/coupons/preview` | JWT | body `{couponId, items}` → 返回 `{discountAmount, totalAfterDiscount}` |
| CRUD | `/api/admin/coupons` | JWT+ADMIN | 模板增删改查 |

### 7.4 下单抵扣流程

```
1. Checkout 选券 → POST /coupons/preview 算 discountAmount
2. 提交订单 → POST /orders body 含 couponId
3. OrderService.create 事务内：
   a. SELECT FOR UPDATE user_coupons（锁券）
   b. 校验：usedAt IS NULL、归属、有效期
   c. 重新计算 discountAmount（复用 preview 逻辑）
   d. totalAmount = subtotal - discountAmount（≥0，否则抛 COUPON_NOT_APPLICABLE）
   e. 创建订单 + 扣库存
   f. UPDATE user_coupons SET order_id, used_at=NOW()（核销）
4. cancel/approveRefund 时：回补库存 + 券解绑（usedAt/orderId 清空）
```

### 7.5 前端

- `Checkout.tsx` 价格汇总区追加优惠券行 + 弹出 modal 选券
- 新建 `pages/AdminCoupons.tsx`（模板 CRUD）
- 新建 `pages/MyCoupons.tsx`（已领取未使用）+ `Profile.tsx` 追加菜单项

## 8. P2-D 详细设计：搜索增强

### 8.1 多维筛选与排序（P2-9）

**QueryProductDto 扩展**：
```typescript
minPrice?: number;
maxPrice?: number;
origin?: string;
sortBy?: 'created_desc' | 'price_asc' | 'price_desc' | 'sales_desc';
```

**findAll 改造**：
- 条件：categoryId/keyword + minPrice/maxPrice/origin（andWhere）
- 排序分支：sales_desc 用 OrderItem 子查询聚合 + COALESCE；price_asc/desc 直接 orderBy；默认 created_desc
- cacheKey 含全部筛选维度

**bestsellers 接口**：`GET /api/products/bestsellers?limit=10`（@Public），Redis 缓存 5 分钟。

### 8.2 搜索联想（P2-10）

**接口**：`GET /api/products/suggest?keyword=&limit=10`（@Public）
- `SELECT name FROM products WHERE status=ON AND name LIKE '%keyword%' LIMIT 10`
- Redis 60s 缓存
- 响应 `{ list: string[] }`

**SearchBar 改造**：输入 debounce 300ms 调 suggest，下拉浮层显示，点击触发 onSearch，失焦延时 200ms 隐藏。

## 9. P2-E 详细设计：基础设施

### 9.1 图片上传（P2-8）

**依赖**：`multer` + `@types/multer`

**main.ts**：
```typescript
app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });
```

**UploadModule**：
```typescript
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads'),
      filename: (req, file, cb) => {
        const ext = extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new BadRequestException({ code: 41102, message: '仅支持图片文件' }), false);
      }
      cb(null, true);
    },
  }))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException({ code: 41103, message: '上传失败' });
    return { url: `/uploads/${file.filename}` };
  }
}
```

**Dockerfile**：`RUN mkdir -p uploads` + `VOLUME /app/uploads`

**前端 UploadButton 组件**（新建）：包装 `<input type="file" accept="image/*">`，调 `/upload/image`，返回 url 写入表单字段。

**接入点**：AdminProducts image 字段、AdminBanners image 字段、Profile 头像编辑。

### 9.2 分类 Admin CRUD（P2-11）

**接口扩展**（CategoryController）：
| 方法 | 路径 | 守卫 | 说明 |
|---|---|---|---|
| POST | `/api/categories` | JWT+ADMIN | 新建 |
| PUT | `/api/categories/:id` | JWT+ADMIN | 修改 |
| DELETE | `/api/categories/:id` | JWT+ADMIN | 删除（有关联商品拒绝） |

**删除校验**：
```typescript
async removeCategory(id) {
  const count = await this.productRepo.count({ where: { categoryId: id, status: ProductStatus.ON } });
  if (count > 0) {
    throw new BadRequestException({ code: 41201, message: `有 ${count} 个在售商品关联此分类` });
  }
  await this.categoryRepo.delete(id);
  await this.redis.del('categories:all');
}
```

**前端**：新建 `pages/AdminCategories.tsx`（表格 + CRUD modal）。

## 10. shared 变更汇总

| 变更 | 文件 |
|---|---|
| Order 接口追加 couponId/discountAmount/paidAt/shippedAt | `types/order.ts` |
| OrderStatus 枚举追加 REFUNDING=5/REFUNDED=6 | `types/order.ts` |
| 新增 Address/CreateAddressDTO/UpdateAddressDTO | `types/address.ts`（新建） |
| 新增 Review/CreateReviewDTO | `types/review.ts`（新建） |
| 新增 Favorite | `types/favorite.ts`（新建） |
| 新增 CouponTemplate/UserCoupon/CreateCouponDTO/CouponType | `types/coupon.ts`（新建） |
| 新增 Shipping | `types/shipping.ts`（新建） |
| 新增 Refund/RefundStatus | `types/refund.ts`（新建） |
| 新增 6 段业务码（退款/评价/收藏/地址/优惠券/上传/分类） | `constants.ts` |
| index.ts re-export 全部新类型 | `index.ts` |

每次改 `shared` 必须重 build：`pnpm --filter shared build`。

### 新业务码段

```
40601-40699 退款：REFUND_NOT_ALLOWED / REFUND_NOT_FOUND
40701-40799 评价：REVIEW_EXISTS / REVIEW_NOT_ALLOWED / REVIEW_NOT_FOUND
40801-40899 收藏：FAVORITE_EXISTS / FAVORITE_NOT_FOUND
40901-40999 地址：ADDRESS_NOT_FOUND / ADDRESS_IS_DEFAULT
41001-41099 优惠券：COUPON_NOT_FOUND / COUPON_EXPIRED / COUPON_USED / COUPON_SOLD_OUT / COUPON_MIN_NOT_MET / COUPON_NOT_APPLICABLE
41101-41199 上传：UPLOAD_FILE_TOO_LARGE / UPLOAD_INVALID_TYPE / UPLOAD_FAILED
41201-41299 分类：CATEGORY_HAS_PRODUCTS / CATEGORY_NOT_FOUND
```

## 11. 验收场景

### P2-A 订单闭环
| 场景 | 预期 |
|---|---|
| 模拟支付 | PENDING → PAID，paidAt 写入 |
| Admin 发货 | PAID → SHIPPED，ShippingEntity 创建 |
| 确认收货 | SHIPPED → COMPLETED |
| 申请退款 | PAID/SHIPPED → REFUNDING |
| 通过退款 | REFUNDING → REFUNDED，库存回补 |
| 拒绝退款 | REFUNDING → 恢复 prevStatus |
| 非法流转 | 抛 ORDER_STATUS_ERROR（40402） |

### P2-B 用户互动
| 场景 | 预期 |
|---|---|
| 地址 CRUD | 新建/编辑/删除/设默认 |
| Checkout 选地址 | Order.address 写快照 |
| 默认地址不可删 | 返回 ADDRESS_IS_DEFAULT |
| COMPLETED 订单评价 | 批量评价成功 |
| 重复评价 | 返回 REVIEW_EXISTS |
| 商品评价列表 | 分页展示含用户昵称 |
| 收藏 toggle | 心形切换 |
| 重复收藏 | 返回 FAVORITE_EXISTS |
| 收藏列表 | 分页展示 |
| Profile 入口 | 「我的地址」「我的收藏」可见 |

### P2-C 优惠券
| 场景 | 预期 |
|---|---|
| Admin 创建满减券 | type=0, minAmount/discountAmount |
| 用户领取 | UserCoupon 创建，claimedCount++ |
| 领取超限 | 返回 COUPON_SOLD_OUT |
| 下单使用 | totalAmount 扣减，券核销 |
| 重复使用 | 返回 COUPON_USED |
| 不满足门槛 | 返回 COUPON_MIN_NOT_MET |
| 取消订单 | 库存回补 + 券解绑 |
| 退款通过 | 库存回补 + 券解绑 |

### P2-D 搜索增强
| 场景 | 预期 |
|---|---|
| 价格区间筛选 | minPrice/maxPrice 生效 |
| 产地筛选 | origin LIKE 匹配 |
| 销量排序 | sales_desc 聚合降序 |
| 搜索联想 | 输入「苹」下拉显示匹配商品名 |

### P2-E 基础设施
| 场景 | 预期 |
|---|---|
| 图片上传 ≤2MB | 成功返回 /uploads/xxx.jpg |
| 超大文件 | 返回 41101 |
| 非图片 MIME | 返回 41102 |
| Admin 表单用上传 | image 字段改上传组件 |
| 分类 CRUD | 新建/修改/删除 |
| 删除有关联商品分类 | 返回 41201 |

## 12. 风险与权衡

| 风险 | 影响 | 缓解 |
|---|---|---|
| 一次性做 11 项 | PR 巨大、回归风险高 | 每 3-4 项插入全量回归 checkpoint |
| 销量子查询性能 | 大数据量下慢 | Redis 缓存 bestsellers 5 分钟 |
| 优惠券并发核销 | 高并发可能重复使用 | SELECT FOR UPDATE user_coupons 行锁 |
| 上传文件安全 | 恶意文件风险 | MIME 白名单 + 2MB 限制 + 文件名随机化 |
| RefundEntity prevStatus 推断 | 拒绝退款恢复错状态 | RefundEntity 显式存 prevStatus 字段 |
| 地址簿默认值唯一 | 并发设置可能破坏 | 设默认走事务，先全置 false 再设一条 true |
| 状态机扩展破坏 cancel | cancel 仅 PENDING 可用 | cancel 校验不变；REFUNDING 不可 cancel |
| 多维筛选 cacheKey 漂移 | 旧缓存命中错结果 | cacheKey 含全部筛选维度 |
| Docker uploads 卷 | 容器重建丢文件 | Dockerfile VOLUME + compose 挂载 |
| 优惠券与订单事务交叉 | create/cancel/approveRefund 都要处理券 | 三处统一在事务内核销/解绑 |

## 13. 测试策略

**后端 e2e**（沿用 jest + supertest）：
- `test/order.flow.e2e-spec.ts`：完整流转 pay→ship→confirm→refund（依赖 P2-A）
- `test/address.e2e-spec.ts`：CRUD + 设默认 + 默认不可删
- `test/review.e2e-spec.ts`：评价资格、重复评、列表
- `test/favorite.e2e-spec.ts`：toggle + 重复 + 列表
- `test/coupon.e2e-spec.ts`：领取、核销、超限、门槛、取消解绑
- `test/upload.e2e-spec.ts`：成功、超大、非图片
- `test/category.crud.e2e-spec.ts`：CRUD + 有关联商品不可删
- `test/product.search.e2e-spec.ts`：多维筛选 + 销量排序 + suggest

**前端**（无测试框架）：
- TypeScript 构建通过
- docker compose 浏览器手动验证

**全量回归**：每 3-4 个子项后跑 `shared build + server test/e2e + web build`。

## 14. 后续步骤

1. 用户评审本设计文档
2. 进入 `sprint-contract` 协商 Definition of Done
3. 进入 `writing-plans` 产出实施计划（按 5 组分阶段，每阶段含 checkpoint）
4. Subagent-Driven Development 执行实施
