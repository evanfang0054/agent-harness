import request from 'supertest';
import { TestHelper } from './helpers/test-helper';

describe('Cart Out-of-Stock (e2e)', () => {
  const helper = new TestHelper();
  let userToken: string;
  let adminToken: string;
  let zeroStockProductId: number;

  beforeAll(async () => {
    await helper.setup();
    await helper.cleanDatabase();

    const admin = await helper.registerAdmin('13900000012', 'admin123456');
    adminToken = admin.accessToken;
    zeroStockProductId = await helper.createProductAsAdmin(adminToken, {
      name: '售罄商品',
      stock: 0,
    });

    const user = await helper.registerAndLogin('13800000032', 'test123456');
    userToken = user.accessToken;
  });

  afterAll(async () => {
    await helper.teardown();
  });

  it('POST /api/cart 库存为 0 时应返回业务码 40502', () => {
    return request(helper.httpServer)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId: zeroStockProductId, specLabel: '默认', quantity: 1 })
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(40502);
      });
  });
});
