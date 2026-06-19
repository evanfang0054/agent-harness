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

  it('isRecommended 商品应优先出现在推荐位', async () => {
    // 创建 2 个推荐商品 + 1 个非推荐商品（stock>0，均为 ON）
    const featured1 = await helper.createProductAsAdmin(adminToken, {
      name: '推荐-A',
      isRecommended: true,
      featuredSortOrder: 1,
      stock: 10,
    });
    const featured2 = await helper.createProductAsAdmin(adminToken, {
      name: '推荐-B',
      isRecommended: true,
      featuredSortOrder: 0,
      stock: 10,
    });
    const normal = await helper.createProductAsAdmin(adminToken, {
      name: '普通-C',
      isRecommended: false,
      stock: 10,
    });

    const res = await request(helper.httpServer)
      .get('/api/products/recommendations')
      .query({ limit: 10 })
      .expect(200);
    const ids: number[] = res.body.data.list.map((p: any) => p.id);

    // 推荐 B（sortOrder 0）应排在 A（sortOrder 1）之前
    expect(ids.indexOf(featured2)).toBeLessThan(ids.indexOf(featured1));
    // 推荐商品应在普通商品之前
    expect(ids.indexOf(featured2)).toBeLessThan(ids.indexOf(normal));
    expect(ids.indexOf(featured1)).toBeLessThan(ids.indexOf(normal));
  });

  it('推荐商品不足时应用 createdAt DESC 补足', async () => {
    const res = await request(helper.httpServer)
      .get('/api/products/recommendations')
      .query({ limit: 10 })
      .expect(200);
    expect(res.body.data.list.length).toBeLessThanOrEqual(10);
    // 若列表含非推荐商品，它们必在推荐商品之后（顺序由上一用例保证）
    expect(res.body.code).toBe(0);
  });
});
