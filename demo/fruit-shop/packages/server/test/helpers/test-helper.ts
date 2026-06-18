import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { Server } from 'http';

export class TestHelper {
  app: INestApplication;
  httpServer: Server;

  async setup() {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.app.setGlobalPrefix('api');
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    // 与 main.ts 保持一致：通过 DI 获取 interceptor/filter，确保 Reflector/PinoLogger 正确注入
    this.app.useGlobalInterceptors(this.app.get(TransformInterceptor));
    this.app.useGlobalFilters(this.app.get(HttpExceptionFilter));

    await this.app.init();
    this.httpServer = this.app.getHttpServer();
  }

  async teardown() {
    if (this.app) {
      await this.app.close();
    }
  }

  /**
   * 清空 e2e 测试相关表，避免跨 run 数据污染（手机号已注册等）。
   * 不清 categories / products：这些是种子数据，且 e2e 依赖其存在。
   */
  async cleanDatabase() {
    const dataSource = this.app.get(DataSource);
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await dataSource.query('TRUNCATE TABLE order_items');
    await dataSource.query('TRUNCATE TABLE orders');
    await dataSource.query('TRUNCATE TABLE carts');
    await dataSource.query('TRUNCATE TABLE users');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  /**
   * 注册用户并返回 auth tokens
   */
  async registerAndLogin(
    phone = '13800000001',
    password = 'test123456',
    nickname?: string,
  ): Promise<{ accessToken: string; refreshToken: string; userId: number }> {
    const body: any = { phone, password };
    if (nickname) body.nickname = nickname;

    const res = await request(this.httpServer)
      .post('/api/auth/register')
      .send(body);

    // 响应被 TransformInterceptor 包装: { code: 0, data: { accessToken, refreshToken, user } }
    const data = res.body?.data ?? {};
    const { accessToken, refreshToken, user } = data;
    return { accessToken, refreshToken, userId: user.id };
  }

  /**
   * 以 ADMIN 身份注册并登录（第一个注册的用户自动成为 ADMIN）
   */
  async registerAdmin(
    phone = '13900000001',
    password = 'admin123456',
  ) {
    return this.registerAndLogin(phone, password, 'Admin');
  }
}
