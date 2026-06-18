## Task 5: 改造 `main.ts` — 注册 PinoLogger

**Files:**
- Modify: `packages/server/src/main.ts`

- [ ] **Step 1: 改造文件**

完整替换 `main.ts` 为：

```ts
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
```

变化点：
1. import `Logger` from `nestjs-pino`
2. `NestFactory.create(AppModule, { bufferLogs: true })` — 缓冲启动期日志
3. `app.useLogger(app.get(Logger))` — 注册
4. 启动日志用 `app.get(Logger).log(...)` 取代 `console.log`

- [ ] **Step 2: 启动验证 D1**

Run（终端 1）:
```bash
pnpm --filter server dev
```
Expected: 启动时 stdout 输出含 `Application is running on: http://localhost:3000` 的 pretty 行（含 timestamp + level + context）。

- [ ] **Step 3: 提交**

```bash
git add packages/server/src/main.ts
git commit -m "feat(logging): main.ts 接入 PinoLogger 替换 console.log"
```

---

