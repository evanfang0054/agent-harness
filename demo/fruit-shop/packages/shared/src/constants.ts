/**
 * 业务错误码规范
 * 40001-40099 认证相关
 * 40101-40199 用户相关
 * 40201-40299 商品相关
 * 40301-40399 购物车相关
 * 40401-40499 订单相关
 * 40501-40599 库存相关
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

  // 库存 40501-40599
  STOCK_INSUFFICIENT: 40501,
  PRODUCT_OUT_OF_STOCK: 40502,
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

  [ErrorCode.STOCK_INSUFFICIENT]: '商品库存不足',
  [ErrorCode.PRODUCT_OUT_OF_STOCK]: '商品已售罄',
};

/**
 * 成功响应码
 */
export const SUCCESS_CODE = 0;
