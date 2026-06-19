import request from 'supertest';
import { TestHelper } from './helpers/test-helper';

describe('Product Recommendations (e2e)', () => {
  const helper = new TestHelper();
  let adminToken: string;
  let productAId: number;
  let productBId: number;
  let productCId: number;

  beforeAll(async () => {
    await helper.setup();
    await helper.cleanDatabase();

    const admin = await helper.registerAdmin('13900000010', 'admin123456');
    adminToken = admin.accessToken;

    // A：上架且有库存
    productAId = await helper.createProductAsAdmin(adminToken, {
      name: '推荐-A-在售',
      stock: 10,
    });
    // B：上架且有库存（用于 excludeId 验证）
    productBId = await helper.createProductAsAdmin(adminToken, {
      name: '推荐-B-在售',
      stock: 5,
    });
    // C：上架但库存为 0（不应出现）
    productCId = await helper.createProductAsAdmin(adminToken, {
      name: '推荐-C-售罄',
      stock: 0,
    });
  });

  afterAll(async () => {
    await helper.teardown();
  });

  it('GET /api/products/recommendations 应返回在售且有库存的商品', () => {
    return request(helper.httpServer)
      .get('/api/products/recommendations')
      .query({ limit: 10 })
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(0);
        expect(Array.isArray(res.body.data.list)).toBe(true);
        const ids = res.body.data.list.map((p: any) => p.id);
        expect(ids).toContain(productAId);
        expect(ids).toContain(productBId);
        expect(ids).not.toContain(productCId);
      });
  });

  it('GET /api/products/recommendations?excludeId=A 应排除指定商品', () => {
    return request(helper.httpServer)
      .get('/api/products/recommendations')
      .query({ limit: 10, excludeId: productAId })
      .expect(200)
      .expect((res) => {
        const ids = res.body.data.list.map((p: any) => p.id);
        expect(ids).not.toContain(productAId);
        expect(ids).toContain(productBId);
      });
  });

  it('GET /api/products/recommendations 应遵守 limit 参数', () => {
    return request(helper.httpServer)
      .get('/api/products/recommendations')
      .query({ limit: 1 })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.list.length).toBeLessThanOrEqual(1);
      });
  });

  it('GET /api/products/recommendations 无需登录（@Public）', () => {
    return request(helper.httpServer)
      .get('/api/products/recommendations')
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(0);
      });
  });
});
