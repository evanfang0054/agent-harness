# 鲜果集全栈应用设计文档

> 日期：2026-06-02
> 状态：待审核

## 概述

将现有两个静态 HTML 模板（首页 + 商品详情）改造为完整的全栈水果电商 H5 应用。采用 Monorepo 架构，后端 NestJS + MySQL + Redis，前端 React + Vite + TypeScript，Docker Compose 一键部署。

### 功能范围

标准电商版：商品浏览 + 分类筛选 + 购物车 + 下单 + 用户注册/登录 + JWT 认证 + 订单管理 + 简单后台（商品 CRUD）。不含真实支付集成。

---

## 一、Monorepo 项目结构

使用 **pnpm workspace**。

```
fruit-shop/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── docker-compose.yml
├── packages/
│   ├── shared/                    # 共享类型和工具
│   │   ├── package.json
│   │   └── src/
│   │       ├── types/
│   │       │   ├── product.ts     # Product, Category DTO
│   │       │   ├── user.ts        # User, LoginDTO, RegisterDTO
│   │       │   ├── cart.ts        # CartItem DTO
│   │       │   ├── order.ts       # Order, OrderItem DTO
│   │       │   └── api.ts         # ApiResponse<T>, PaginatedResponse<T>
│   │       └── constants.ts       # 订单状态等枚举
│   │
│   ├── server/                    # NestJS 后端
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── init.sql               # MySQL 建表 + 种子数据
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── modules/
│   │       │   ├── auth/          # 注册/登录/JWT 策略
│   │       │   ├── user/          # 用户信息 CRUD
│   │       │   ├── product/       # 商品 CRUD + 分类
│   │       │   ├── cart/          # 购物车
│   │       │   └── order/         # 订单
│   │       └── common/
│   │           ├── guards/        # JwtAuthGuard
│   │           ├── interceptors/  # 响应格式化
│   │           ├── filters/       # 异常过滤器
│   │           └── decorators/    # @CurrentUser 等
│   │
│   └── web/                       # React + Vite + TS 前端
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── Dockerfile
│       ├── nginx.conf
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── components/        # 可复用 UI 组件
│           ├── pages/             # 页面组件
│           ├── hooks/             # API hooks
│           ├── api/               # axios 实例 + 各模块 API
│           ├── store/             # zustand stores
│           └── styles/
│               └── animations.css # 迁移现有动画
```

---

## 二、数据库设计

### MySQL（6 张表）

#### users

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INT | PK, AUTO_INCREMENT | |
| phone | VARCHAR(20) | UNIQUE, NOT NULL | 登录账号 |
| password | VARCHAR(255) | NOT NULL | bcrypt 加密 |
| nickname | VARCHAR(50) | | 昵称 |
| avatar | VARCHAR(500) | | 头像 URL |
| created_at | DATETIME | DEFAULT NOW | |
| updated_at | DATETIME | ON UPDATE NOW | |

#### categories

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INT | PK, AUTO_INCREMENT | |
| name | VARCHAR(30) | NOT NULL | 分类名 |
| icon | VARCHAR(50) | | emoji 或图标标识 |
| sort_order | INT | DEFAULT 0 | 排序 |

#### products

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INT | PK, AUTO_INCREMENT | |
| name | VARCHAR(50) | NOT NULL | 商品名 |
| origin | VARCHAR(50) | | 产地 |
| price | DECIMAL(10,2) | NOT NULL | 现价 |
| original_price | DECIMAL(10,2) | | 原价 |
| unit | VARCHAR(20) | | 单位 |
| sweetness | VARCHAR(10) | | 甜度星级 |
| weight | VARCHAR(30) | | 规格描述 |
| description | TEXT | | 详细描述 |
| tags | JSON | | 标签数组 |
| image | VARCHAR(500) | | 主图 URL |
| color | VARCHAR(10) | | 品牌色 |
| category_id | INT | FK → categories.id | |
| stock | INT | DEFAULT 999 | 库存 |
| status | TINYINT | DEFAULT 1 | 1=上架 0=下架 |
| created_at | DATETIME | DEFAULT NOW | |
| updated_at | DATETIME | ON UPDATE NOW | |

#### carts

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INT | PK, AUTO_INCREMENT | |
| user_id | INT | FK → users.id | |
| product_id | INT | FK → products.id | |
| spec_label | VARCHAR(30) | NOT NULL | 规格名 |
| quantity | INT | NOT NULL DEFAULT 1 | |
| created_at | DATETIME | DEFAULT NOW | |
| updated_at | DATETIME | ON UPDATE NOW | |

联合唯一约束：`(user_id, product_id, spec_label)`

