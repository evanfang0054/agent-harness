import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // 使用 pino 作为全局 logger（覆盖 NestJS 内置 Logger）
  app.useLogger(app.get(Logger));

  // 全局路由前缀 — nginx 反向代理 /api/ → /api/
  app.setGlobalPrefix('api');

  // 全局 CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 全局 ValidationPipe — 自动 trim + 白名单 + 禁止多余字段
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 全局响应拦截器 — 包装 { code: 0, data, message: 'success' }
  app.useGlobalInterceptors(new TransformInterceptor());

  // 全局异常过滤器 — 统一返回 { code, message }
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  app.get(Logger).log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
