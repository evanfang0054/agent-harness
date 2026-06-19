import request from 'supertest';
import { DataSource } from 'typeorm';
import { TestHelper } from './helpers/test-helper';

describe('Category CRUD (e2e)', () => {
  const helper = new TestHelper();
  let adminToken: string;
  let userToken: string;
  let createdCategoryId: number;

  beforeAll(async () => {
    await helper.setup();
    await helper.cleanDatabase();
    const admin = await helper.registerAdmin('13900000041', 'admin123456');
    adminToken = admin.accessToken;
    const user = await helper.registerAndLogin('13800000041', 'test123456');
    userToken = user.accessToken;
  });

  afterAll(async () => {
    await helper.teardown();
  });

  it('POST /api/categories (admin) 应创建分类', () => {
    return request(helper.httpServer)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '热带水果', icon: '🌴', sortOrder: 10 })
      .expect(201)
      .expect((res) => {
        expect(res.body.code).toBe(0);
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.name).toBe('热带水果');
        createdCategoryId = res.body.data.id;
      });
  });

  it('PUT /api/categories/:id (admin) 应更新分类', () => {
    return request(helper.httpServer)
      .put(`/api/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '热带水果2' })
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(0);
        expect(res.body.data.name).toBe('热带水果2');
      });
  });

  it('DELETE /api/categories/:id (admin) 无关联在售商品应可删', () => {
    return request(helper.httpServer)
      .delete(`/api/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(0);
      });
  });

  it('DELETE /api/categories/:id 有关联在售商品应返回 41201', async () => {
    // 创建一个新分类，再创建关联该分类的在售商品
    const createRes = await request(helper.httpServer)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '测试分类-有关联', sortOrder: 99 });
    const categoryId = createRes.body.data.id;

    await helper.createProductAsAdmin(adminToken, {
      name: `关联商品-${Date.now()}`,
      categoryId,
      status: 1,
    });

    return request(helper.httpServer)
      .delete(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(41201);
      });
  });

  it('PUT /api/categories/:id 不存在的 id 应返回 41202', () => {
    return request(helper.httpServer)
      .put('/api/categories/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'x' })
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(41202);
      });
  });

  it('非 admin POST /api/categories 应返回 403', () => {
    return request(helper.httpServer)
      .post('/api/categories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'x' })
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(403);
      });
  });

  it('无 token POST /api/categories 应返回 401', () => {
    return request(helper.httpServer)
      .post('/api/categories')
      .send({ name: 'x' })
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(401);
      });
  });
});