#### orders

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INT | PK, AUTO_INCREMENT | |
| order_no | VARCHAR(32) | UNIQUE, NOT NULL | 订单号 |
| user_id | INT | FK → users.id | |
| total_amount | DECIMAL(10,2) | NOT NULL | 总金额 |
| status | TINYINT | NOT NULL DEFAULT 0 | 0=待付款 1=已付款 2=已发货 3=已完成 4=已取消 |
| address | VARCHAR(200) | NOT NULL | 收货地址 |
| phone | VARCHAR(20) | NOT NULL | 收货电话 |
| remark | VARCHAR(200) | | 备注 |
| created_at | DATETIME | DEFAULT NOW | |
| updated_at | DATETIME | ON UPDATE NOW | |

#### order_items

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INT | PK, AUTO_INCREMENT | |
| order_id | INT | FK → orders.id | |
| product_id | INT | | 快照，不强制 FK |
| product_name | VARCHAR(50) | NOT NULL | 下单时快照 |
| spec_label | VARCHAR(30) | NOT NULL | |
| price | DECIMAL(10,2) | NOT NULL | 下单时快照 |
| quantity | INT | NOT NULL | |
| image | VARCHAR(500) | | 下单时快照 |

### Redis 缓存策略

| Key 模式 | 用途 | TTL |
|---|---|---|
| `product:list:{category}:{page}` | 商品列表缓存 | 5 min |
| `product:detail:{id}` | 商品详情缓存 | 10 min |
| `category:all` | 分类列表 | 30 min |
| `cart:user:{userId}` | 购物车数据 | 无过期（写穿透） |
| `token:blacklist:{jti}` | JWT 黑名单 | 与 token 剩余过期时间一致 |

ORM：**TypeORM**（装饰器风格，与 NestJS 一致）。

---

## 三、API 接口设计

### 统一响应格式

```typescript
// 成功
{ code: 0, data: T, message: 'success' }

// 分页
{ code: 0, data: { list: T[], total: number, page: number, limit: number } }

// 错误
{ code: 40001, message: '具体错误信息' }
```

### 错误码规范

| 范围 | 模块 |
|---|---|
| 40001-40099 | 认证（登录失败、token 过期、权限不足） |
| 40101-40199 | 用户 |
| 40201-40299 | 商品 |
| 40301-40399 | 购物车 |
| 40401-40499 | 订单 |

### 认证模块 `/api/auth`

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| POST | `/auth/register` | 注册 `{ phone, password, nickname }` | 无 |
| POST | `/auth/login` | 登录 `{ phone, password }` → `{ accessToken, refreshToken, user }` | 无 |
| POST | `/auth/refresh` | 刷新 token `{ refreshToken }` → `{ accessToken }` | 无 |
| POST | `/auth/logout` | 登出，accessToken 加入黑名单 | 需认证 |

### 用户模块 `/api/user`

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/user/profile` | 获取个人信息 | 需认证 |
| PUT | `/user/profile` | 更新昵称/头像 `{ nickname?, avatar? }` | 需认证 |

### 分类模块 `/api/categories`

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/categories` | 获取全部分类 | 无 |

### 商品模块 `/api/products`

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/products?category=&keyword=&page=1&limit=10` | 商品列表（筛选+分页） | 无 |
| GET | `/products/:id` | 商品详情 | 无 |
| POST | `/products` | 新增商品 | 需认证（admin） |
| PUT | `/products/:id` | 更新商品 | 需认证（admin） |
| DELETE | `/products/:id` | 删除商品 | 需认证（admin） |

### 购物车模块 `/api/cart`

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/cart` | 获取购物车列表 | 需认证 |
| POST | `/cart` | 加入购物车 `{ productId, specLabel, quantity }` | 需认证 |
| PUT | `/cart/:id` | 修改数量 `{ quantity }` | 需认证 |
| DELETE | `/cart/:id` | 删除购物车项 | 需认证 |

### 订单模块 `/api/orders`

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| POST | `/orders` | 创建订单 `{ items[], address, phone, remark? }` | 需认证 |
| GET | `/orders?status=&page=1&limit=10` | 我的订单列表 | 需认证 |
| GET | `/orders/:id` | 订单详情 | 需认证 |
| PUT | `/orders/:id/cancel` | 取消订单 | 需认证 |

### JWT 策略

- accessToken：15 min，Header `Authorization: Bearer xxx`
- refreshToken：7 days，httpOnly cookie
- 前端 axios 拦截器：401 时自动用 refreshToken 刷新，刷新失败跳登录页

---

## 四、前端页面设计

### 路由表

