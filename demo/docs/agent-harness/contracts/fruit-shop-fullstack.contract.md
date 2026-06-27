# Sprint Contract: 鲜果集全栈应用

## Definition of Done

- [ ] `docker-compose up -d` 后，`docker-compose ps` 显示 4 个服务全部 healthy/running，访问 `http://localhost` 能看到首页
- [ ] 注册新用户 → 登录成功返回 token → 用 token 访问受保护接口成功 → 登出后 token 失效（返回 401）
- [ ] accessToken 过期后（测试时设短 TTL 如 10s），前端自动用 refreshToken 刷新成功继续请求；refreshToken 失效则跳转登录页
- [ ] 首页加载分类 tabs（从 API 获取），点击分类筛选商品，搜索框输入关键词返回匹配商品
- [ ] 商品列表支持分页（每页 10 条，返回 `{ list, total, page, limit }`）
- [ ] 商品详情页展示：名称、产地、现价、原价、单位、甜度、规格、描述、标签、主图、品牌色；缺少任一字段则该商品数据视为不合格
- [ ] 同一商品不同规格在购物车中是独立条目（联合唯一约束 `user_id + product_id + spec_label`）
- [ ] 加入已存在的商品+规格则数量 +1
- [ ] 下单后：购物车中对应商品清除，order_items 快照商品信息，订单状态为 0（待付款）
- [ ] 库存不做扣减（属于支付阶段，不在本期范围）
- [ ] 取消订单仅限状态 0（待付款）→ 状态变为 4（已取消），其他状态返回错误；不涉及库存回补
- [ ] users 表增加 `role` 字段（`VARCHAR(10) DEFAULT 'user'`），第一个注册的用户自动设为 `admin`
- [ ] admin 才能访问 `/api/products` POST/PUT/DELETE，非 admin 返回 403
- [ ] 所有 API 响应（包括错误）统一返回 `{ code, data?, message }` 格式：成功 code=0，验证失败 code=40001 范围，未认证 code=40001，无权限 code=40003
- [ ] 直接浏览器访问 `/product/1`、`/cart`、`/login` 等 SPA 路由不返回 404，Nginx fallback 到 index.html
- [ ] React 版本保留原有品牌色系（`#FF6B35` 主色等）、字体（Fredoka + Noto Sans SC）、6 个动画效果（bounceIn、float、pulseGlow、spin-slow、slideUp、fadeIn）、整体布局结构

## Boundary Conditions

- 必须支持：`docker-compose up -d` 一键启动，init.sql 自动建表 + 种子数据
- 不能破坏：现有 HTML 模板的品牌视觉和动画效果
- 性能：商品列表 API 本地响应 < 500ms
- 不含：真实支付集成、库存扣减、邮件/短信通知

## Acceptance Criteria

- 可计算：API 响应时间（curl 计时）、docker-compose ps 状态
- 可推论：人工走通完整购物流程（注册→浏览→加购→下单→查看订单→取消订单→admin 管理商品）
- 视觉判定标准：功能布局一致、视觉风格一致，不需要像素级对齐

## Negotiation Record

- Generator: 初始 12 条 DoD，缺少角色定义、库存策略、规格购物车行为
- Evaluator: 质疑 11 项——验证方式不明、JWT 测试步骤缺失、admin 定义缺失、库存/回补策略缺失、视觉判定标准模糊
- Final consensus: 第二轮补充 role 字段 + 首用户 admin 规则、明确库存不扣减/不回补、明确购物车联合唯一约束行为、视觉改为"功能布局 + 视觉风格一致"非像素级
