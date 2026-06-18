import request from 'supertest';
import { TestHelper } from './helpers/test-helper';

describe('User (e2e)', () => {
  const helper = new TestHelper();
  let accessToken: string;

  beforeAll(async () => {
    await helper.setup();
    await helper.cleanDatabase();
    const tokens = await helper.registerAndLogin(
      '13800000010',
      'test123456',
      'TestUser',
    );
    accessToken = tokens.accessToken;
  });

  afterAll(async () => {
    await helper.teardown();
  });

  describe('GET /api/user/profile', () => {
    it('should return user profile', () => {
      return request(helper.httpServer)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.phone).toBe('13800000010');
          expect(res.body.data.nickname).toBe('TestUser');
        });
    });

    it('should reject unauthenticated request', () => {
      return request(helper.httpServer)
        .get('/api/user/profile')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(401);
        });
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should update nickname', () => {
      return request(helper.httpServer)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ nickname: 'UpdatedName' })
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.nickname).toBe('UpdatedName');
        });
    });

    it('should update avatar', () => {
      return request(helper.httpServer)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ avatar: 'https://example.com/avatar.jpg' })
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.avatar).toBe('https://example.com/avatar.jpg');
        });
    });
  });
});
