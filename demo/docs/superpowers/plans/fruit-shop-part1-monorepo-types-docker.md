# 鲜果集全栈应用 — 实现计划 Part 1

> Monorepo 脚手架 + 共享类型 + Docker 部署

## 前置条件

- Node v20.19.2, pnpm 10.27.0, Docker 29.1.2
- 项目根目录: `fruit-shop/` (monorepo 根)
- 所有文件路径相对于 `fruit-shop/`

---

## Task 1: Monorepo 脚手架搭建

**Files:**
- Create: `fruit-shop/package.json`
- Create: `fruit-shop/pnpm-workspace.yaml`
- Create: `fruit-shop/tsconfig.base.json`
- Create: `fruit-shop/.gitignore`
- Create: `fruit-shop/packages/shared/package.json`
- Create: `fruit-shop/packages/shared/tsconfig.json`
- Create: `fruit-shop/packages/server/package.json`
- Create: `fruit-shop/packages/server/tsconfig.json`
- Create: `fruit-shop/packages/web/package.json`
- Create: `fruit-shop/packages/web/tsconfig.json`

- [ ] **Step 1: 创建 monorepo 根目录和目录结构**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/superpowers/demo/fruit-shop
mkdir -p packages/shared/src packages/server/src packages/web/src
```

- [ ] **Step 2: 创建根 package.json**

```json
fruit-shop/package.json
```

```json
{
  "name": "fruit-shop",
  "version": "1.0.0",
  "private": true,
  "description": "鲜果集 - 新鲜水果产地直发",
  "scripts": {
    "dev:shared": "pnpm --filter shared dev",
    "dev:server": "pnpm --filter server dev",
    "dev:web": "pnpm --filter web dev",
    "build:shared": "pnpm --filter shared build",
    "build:server": "pnpm --filter server build",
    "build:web": "pnpm --filter web build",
    "build": "pnpm build:shared && pnpm build:server && pnpm build:web",
    "lint": "pnpm -r lint",
    "clean": "rm -rf packages/*/dist packages/*/node_modules node_modules"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=10.0.0"
  }
}
```

- [ ] **Step 3: 创建 pnpm-workspace.yaml**

```yaml
fruit-shop/pnpm-workspace.yaml
```

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 4: 创建 tsconfig.base.json**

```json
fruit-shop/tsconfig.base.json
```

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node"
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: 创建 .gitignore**

```
fruit-shop/.gitignore
```

```
node_modules/
dist/
*.log
.env
.env.local
.DS_Store
```

- [ ] **Step 6: 创建 packages/shared/package.json**

```json
fruit-shop/packages/shared/package.json
```

```json
{
  "name": "shared",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 7: 创建 packages/shared/tsconfig.json**

```json
fruit-shop/packages/shared/tsconfig.json
```

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

> 注：`tsconfig.base.json` 已设置 `"module": "CommonJS"`，shared 包继承此配置，输出 CJS 格式。server 使用 `require('shared')` 可正常加载。

- [ ] **Step 8: 创建 packages/server/package.json**

```json
fruit-shop/packages/server/package.json
```

```json
{
  "name": "server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js"
  },
  "dependencies": {
    "shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "ts-node-dev": "^2.0.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 9: 创建 packages/server/tsconfig.json**

```json
fruit-shop/packages/server/tsconfig.json
```

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "CommonJS"
  },
  "include": ["src"]
}
```

- [ ] **Step 10: 创建 packages/web/package.json**

```json
fruit-shop/packages/web/package.json
```

```json
{
  "name": "web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "shared": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "axios": "^1.7.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 11: 创建 packages/web/tsconfig.json**

```json
fruit-shop/packages/web/tsconfig.json
```

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

- [ ] **Step 12: 安装依赖**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/superpowers/demo/fruit-shop
pnpm install
```

- [ ] **Step 13: Commit**

```bash
git add fruit-shop/package.json fruit-shop/pnpm-workspace.yaml fruit-shop/tsconfig.base.json fruit-shop/.gitignore fruit-shop/packages/
git commit -m "feat(fruit-shop): 初始化 monorepo 脚手架 — pnpm workspace + tsconfig base + 三个子包"
```

---

## Task 2: 共享类型包 (packages/shared)

**Files:**
- Create: `fruit-shop/packages/shared/src/types/product.ts`
- Create: `fruit-shop/packages/shared/src/types/user.ts`
- Create: `fruit-shop/packages/shared/src/types/cart.ts`
- Create: `fruit-shop/packages/shared/src/types/order.ts`
- Create: `fruit-shop/packages/shared/src/types/api.ts`
- Create: `fruit-shop/packages/shared/src/constants.ts`
- Create: `fruit-shop/packages/shared/src/index.ts`

- [ ] **Step 1: 创建 product.ts**

```typescript
fruit-shop/packages/shared/src/types/product.ts
```

```typescript
export interface Product {
  id: number;
  name: string;
  origin: string;
  price: number;
  originalPrice: number | null;
  unit: string;
  sweetness: string;
  weight: string;
  description: string | null;
  tags: string[] | null;
  image: string;
  color: string;
  categoryId: number;
  stock: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export enum ProductStatus {
  OFF = 0,
  ON = 1,
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  sortOrder: number;
}
```

- [ ] **Step 2: 创建 user.ts**

```typescript
fruit-shop/packages/shared/src/types/user.ts
```

```typescript
export interface User {
  id: number;
  phone: string;
  nickname: string | null;
  avatar: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface LoginDTO {
  phone: string;
  password: string;
}

export interface RegisterDTO {
  phone: string;
  password: string;
  nickname?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
```

- [ ] **Step 3: 创建 cart.ts**

```typescript
fruit-shop/packages/shared/src/types/cart.ts
```

```typescript
import { ProductStatus } from './product';

export interface CartItem {
  id: number;
  userId: number;
  productId: number;
  specLabel: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartDTO {
  productId: number;
  specLabel: string;
  quantity?: number;
}

export interface UpdateCartDTO {
  quantity: number;
}

export interface CartItemWithProduct extends CartItem {
  product: {
    id: number;
    name: string;
    price: number;
    originalPrice: number | null;
    image: string;
    unit: string;
    stock: number;
    status: ProductStatus;
  };
}
```

- [ ] **Step 4: 创建 order.ts**

```typescript
fruit-shop/packages/shared/src/types/order.ts
```

```typescript
export interface Order {
  id: number;
  orderNo: string;
  userId: number;
  totalAmount: number;
  status: OrderStatus;
  address: string;
  phone: string;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export enum OrderStatus {
  PENDING = 0,
  PAID = 1,
  SHIPPED = 2,
  COMPLETED = 3,
  CANCELLED = 4,
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  specLabel: string;
  price: number;
  quantity: number;
  image: string;
}

export interface CreateOrderDTO {
  address: string;
  phone: string;
  remark?: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}
```

- [ ] **Step 5: 创建 api.ts**

```typescript
fruit-shop/packages/shared/src/types/api.ts
```

```typescript
export interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  message: string;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
```

- [ ] **Step 6: 创建 constants.ts**

```typescript
fruit-shop/packages/shared/src/constants.ts
```

```typescript
/**
 * 业务错误码规范
 * 40001-40099 认证相关
 * 40101-40199 用户相关
 * 40201-40299 商品相关
 * 40301-40399 购物车相关
 * 40401-40499 订单相关
 */
export const ErrorCode = {
  // 认证 40001-40099
  AUTH_FAILED: 40001,
  TOKEN_EXPIRED: 40002,
  TOKEN_INVALID: 40003,
  REFRESH_TOKEN_INVALID: 40004,
  UNAUTHORIZED: 40005,
  FORBIDDEN: 40006,

  // 用户 40101-40199
  USER_NOT_FOUND: 40101,
  PHONE_EXISTS: 40102,
  PHONE_INVALID: 40103,
  PASSWORD_INVALID: 40104,

  // 商品 40201-40299
  PRODUCT_NOT_FOUND: 40201,
  PRODUCT_OFF_SALE: 40202,

  // 购物车 40301-40399
  CART_ITEM_NOT_FOUND: 40301,
  CART_ITEM_EXISTS: 40302,
  CART_EMPTY: 40303,

  // 订单 40401-40499
  ORDER_NOT_FOUND: 40401,
  ORDER_STATUS_ERROR: 40402,
  ORDER_CANCEL_NOT_ALLOWED: 40403,
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * 错误码 -> 默认中文消息
 */
export const ErrorMessage: Record<ErrorCodeType, string> = {
  [ErrorCode.AUTH_FAILED]: '手机号或密码错误',
  [ErrorCode.TOKEN_EXPIRED]: 'Token 已过期',
  [ErrorCode.TOKEN_INVALID]: 'Token 无效',
  [ErrorCode.REFRESH_TOKEN_INVALID]: 'Refresh Token 无效，请重新登录',
  [ErrorCode.UNAUTHORIZED]: '未登录',
  [ErrorCode.FORBIDDEN]: '无权限访问',

  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.PHONE_EXISTS]: '手机号已注册',
  [ErrorCode.PHONE_INVALID]: '手机号格式不正确',
  [ErrorCode.PASSWORD_INVALID]: '密码格式不正确',

  [ErrorCode.PRODUCT_NOT_FOUND]: '商品不存在',
  [ErrorCode.PRODUCT_OFF_SALE]: '商品已下架',

  [ErrorCode.CART_ITEM_NOT_FOUND]: '购物车条目不存在',
  [ErrorCode.CART_ITEM_EXISTS]: '购物车已存在该商品',
  [ErrorCode.CART_EMPTY]: '购物车为空',

  [ErrorCode.ORDER_NOT_FOUND]: '订单不存在',
  [ErrorCode.ORDER_STATUS_ERROR]: '订单状态异常',
  [ErrorCode.ORDER_CANCEL_NOT_ALLOWED]: '仅待付款订单可取消',
};

/**
 * 成功响应码
 */
export const SUCCESS_CODE = 0;
```

- [ ] **Step 7: 创建 index.ts (barrel export)**

```typescript
fruit-shop/packages/shared/src/index.ts
```

```typescript
// Types
export type { Product, Category } from './types/product';
export { ProductStatus } from './types/product';

export type { User, LoginDTO, RegisterDTO, LoginResponse } from './types/user';
export { UserRole } from './types/user';

export type { CartItem, AddToCartDTO, UpdateCartDTO, CartItemWithProduct } from './types/cart';

export type { Order, OrderItem, CreateOrderDTO, OrderWithItems } from './types/order';
export { OrderStatus } from './types/order';

export type { ApiResponse, PaginatedResponse, PaginationQuery } from './types/api';

// Constants
export { ErrorCode, ErrorMessage, SUCCESS_CODE } from './constants';
export type { ErrorCodeType } from './constants';
```

- [ ] **Step 8: 验证 shared 包编译通过**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/superpowers/demo/fruit-shop
pnpm --filter shared build
```

预期: `packages/shared/dist/` 下生成 `.js`, `.d.ts`, `.js.map`, `.d.ts.map` 文件。

- [ ] **Step 9: Commit**

```bash
git add fruit-shop/packages/shared/
git commit -m "feat(fruit-shop): 共享类型包 — Product/User/Cart/Order DTO + 错误码常量"
```

---

## Task 3: init.sql (6张表 + 种子数据)

**Files:**
- Create: `fruit-shop/packages/server/init.sql`

- [ ] **Step 1: 创建 init.sql**

```sql
fruit-shop/packages/server/init.sql
```

```sql
-- ============================================
-- 鲜果集 - 数据库初始化脚本
-- MySQL 8.0
-- ============================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- -------------------------------------------
-- 1. users
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `nickname` VARCHAR(50) DEFAULT NULL,
  `avatar` VARCHAR(500) DEFAULT NULL,
  `role` VARCHAR(10) NOT NULL DEFAULT 'user',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------
-- 2. categories
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(30) NOT NULL,
  `icon` VARCHAR(50) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------
-- 3. products
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `origin` VARCHAR(50) DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `original_price` DECIMAL(10,2) DEFAULT NULL,
  `unit` VARCHAR(20) DEFAULT NULL,
  `sweetness` VARCHAR(10) DEFAULT NULL,
  `weight` VARCHAR(30) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `tags` JSON DEFAULT NULL,
  `image` VARCHAR(500) DEFAULT NULL,
  `color` VARCHAR(10) DEFAULT NULL,
  `category_id` INT DEFAULT NULL,
  `stock` INT NOT NULL DEFAULT 999,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------
-- 4. carts
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS `carts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `spec_label` VARCHAR(30) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_carts_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_carts_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  CONSTRAINT `uk_carts_user_product_spec` UNIQUE (`user_id`, `product_id`, `spec_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------
-- 5. orders
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_no` VARCHAR(32) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 0,
  `address` VARCHAR(200) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `remark` VARCHAR(200) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------
-- 6. order_items
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT DEFAULT NULL,
  `product_name` VARCHAR(50) NOT NULL,
  `spec_label` VARCHAR(30) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `quantity` INT NOT NULL,
  `image` VARCHAR(500) DEFAULT NULL,
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 种子数据: 分类 (5 个)
-- ============================================
INSERT INTO `categories` (`id`, `name`, `icon`, `sort_order`) VALUES
(1, 'tropical',   '🌴', 1),
(2, 'berry',      '🫐', 2),
(3, 'citrus',     '🍊', 3),
(4, 'imported',   '✈️', 4),
(5, 'all',        '🍽️', 0);

-- ============================================
-- 种子数据: 商品 (6 个)
-- ============================================
INSERT INTO `products` (`id`, `name`, `origin`, `price`, `original_price`, `unit`, `sweetness`, `weight`, `description`, `tags`, `image`, `color`, `category_id`, `stock`, `status`) VALUES
(1, '阳光芒果',   '海南三亚',
  29.90, 49.90, '斤',   '★★★★★', '350-450g/个',
  '海南三亚树上自然熟芒果，果肉细腻无纤维，甜度高，香气浓郁。',
  '["当季爆款", "树上熟", "包邮"]',
  'https://images.unsplash.com/photo-1757281096599-b9165ba74008?fm=jpg&q=80&w=800&auto=format&fit=crop',
  '#FFD32A', 1, 999, 1),

(2, '丹东草莓',   '辽宁丹东',
  39.90, 59.90, '盒/300g', '★★★★☆', '15-25g/颗',
  '辽宁丹东产地直发红颜草莓，颗颗饱满，酸甜多汁。',
  '["新品", "产地直发"]',
  'https://images.unsplash.com/photo-1708100769120-015acf75bcc1?fm=jpg&q=80&w=800&auto=format&fit=crop',
  '#FF6B6B', 2, 999, 1),

(3, '智利车厘子', '智利',
  79.90, 119.90, '斤',    '★★★★★', '10-12g/颗',
  '智利进口 JJ 级车厘子，果径大、色泽深、口感脆甜。',
  '["进口", "JJ级"]',
  'https://images.unsplash.com/photo-1559619479-25dfed32ee96?fm=jpg&q=80&w=800&auto=format&fit=crop',
  '#A3183B', 4, 999, 1),

(4, '云南蓝莓',   '云南红河',
  24.90, 39.90, '盒/125g', '★★★★☆', '12-18mm',
  '云南高原蓝莓，果粒大、花青素含量高，新鲜直达。',
  '["高原种植", "花青素"]',
  'https://images.unsplash.com/photo-1510154011132-f48b8eabd172?fm=jpg&q=80&w=800&auto=format&fit=crop',
  '#5F27CD', 2, 999, 1),

(5, '赣南脐橙',   '江西赣州',
  19.90, 34.90, '斤',    '★★★★☆', '250-350g/个',
  '赣南脐橙地标产品，皮薄多汁，甜中带微酸，维C丰富。',
  '["地标产品", "薄皮"]',
  'https://images.unsplash.com/photo-1547514701-42782101795e?fm=jpg&q=80&w=800&auto=format&fit=crop',
  '#F39C12', 3, 999, 1),

(6, '山竹',       '泰国',
  45.90, 68.00, '斤',    '★★★★★', '30-50g/个',
  '泰国直采山竹，果壳薄、果肉白嫩、清甜爽口。',
  '["进口", "泰国直采"]',
  'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?fm=jpg&q=80&w=800&auto=format&fit=crop',
  '#6C3483', 1, 999, 1);
```

- [ ] **Step 2: 验证 init.sql 语法**

```bash
# 可选: 如果本地有 mysql 客户端，可以验证语法
# docker run --rm mysql:8.0 mysql --help > /dev/null 2>&1 && echo "MySQL image available"
docker run --rm mysql:8.0 mysqld --verbose --help 2>&1 | head -1
```

- [ ] **Step 3: Commit**

```bash
git add fruit-shop/packages/server/init.sql
git commit -m "feat(fruit-shop): init.sql — 6张表 + 6条商品种子数据 + 5个分类"
```

---

## Task 4: Docker 配置

**Files:**
- Create: `fruit-shop/packages/server/Dockerfile`
- Create: `fruit-shop/packages/web/Dockerfile`
- Create: `fruit-shop/packages/web/nginx.conf`
- Create: `fruit-shop/docker-compose.yml`

- [ ] **Step 1: 创建 server Dockerfile (多阶段构建)**

```dockerfile
fruit-shop/packages/server/Dockerfile
```

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN corepack enable && pnpm install --frozen-lockfile
COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/
RUN pnpm --filter shared build && pnpm --filter server build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
EXPOSE 3000
CMD ["node", "packages/server/dist/main.js"]
```

- [ ] **Step 2: 创建 web Dockerfile (构建 + Nginx)**

```dockerfile
fruit-shop/packages/web/Dockerfile
```

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/web/package.json packages/web/
RUN corepack enable && pnpm install --frozen-lockfile
COPY packages/shared/ packages/shared/
COPY packages/web/ packages/web/
RUN pnpm --filter shared build && pnpm --filter web build

FROM nginx:alpine
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: 创建 nginx.conf**

```nginx
fruit-shop/packages/web/nginx.conf
```

```nginx
server {
    listen 80;

    location /api/ {
        proxy_pass http://server:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

- [ ] **Step 4: 创建 docker-compose.yml**

```yaml
fruit-shop/docker-compose.yml
```

```yaml
services:
  mysql:
    image: mysql:8.0
    ports:
      - '3306:3306'
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
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data

  server:
    build:
      context: .
      dockerfile: packages/server/Dockerfile
    ports:
      - '3000:3000'
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
    ports:
      - '80:80'
    depends_on:
      - server

volumes:
  mysql-data:
  redis-data:
```

- [ ] **Step 5: Commit**

```bash
git add fruit-shop/docker-compose.yml fruit-shop/packages/server/Dockerfile fruit-shop/packages/web/Dockerfile fruit-shop/packages/web/nginx.conf
git commit -m "feat(fruit-shop): Docker 配置 — server/web Dockerfile + nginx + docker-compose"
```

---

## Task 5: 端到端验证脚本

**Files:**
- Create: `fruit-shop/scripts/check-part1.sh`

- [ ] **Step 1: 创建验证脚本**

```bash
fruit-shop/scripts/check-part1.sh
```

```bash
#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

pass=0
fail=0

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((pass++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((fail++)); }
log_info()  { echo -e "${YELLOW}[INFO]${NC} $1"; }

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# -------------------------------------------
echo ""
echo "===== Part 1 端到端验证 ====="
echo ""

# 1. 目录结构
log_info "检查目录结构..."
required_dirs=(
  "packages/shared/src"
  "packages/server/src"
  "packages/web/src"
)
for d in "${required_dirs[@]}"; do
  if [ -d "$d" ]; then
    log_pass "目录存在: $d"
  else
    log_fail "目录缺失: $d"
  fi
done

# 2. 根配置文件
log_info "检查根配置文件..."
required_files=(
  "package.json"
  "pnpm-workspace.yaml"
  "tsconfig.base.json"
  "docker-compose.yml"
  ".gitignore"
  "packages/shared/package.json"
  "packages/shared/tsconfig.json"
  "packages/server/package.json"
  "packages/server/tsconfig.json"
  "packages/web/package.json"
  "packages/web/tsconfig.json"
  "packages/server/init.sql"
  "packages/server/Dockerfile"
  "packages/web/Dockerfile"
  "packages/web/nginx.conf"
)
for f in "${required_files[@]}"; do
  if [ -f "$f" ]; then
    log_pass "文件存在: $f"
  else
    log_fail "文件缺失: $f"
  fi
done

# 3. pnpm install
log_info "检查 node_modules..."
if [ -d "node_modules" ]; then
  log_pass "node_modules 存在"
else
  log_fail "node_modules 不存在，请运行 pnpm install"
fi

# 4. shared 包编译
log_info "检查 shared 包编译产物..."
shared_dist_files=(
  "packages/shared/dist/index.js"
  "packages/shared/dist/index.d.ts"
  "packages/shared/dist/types/product.d.ts"
  "packages/shared/dist/types/user.d.ts"
  "packages/shared/dist/types/cart.d.ts"
  "packages/shared/dist/types/order.d.ts"
  "packages/shared/dist/types/api.d.ts"
  "packages/shared/dist/constants.d.ts"
)
for f in "${shared_dist_files[@]}"; do
  if [ -f "$f" ]; then
    log_pass "编译产物存在: $f"
  else
    log_fail "编译产物缺失: $f"
  fi
done

# 5. init.sql 语法检查
log_info "检查 init.sql 关键表..."
tables=("users" "categories" "products" "carts" "orders" "order_items")
for t in "${tables[@]}"; do
  if grep -q "CREATE TABLE.*\`${t}\`" packages/server/init.sql; then
    log_pass "init.sql 包含表: ${t}"
  else
    log_fail "init.sql 缺少表: ${t}"
  fi
done

# 6. init.sql 种子数据
log_info "检查 init.sql 种子数据..."
if grep -q "INSERT INTO.*\`products\`" packages/server/init.sql; then
  log_pass "init.sql 包含商品种子数据"
else
  log_fail "init.sql 缺少商品种子数据"
fi

if grep -q "INSERT INTO.*\`categories\`" packages/server/init.sql; then
  log_pass "init.sql 包含分类种子数据"
else
  log_fail "init.sql 缺少分类种子数据"
fi

# 7. users 表 role 字段
log_info "检查 users 表 role 字段..."
if grep -q "\`role\`.*VARCHAR(10).*DEFAULT 'user'" packages/server/init.sql; then
  log_pass "users 表包含 role 字段 (VARCHAR(10) DEFAULT 'user')"
else
  log_fail "users 表缺少 role 字段"
fi

# 8. carts 联合唯一约束
log_info "检查 carts 联合唯一约束..."
if grep -q "uk_carts_user_product_spec" packages/server/init.sql; then
  log_pass "carts 表包含联合唯一约束 (user_id, product_id, spec_label)"
else
  log_fail "carts 表缺少联合唯一约束"
fi

# 9. docker-compose.yml 服务检查
log_info "检查 docker-compose.yml 服务..."
services=("mysql" "redis" "server" "web")
for s in "${services[@]}"; do
  if grep -q "^[[:space:]]*${s}:" docker-compose.yml; then
    log_pass "docker-compose.yml 包含服务: ${s}"
  else
    log_fail "docker-compose.yml 缺少服务: ${s}"
  fi
done

# 10. nginx.conf SPA fallback
log_info "检查 nginx.conf SPA fallback..."
if grep -q "try_files.*index.html" packages/web/nginx.conf; then
  log_pass "nginx.conf 包含 SPA fallback (try_files)"
else
  log_fail "nginx.conf 缺少 SPA fallback"
fi

if grep -q "expires 1y" packages/web/nginx.conf; then
  log_pass "nginx.conf 包含静态资源长缓存 (expires 1y)"
else
  log_fail "nginx.conf 缺少静态资源长缓存"
fi

# 11. Dockerfile 多阶段构建
log_info "检查 Dockerfile..."
if grep -q "FROM node:20-alpine AS builder" packages/server/Dockerfile; then
  log_pass "server Dockerfile 包含多阶段构建"
else
  log_fail "server Dockerfile 缺少多阶段构建"
fi

if grep -q "FROM node:20-alpine AS builder" packages/web/Dockerfile; then
  log_pass "web Dockerfile 包含多阶段构建"
else
  log_fail "web Dockerfile 缺少多阶段构建"
fi

# 12. shared 类型导出完整性
log_info "检查 shared 类型导出..."
required_exports=(
  "Product"
  "Category"
  "User"
  "LoginDTO"
  "RegisterDTO"
  "CartItem"
  "AddToCartDTO"
  "Order"
  "OrderItem"
  "CreateOrderDTO"
  "ApiResponse"
  "PaginatedResponse"
  "ErrorCode"
)
for e in "${required_exports[@]}"; do
  if grep -q "export.*${e}" packages/shared/src/index.ts; then
    log_pass "shared 导出: ${e}"
  else
    log_fail "shared 缺少导出: ${e}"
  fi
done

# -------------------------------------------
echo ""
echo "===== 验证结果 ====="
echo -e "${GREEN}PASS: ${pass}${NC}"
echo -e "${RED}FAIL: ${fail}${NC}"
echo ""

if [ "$fail" -gt 0 ]; then
  echo -e "${RED}存在失败项，请修复后重新验证。${NC}"
  exit 1
else
  echo -e "${GREEN}全部通过! Part 1 脚手架验证完成。${NC}"
  exit 0
fi
```

- [ ] **Step 2: 赋予执行权限**

```bash
chmod +x /Users/arwen/Desktop/Arwen/evanfang/superpowers/demo/fruit-shop/scripts/check-part1.sh
```

- [ ] **Step 3: 运行验证脚本**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/superpowers/demo/fruit-shop
bash scripts/check-part1.sh
```

预期输出: 所有检查项均为 `[PASS]`，最后一行显示 "全部通过! Part 1 脚手架验证完成。"

- [ ] **Step 4: Docker 构建验证 (在 server/web 代码完成后执行)**

本步骤需要 Task 1-4 全部完成后，且 server 和 web 各自至少有一个可编译的入口文件 (`server/src/main.ts`, `web/src/main.tsx`)，才能成功构建镜像。在 Part 1 阶段，仅验证 `docker-compose.yml` 配置有效性：

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/superpowers/demo/fruit-shop
docker-compose config
```

预期: 输出完整的 docker-compose 配置 YAML，无报错。

在后续 Part 实现 server/web 代码后，完整验证命令：

```bash
# 构建并启动
docker-compose up -d --build

# 等待服务就绪 (约 30 秒)
sleep 30

# 检查服务状态
docker-compose ps

# 验证 MySQL 初始化
docker-compose exec mysql mysql -uroot -proot123 -e "USE fruit_shop; SELECT COUNT(*) FROM products; SELECT COUNT(*) FROM categories;"

# 验证 web 服务
curl -s -o /dev/null -w "%{http_code}" http://localhost

# 清理
docker-compose down -v
```

- [ ] **Step 5: Commit**

```bash
git add fruit-shop/scripts/check-part1.sh
git commit -m "feat(fruit-shop): Part 1 端到端验证脚本 — 目录/编译/配置检查"
```

---

## Task 依赖关系

```
Task 1 (Monorepo 脚手架)
  ├── Task 2 (共享类型) ──── 依赖 Task 1 (需要 package.json + tsconfig)
  ├── Task 3 (init.sql) ──── 无依赖，可与 Task 2 并行
  ├── Task 4 (Docker 配置) ─ 依赖 Task 1 (需要目录结构)
  └── Task 5 (验证脚本) ──── 依赖 Task 1-4 全部完成
```

## Contract DoD 映射

| DoD 条目 | 对应 Task |
|---------|-----------|
| `docker-compose up -d` 后 4 个服务全部 healthy/running | Task 4 (docker-compose.yml) |
| init.sql 自动建表 + 种子数据 | Task 3 (init.sql) |
| users 表 role 字段 (VARCHAR(10) DEFAULT 'user') | Task 3 (init.sql users 表定义) |
| 所有 API 响应统一 `{ code, data?, message }` 格式 | Task 2 (ApiResponse<T> 类型) |
| 错误码规范 40001-40499 | Task 2 (constants.ts ErrorCode) |
| Nginx SPA fallback + 静态资源长缓存 | Task 4 (nginx.conf) |
