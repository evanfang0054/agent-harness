# Cart API

所有接口守卫：JWT。

## GET /api/cart

- 响应 `data`：`CartItemWithProduct[]`（按 `createdAt DESC`）

## POST /api/cart

- 请求体：`{ "productId": 1, "specLabel": "500g", "quantity": 1 }`
- 行为：相同 `(userId, productId, specLabel)` 合并数量
- 加购前校验 `stock > 0`
- 响应 `data`：更新后的全量购物车
- 错误码：
  - `40201 PRODUCT_NOT_FOUND`
  - `40502 PRODUCT_OUT_OF_STOCK`

## PUT /api/cart/:id

- 请求体：`{ "quantity": 5 }`
- 响应 `data`：更新后的全量购物车
- 错误码：`40301 CART_ITEM_NOT_FOUND`

## DELETE /api/cart/:id

- 响应 `data`：更新后的全量购物车
- 错误码：`40301 CART_ITEM_NOT_FOUND`

## DELETE /api/cart

清空当前用户全部购物车。

- 响应 `data`：空数组 `[]`
- 空购物车也返回成功