| 路径 | 页面 | 认证 | 说明 |
|---|---|---|---|
| `/` | 首页 | 无 | 迁移现有 HomePage |
| `/product/:id` | 商品详情 | 无 | 迁移现有 DetailPage |
| `/cart` | 购物车 | 需认证 | 新建 |
| `/checkout` | 下单确认 | 需认证 | 新建 |
| `/orders` | 订单列表 | 需认证 | 新建 |
| `/order/:id` | 订单详情 | 需认证 | 新建 |
| `/login` | 登录 | 无 | 新建 |
| `/register` | 注册 | 无 | 新建 |
| `/admin/products` | 商品管理 | 需认证(admin) | 新建 |

### 状态管理（Zustand，3 个 store）

```typescript
useAuthStore    // token, user, login(), logout(), refreshToken()
useCartStore    // items[], totalCount, addToCart(), removeFromCart(), syncFromServer()
useOrderStore   // checkoutItems[], currentOrder (仅 checkout 流程用)
```

### 前端迁移映射

| 现有组件 | 目标文件 | 改动点 |
|---|---|---|
| `FruitCard` | `components/ProductCard.tsx` | 数据改用 API 类型，onClick 用 react-router Link |
| `CategoryTabs` | `components/CategoryTabs.tsx` | 分类从 API 获取 |
| `SearchBar` | `components/SearchBar.tsx` | 关键词调 API 搜索 |
| `PromoBanner` | `components/PromoBanner.tsx` | 原样迁移 |
| `HomePage` | `pages/Home.tsx` | 商品列表改分页加载 |
| `DetailPage` 整组 | `pages/ProductDetail.tsx` | 数据从 API 获取，加购调 API |
| 动画 CSS | `styles/animations.css` | 原样迁移 |

### 技术选型

| 项 | 选择 |
|---|---|
| 路由 | react-router-dom v6 |
| HTTP | axios + 拦截器 |
| 状态管理 | zustand |
| 样式 | Tailwind CSS v4 |
| 构建 | Vite |

---

## 五、Docker 部署设计

### docker-compose.yml

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    ports: ['3306:3306']
    environment:
      MYSQL_DATABASE: fruit_shop
      MYSQL_ROOT_PASSWORD: root123
    volumes:
      - mysql-data:/var/lib/mysql
      - ./packages/server/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost']
      interval: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    volumes:
      - redis-data:/data

  server:
    build:
      context: .
      dockerfile: packages/server/Dockerfile
    ports: ['3000:3000']
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USERNAME: root
      DB_PASSWORD: root123
      DB_DATABASE: fruit_shop
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: your-jwt-secret-change-in-prod
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started

  web:
    build:
      context: .
      dockerfile: packages/web/Dockerfile
    ports: ['80:80']
    depends_on:
      - server

volumes:
  mysql-data:
  redis-data:
```

### 架构

```
浏览器 → Nginx(:80) ──静态资源──→ React SPA
                    └──/api/*───→ NestJS(:3000) ──→ MySQL(:3306)
                                                  └──→ Redis(:6379)
```

### Dockerfile 策略

**server**：多阶段构建
```dockerfile
FROM node:20-alpine AS builder
# pnpm install + build
FROM node:20-alpine
# 仅复制 dist + node_modules（production）
```

**web**：构建 + Nginx 运行
```dockerfile
FROM node:20-alpine AS builder
# pnpm install + vite build
FROM nginx:alpine
# 复制 dist → /usr/share/nginx/html
# 复制 nginx.conf
```

### Nginx 配置

```nginx
server {
    listen 80;

    # API 反向代理
    location /api/ {
        proxy_pass http://server:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA 路由 fallback
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # 静态资源长缓存
    location /assets/ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 启动命令

```bash
docker-compose up -d
```

首次启动自动：MySQL 执行 init.sql 建表 + 插入种子商品数据 → Redis 就绪 → NestJS 连接数据库启动 API → Nginx 托管前端 + 反向代理。

---

## 六、非功能性设计

### 认证流程

1. 用户注册/登录 → 后端返回 accessToken + refreshToken
2. 前端存储 accessToken 到内存（zustand），refreshToken 到 httpOnly cookie
3. 每次请求 Header 携带 `Authorization: Bearer <accessToken>`
4. NestJS JwtAuthGuard 校验 token
5. token 过期（401）→ 前端拦截器自动用 refreshToken 刷新
6. 刷新失败 → 清除状态，跳转登录页

### 错误处理

- 后端：统一异常过滤器，捕获所有异常返回标准 `{ code, message }` 格式
- 前端：axios 响应拦截器统一处理错误码，401 自动刷新 token，其他错误 Toast 提示

### 缓存策略

- 商品/分类读多写少，适合 Redis 缓存
- 写操作（增删改商品）自动清除对应缓存 key
- 购物车双写：Redis 做实时读写，MySQL 做持久化
