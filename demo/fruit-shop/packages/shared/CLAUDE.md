# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概述

`shared` 是鲜果集 monorepo 的共享包，纯 TypeScript，用 `tsc` 编译输出 CommonJS 到 `dist/`。作为 server 和 web 的单一事实源，提供类型定义、枚举和业务错误码。

## 常用命令

```bash
pnpm --filter shared build        # tsc 编译到 dist/
pnpm --filter shared dev          # tsc --watch 模式
```

## 架构要点

- **消费方式不同**：server 通过 `tsconfig` paths 指向 `../shared/dist`（需先 build）；web 通过 Vite alias 指向 `../shared/src`（源码直读，无需构建）
- **修改后必须 rebuild**：改完 shared 源码后必须 `pnpm --filter shared build`，否则 server 运行时拉到旧 `dist`

## 源码结构

- `constants.ts` — `ErrorCode` 业务码（40001–40499，按模块分段）、`ErrorMessage` 中文映射、`SUCCESS_CODE`
- `types/user.ts` — `User`、`UserRole` 枚举、`LoginDTO`/`RegisterDTO`/`LoginResponse`
- `types/product.ts` — `Product`、`ProductStatus` 枚举、`Category`
- `types/cart.ts` — `CartItem`、`AddToCartDTO`/`UpdateCartDTO`、`CartItemWithProduct`
- `types/order.ts` — `Order`、`OrderStatus` 枚举、`OrderItem`、`CreateOrderDTO`、`OrderWithItems`
- `types/api.ts` — `ApiResponse<T>`、`PaginatedResponse<T>`、`PaginationQuery`
- `index.ts` — 统一导出入口

## 约定

- 枚举用 `enum`（非 `const enum`），确保跨包运行时可访问
- 错误码分段：认证 40001–40099、用户 40101–40199、商品 40201–40299、购物车 40301–40399、订单 40401–40499
- 响应格式：成功 `{ code: 0, data, message: "success" }`；错误用 `ErrorCode` 中的业务码
