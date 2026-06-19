import request from 'supertest';
import { TestHelper } from './helpers/test-helper';

describe('Auth (e2e)', () => {
  const helper = new TestHelper();

  beforeAll(async () => {
    await helper.setup();
    await helper.cleanDatabase();
  });

  afterAll(async () => {
    await helper.teardown();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', () => {
      return request(helper.httpServer)
        .post('/api/auth/register')
        .send({ phone: '13800000001', password: 'test123456' })
        .expect(201)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.refreshToken).toBeDefined();
          expect(res.body.data.user.phone).toBe('13800000001');
        });
    });

    it('should reject duplicate phone', () => {
      return request(helper.httpServer)
        .post('/api/auth/register')
        .send({ phone: '13800000001', password: 'test123456' })
        .expect(200)
        .expect((res) => {
          // ConflictException(status 409) 经 HttpExceptionFilter 透传 status 作为 code
          expect(res.body.code).toBe(409);
          expect(res.body.message).toContain('已注册');
        });
    });

    it('should reject invalid phone format', () => {
      return request(helper.httpServer)
        .post('/api/auth/register')
        .send({ phone: '123', password: 'test123456' })
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(400); // ValidationPipe Bad Request
        });
    });

    it('should reject short password', () => {
      return request(helper.httpServer)
        .post('/api/auth/register')
        .send({ phone: '13800000002', password: '123' })
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(400);
        });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', () => {
      return request(helper.httpServer)
        .post('/api/auth/login')
        .send({ phone: '13800000001', password: 'test123456' })
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.accessToken).toBeDefined();
        });
    });

    it('should reject wrong password', () => {
      return request(helper.httpServer)
        .post('/api/auth/login')
        .send({ phone: '13800000001', password: 'wrongpassword' })
        .expect(200)
        .expect((res) => {
          // UnauthorizedException(status 401) 经 HttpExceptionFilter 透传 status 作为 code
          expect(res.body.code).toBe(401);
        });
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const tokens = await helper.registerAndLogin('13800000003', 'test123456');
      refreshToken = tokens.refreshToken;
    });

    it('should refresh access token', () => {
      return request(helper.httpServer)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.accessToken).toBeDefined();
        });
    });

    it('should reject invalid refresh token', () => {
      return request(helper.httpServer)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(200)
        .expect((res) => {
          // UnauthorizedException(status 401) 经 HttpExceptionFilter 透传 status 作为 code
          expect(res.body.code).toBe(401);
        });
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      const tokens = await helper.registerAndLogin('13800000004', 'test123456');
      accessToken = tokens.accessToken;
    });

    it('should logout successfully', () => {
      return request(helper.httpServer)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
        });
    });

    it('should reject request without token', () => {
      return request(helper.httpServer)
        .post('/api/auth/logout')
        .expect(200)
        .expect((res) => {
          // JwtAuthGuard 抛出 UnauthorizedException(status 401) → code 401
          expect(res.body.code).toBe(401);
        });
    });
  });

  describe('Logout 黑名单 + token 类型校验', () => {
    let accessToken: string;
    let refreshToken: string;
    let userTokens: { accessToken: string; refreshToken: string };

    beforeAll(async () => {
      userTokens = await helper.registerAndLogin('13800000010', 'test123456');
      accessToken = userTokens.accessToken;
      refreshToken = userTokens.refreshToken;
    });

    it('should reject access after logout (Redis blacklist)', async () => {
      // 先登出
      await request(helper.httpServer)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 再用同一 token 访问需鉴权接口 → 401
      return request(helper.httpServer)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(401);
        });
    });

    it('should reject refresh with access token (wrong type)', () => {
      return request(helper.httpServer)
        .post('/api/auth/refresh')
        .send({ refreshToken: accessToken }) // 误用 accessToken
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(401);
        });
    });

    it('should reject invalid/expired refresh token', () => {
      return request(helper.httpServer)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'aaa.bbb.ccc' }) // 非法 JWT
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(401);
        });
    });
  });

  describe('Rate limiting', () => {
    it('should rate-limit login after 10 requests per minute', async () => {
      // 注：ThrottlerModule 使用进程级 in-memory store，限流按 IP 计数。
      // 本文件前面的 login/register 测试已经消耗了部分配额，且共享同一个 helper
      // 实例（同一进程、同一 IP）。为使限流可在本测试稳定触发，直接循环发起
      // 请求直到命中 429，避免对具体起始计数做硬编码假设。
      let rateLimitedResponse: any;
      for (let i = 0; i < 15; i++) {
        const res = await request(helper.httpServer)
          .post('/api/auth/login')
          .send({ phone: '13800000099', password: 'wrong' });
        if (res.status === 429) {
          rateLimitedResponse = res;
          break;
        }
      }
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body.code).toBe(429);
    });
  });
});
