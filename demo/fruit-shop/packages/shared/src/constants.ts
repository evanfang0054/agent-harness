/**
 * 业务错误码规范
 * 40001-40099 认证相关
 * 40101-40199 用户相关
 * 40201-40299 商品相关
 * 40301-40399 购物车相关
 * 40401-40499 订单相关
 * 40501-40599 库存相关
 * 40601-40699 退款相关
 * 40701-40799 评价相关
 * 40801-40899 收藏相关
 * 40901-40999 地址相关
 * 41001-41099 优惠券相关
 * 41101-41199 上传相关
 * 41201-41299 分类相关
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

  // 退款 40601-40699
  REFUND_NOT_ALLOWED: 40601,
  REFUND_NOT_FOUND: 40602,

  // 评价 40701-40799
  REVIEW_EXISTS: 40701,
  REVIEW_NOT_ALLOWED: 40702,
  REVIEW_NOT_FOUND: 40703,

  // 收藏 40801-40899
  FAVORITE_EXISTS: 40801,
  FAVORITE_NOT_FOUND: 40802,

  // 地址 40901-40999
  ADDRESS_NOT_FOUND: 40901,
  ADDRESS_IS_DEFAULT: 40902,

  // 优惠券 41001-41099
  COUPON_NOT_FOUND: 41001,
  COUPON_EXPIRED: 41002,
  COUPON_USED: 41003,
  COUPON_SOLD_OUT: 41004,
  COUPON_MIN_NOT_MET: 41005,
  COUPON_NOT_APPLICABLE: 41006,

  // 上传 41101-41199
  UPLOAD_FILE_TOO_LARGE: 41101,
  UPLOAD_INVALID_TYPE: 41102,
  UPLOAD_FAILED: 41103,

  // 分类 41201-41299
  CATEGORY_HAS_PRODUCTS: 41201,
  CATEGORY_NOT_FOUND: 41202,
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

  [ErrorCode.REFUND_NOT_ALLOWED]: '当前订单状态不可申请退款',
  [ErrorCode.REFUND_NOT_FOUND]: '退款记录不存在',

  [ErrorCode.REVIEW_EXISTS]: '该商品已评价',
  [ErrorCode.REVIEW_NOT_ALLOWED]: '当前订单不可评价',
  [ErrorCode.REVIEW_NOT_FOUND]: '评价不存在',

  [ErrorCode.FAVORITE_EXISTS]: '已收藏该商品',
  [ErrorCode.FAVORITE_NOT_FOUND]: '未收藏该商品',

  [ErrorCode.ADDRESS_NOT_FOUND]: '地址不存在',
  [ErrorCode.ADDRESS_IS_DEFAULT]: '默认地址不可删除',

  [ErrorCode.COUPON_NOT_FOUND]: '优惠券不存在',
  [ErrorCode.COUPON_EXPIRED]: '优惠券已过期',
  [ErrorCode.COUPON_USED]: '优惠券已使用',
  [ErrorCode.COUPON_SOLD_OUT]: '优惠券已领完',
  [ErrorCode.COUPON_MIN_NOT_MET]: '未达到优惠券使用门槛',
  [ErrorCode.COUPON_NOT_APPLICABLE]: '优惠券不适用',

  [ErrorCode.UPLOAD_FILE_TOO_LARGE]: '文件超过 2MB 限制',
  [ErrorCode.UPLOAD_INVALID_TYPE]: '仅支持图片文件',
  [ErrorCode.UPLOAD_FAILED]: '上传失败',

  [ErrorCode.CATEGORY_HAS_PRODUCTS]: '分类下存在商品，不可删除',
  [ErrorCode.CATEGORY_NOT_FOUND]: '分类不存在',
};

/**
 * 成功响应码
 */
export const SUCCESS_CODE = 0;
