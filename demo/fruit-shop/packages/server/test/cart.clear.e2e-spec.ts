import request from 'supertest';
import { TestHelper } from './helpers/test-helper';

describe('Cart Clear (e2e)', () => {
  const helper = new TestHelper();
  let userToken: string;
  let adminToken: string;
  let productId: number;

  beforeAll(async () => {
    await helper.setup();
    await helper.cleanDatabase();

    const admin = await helper.registerAdmin('13900000011', 'admin123456');
    adminToken = admin.accessToken;
    productId = await helper.createProductAsAdmin(adminToken, { stock: 100 });

    const user = await helper.registerAndLogin('13800000031', 'test123456');
    userToken = user.accessToken;
  });

  afterAll(async () => {
    await helper.teardown();
  });

  it('DELETE /api/cart 应清空当前用户全部购物车', async () => {
    // 先加两个 item
    await helper.addToCartAsUser(userToken, productId, '500g', 2);
    await helper.addToCartAsUser(userToken, productId, '1kg', 1);

    const res = await request(helper.httpServer)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(res.body.code).toBe(0);

    // 重新拉取确认空
    const after = await request(helper.httpServer)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);
    expect(after.body.data.length).toBe(0);
  });

  it('DELETE /api/cart 空购物车也返回成功', () => {
    return request(helper.httpServer)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(0);
      });
  });

  it('DELETE /api/cart 无 token 返回 401', () => {
    return request(helper.httpServer)
      .delete('/api/cart')
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(401);
      });
  });
});
