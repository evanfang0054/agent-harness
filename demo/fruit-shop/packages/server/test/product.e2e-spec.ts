import request from 'supertest';
import { TestHelper } from './helpers/test-helper';

describe('Product & Category (e2e)', () => {
  const helper = new TestHelper();
  let adminToken: string;
  let userToken: string;
  let createdProductId: number;

  beforeAll(async () => {
    await helper.setup();
    // 清空 users/carts/orders/order_items，保留 products/categories 种子数据
    await helper.cleanDatabase();

    // 第一个注册的用户自动获得 ADMIN 角色
    const admin = await helper.registerAdmin('13900000001', 'admin123456');
    adminToken = admin.accessToken;

    const user = await helper.registerAndLogin('13800000020', 'test123456');
    userToken = user.accessToken;
  });

  afterAll(async () => {
    await helper.teardown();
  });

  describe('POST /api/products', () => {
    const validProduct = {
      name: '测试苹果',
      origin: '山东',
      price: 9.9,
      unit: '斤',
      sweetness: '甜',
      weight: '500g',
      image: 'http://example.com/apple.jpg',
      color: '#FF0000',
      categoryId: 1,
      stock: 100,
    };

    it('should create product as ADMIN', () => {
      return request(helper.httpServer)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validProduct)
        .expect(201)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.name).toBe('测试苹果');
          createdProductId = res.body.data.id;
        });
    });

    it('should reject non-ADMIN user', () => {
      return request(helper.httpServer)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validProduct)
        .expect(200)
        .expect((res) => {
          // RolesGuard 抛 ForbiddenException(status 403) → code 403
          expect(res.body.code).toBe(403);
        });
    });

    it('should reject unauthenticated request', () => {
      return request(helper.httpServer)
        .post('/api/products')
        .send(validProduct)
        .expect(200)
        .expect((res) => {
          // JwtAuthGuard 抛 UnauthorizedException(status 401) → code 401
          expect(res.body.code).toBe(401);
        });
    });
  });

  describe('GET /api/products', () => {
    it('should return product list (public)', () => {
      return request(helper.httpServer)
        .get('/api/products')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.list).toBeInstanceOf(Array);
          expect(res.body.data.total).toBeGreaterThanOrEqual(1);
        });
    });

    it('should filter by keyword', () => {
      return request(helper.httpServer)
        .get('/api/products?keyword=苹果')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);
        });
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return product detail', () => {
      return request(helper.httpServer)
        .get(`/api/products/${createdProductId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.name).toBe('测试苹果');
        });
    });

    it('should return 404 for non-existent product', () => {
      return request(helper.httpServer)
        .get('/api/products/99999')
        .expect(200)
        .expect((res) => {
          // NotFoundException(status 404) 经 HttpExceptionFilter 透传 status 作为 code
          expect(res.body.code).toBe(404);
        });
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product as ADMIN', () => {
      return request(helper.httpServer)
        .put(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 12.9 })
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          // decimal(10,2) 列经 TypeORM 序列化后为 number，此处校验数值相等
          expect(Number(res.body.data.price)).toBe(12.9);
        });
    });
  });

  describe('GET /api/categories', () => {
    it('should return all categories (public)', () => {
      return request(helper.httpServer)
        .get('/api/categories')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product as ADMIN', () => {
      return request(helper.httpServer)
        .delete(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
        });
    });

    it('should return 404 after deletion', () => {
      return request(helper.httpServer)
        .get(`/api/products/${createdProductId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(404);
        });
    });
  });
});
