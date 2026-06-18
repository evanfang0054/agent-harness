import request from 'supertest';
import { TestHelper } from './helpers/test-helper';

describe('Health (e2e)', () => {
  const helper = new TestHelper();

  beforeAll(async () => {
    await helper.setup();
  });

  afterAll(async () => {
    await helper.teardown();
  });

  describe('GET /api/health', () => {
    it('should return health status without auth', () => {
      return request(helper.httpServer)
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.details.database.status).toBe('up');
          expect(res.body.details.redis.status).toBe('up');
        });
    });

    it('should not be wrapped by TransformInterceptor', () => {
      return request(helper.httpServer)
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          // terminus 响应不应有 code/data/message 包装
          expect(res.body.code).toBeUndefined();
          expect(res.body.data).toBeUndefined();
        });
    });
  });
});
