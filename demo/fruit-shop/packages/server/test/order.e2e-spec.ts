import request from 'supertest';
import { TestHelper } from './helpers/test-helper';

describe('Order (e2e)', () => {
  const helper = new TestHelper();
  let userToken: string;
  let adminToken: string;
  let productId: number;
  let orderId: number;

  beforeAll(async () => {
    await helper.setup();
    // 清空 users/carts/orders/order_items，保留 products/categories 种子数据
    await helper.cleanDatabase();

    // 第一个注册的用户自动获得 ADMIN 角色
    const admin = await helper.registerAdmin('13900000003', 'admin123456');
    adminToken = admin.accessToken;

    const user = await helper.registerAndLogin('13800000040', 'test123456');
    userToken = user.accessToken;

    // 创建商品
    const productRes = await request(helper.httpServer)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '订单测试商品',
        origin: '测试产地',
        price: 29.9,
        unit: '斤',
        sweetness: '甜',
        weight: '1kg',
        image: 'http://example.com/test.jpg',
        color: '#FF0000',
        categoryId: 1,
        stock: 100,
      });
    expect(productRes.body.code).toBe(0);
    productId = productRes.body.data.id;

    // 添加到购物车，供首个下单测试使用
    await request(helper.httpServer)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, specLabel: '1kg', quantity: 2 });
  });

  afterAll(async () => {
    await helper.teardown();
  });

  describe('POST /api/orders', () => {
    it('should create order from cart', () => {
      return request(helper.httpServer)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ address: '北京市朝阳区', phone: '13800000040' })
        .expect(201)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.orderNo).toBeDefined();
          expect(res.body.data.items.length).toBe(1);
          orderId = res.body.data.id;
        });
    });

    it('should reject order with empty cart (cart cleared by previous order)', () => {
      return request(helper.httpServer)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ address: '北京市朝阳区', phone: '13800000040' })
        .expect(200)
        .expect((res) => {
          // BadRequestException(CART_EMPTY) → code = HTTP status = 400
          expect(res.body.code).toBe(400);
        });
    });
  });

  describe('GET /api/orders', () => {
    it('should return user orders', () => {
      return request(helper.httpServer)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);
        });
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order detail with items', () => {
      return request(helper.httpServer)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.items).toBeInstanceOf(Array);
          expect(res.body.data.items.length).toBe(1);
        });
    });

    it('should return 404 for non-existent order', () => {
      return request(helper.httpServer)
        .get('/api/orders/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          // NotFoundException(ORDER_NOT_FOUND) → code = HTTP status = 404
          expect(res.body.code).toBe(404);
        });
    });
  });

  describe('库存校验与扣减', () => {
    let stockProductId: number;
    let stockOrderId: number;
    const initialStock = 5;

    beforeAll(async () => {
      stockProductId = await helper.createProductAsAdmin(adminToken, {
        name: '库存扣减测试商品',
        stock: initialStock,
        price: 9.9,
      });
    });

    it('下单后应扣减库存', async () => {
      await helper.addToCartAsUser(userToken, stockProductId, '1kg', 2);
      const res = await request(helper.httpServer)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ address: '北京市', phone: '13800000040' });
      expect(res.body.code).toBe(0);
      stockOrderId = res.body.data.id;

      const stockAfter = await helper.getProductStock(stockProductId);
      expect(stockAfter).toBe(initialStock - 2);
    });

    it('取消订单后应回补库存', async () => {
      const stockBeforeCancel = await helper.getProductStock(stockProductId);
      const res = await request(helper.httpServer)
        .put(`/api/orders/${stockOrderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.body.code).toBe(0);

      const stockAfterCancel = await helper.getProductStock(stockProductId);
      expect(stockAfterCancel).toBe(stockBeforeCancel + 2);
    });

    it('库存不足时应返回业务码 40501', async () => {
      // 设置库存为 1，请求 5 件
      await helper.setProductStock(stockProductId, 1);
      await helper.addToCartAsUser(userToken, stockProductId, '2kg', 5);
      const res = await request(helper.httpServer)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ address: '北京市', phone: '13800000040' });
      expect(res.body.code).toBe(40501);
      // 库存应未变化
      const stock = await helper.getProductStock(stockProductId);
      expect(stock).toBe(1);
    });
  });

  describe('PUT /api/orders/:id/cancel', () => {
    it('should cancel a pending order', () => {
      return request(helper.httpServer)
        .put(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.status).toBe(4); // CANCELLED
        });
    });

    it('should reject cancelling already cancelled order', () => {
      return request(helper.httpServer)
        .put(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          // BadRequestException(ORDER_CANCEL_NOT_ALLOWED) → code = HTTP status = 400
          expect(res.body.code).toBe(400);
        });
    });
  });

  describe('越权与边界', () => {
    let userA: { accessToken: string; userId: number };
    let userB: { accessToken: string; userId: number };
    let userBOrderId: number;

    beforeAll(async () => {
      userA = await helper.registerAndLogin('13800000070', 'test123456');
      userB = await helper.registerAndLogin('13800000071', 'test123456');
      // 为 B 创建一笔订单
      const productId = await helper.createProductAsAdmin(adminToken, { name: 'B 的订单商品' });
      await helper.addToCartAsUser(userB.accessToken, productId, '1kg', 1);
      const res = await request(helper.httpServer)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userB.accessToken}`)
        .send({ address: '北京市', phone: '13800000071' });
      userBOrderId = res.body.data.id;
    });

    it('should reject A cancelling B order (404)', () => {
      return request(helper.httpServer)
        .put(`/api/orders/${userBOrderId}/cancel`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(404);
        });
    });

    it('should reject A viewing B order detail (404)', () => {
      return request(helper.httpServer)
        .get(`/api/orders/${userBOrderId}`)
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(404);
        });
    });

    it('should reject no-token POST /orders (401)', () => {
      return request(helper.httpServer)
        .post('/api/orders')
        .send({ address: 'x', phone: '13800000099' })
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(401);
        });
    });

    it('should reject cancelling non-existent order (404)', () => {
      return request(helper.httpServer)
        .put('/api/orders/99999/cancel')
        .set('Authorization', `Bearer ${userA.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(404);
        });
    });
  });
});
