import request from 'supertest';
import { TestHelper } from './helpers/test-helper';

describe('Upload (e2e)', () => {
  const helper = new TestHelper();
  let adminToken: string;

  beforeAll(async () => {
    await helper.setup();
    await helper.cleanDatabase();
    const admin = await helper.registerAdmin('13900000040', 'admin123456');
    adminToken = admin.accessToken;
  });

  afterAll(async () => {
    await helper.teardown();
  });

  it('POST /api/upload/image (admin) 应返回 /uploads/... URL', () => {
    return request(helper.httpServer)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('fakepng'), 'test.png')
      .expect(201)
      .expect((res) => {
        expect(res.body.code).toBe(0);
        expect(res.body.data.url).toMatch(/^\/uploads\//);
      });
  });

  it('POST /api/upload/image 超过 2MB 应返回 41101', () => {
    const big = Buffer.alloc(2 * 1024 * 1024 + 100, 'a');
    return request(helper.httpServer)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', big, 'big.png')
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(41101);
      });
  });

  it('POST /api/upload/image 非图片类型应返回 41102', () => {
    return request(helper.httpServer)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('hello'), 'test.txt')
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(41102);
      });
  });

  it('POST /api/upload/image 空文件应返回 41103', () => {
    return request(helper.httpServer)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(41103);
      });
  });

  it('POST /api/upload/image 无 token 应返回 401', () => {
    return request(helper.httpServer)
      .post('/api/upload/image')
      .attach('file', Buffer.from('fakepng'), 'test.png')
      .expect(200)
      .expect((res) => {
        expect(res.body.code).toBe(401);
      });
  });
});
