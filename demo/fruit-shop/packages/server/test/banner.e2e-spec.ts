import request from 'supertest';
import { DataSource } from 'typeorm';
import { TestHelper } from './helpers/test-helper';

describe('Banner (e2e)', () => {
  const helper = new TestHelper();
  let adminToken: string;
  let userToken: string;
  let bannerId: number;

  beforeAll(async () => {
    await helper.setup();
    await helper.cleanDatabase();

    const admin = await helper.registerAdmin('13900000020', 'admin123456');
    adminToken = admin.accessToken;

    const user = await helper.registerAndLogin('13800000020', 'test123456');
    userToken = user.accessToken;

    // 清空可能存在的 banners（cleanDatabase 不含 banners 表）
    const dataSource = helper.app.get(DataSource);
    await dataSource.query('TRUNCATE TABLE banners');
  });

  afterAll(async () => {
    await helper.teardown();
  });

  it('POST /api/banners (admin) 应新建 Banner', () => {
    return request(helper.httpServer)
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: '限时特惠',
        subtitle: '新人首单立减¥10',
        ctaText: '立即领取',
        linkType: 'product',
        linkValue: '1',
        sortOrder: 1,
        status: 1,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.code).toBe(0);
        expect(res.body.data.id).toBeDefined();
        expect(res.body.data.title).toBe('限时特惠');
        bannerId = res.body.data.id;
      });
  });

  it('GET /api/banners (@Public) 应返回 status=1 的 Banner', () => {
    return request(helper.httpServer)
      .get('/api/banners')
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(0);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0].title).toBe('限时特惠');
      });
  });

  it('GET /api/banners/all (admin) 应返回全部 Banner', () => {
    return request(helper.httpServer)
      .get('/api/banners/all')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(0);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
  });

  it('PUT /api/banners/:id (admin) 应更新 Banner', () => {
    return request(helper.httpServer)
      .put(`/api/banners/${bannerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 0 })
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(0);
        expect(res.body.data.status).toBe(0);
      });
  });

  it('下架后 GET /api/banners 不应返回该 Banner', () => {
    return request(helper.httpServer)
      .get('/api/banners')
      .expect(200)
      .expect((res) => {
        const ids = res.body.data.map((b: any) => b.id);
        expect(ids).not.toContain(bannerId);
      });
  });

  it('DELETE /api/banners/:id (admin) 应删除', () => {
    return request(helper.httpServer)
      .delete(`/api/banners/${bannerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(0);
      });
  });

  it('非 admin GET /api/banners/all 应返回 403', () => {
    return request(helper.httpServer)
      .get('/api/banners/all')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(403);
      });
  });

  it('无 token POST /api/banners 应返回 401', () => {
    return request(helper.httpServer)
      .post('/api/banners')
      .send({ title: 'x' })
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(401);
      });
  });
});
