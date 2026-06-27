# 鲜果集全栈应用 — 实现计划 Part 2

> NestJS 基础设施：项目初始化 + TypeORM/Redis 配置 + Guards/Decorators + Interceptors/Filters + Auth Module

## 前置条件

- Part 1 已完成：Monorepo 脚手架、共享类型包、init.sql、Docker 配置
- shared 包已导出：Product, Category, ProductStatus, User, UserRole, LoginDTO, RegisterDTO, LoginResponse, CartItem, AddToCartDTO, UpdateCartDTO, CartItemWithProduct, Order, OrderItem, OrderStatus, CreateOrderDTO, OrderWithItems, ApiResponse, PaginatedResponse, PaginationQuery, ErrorCode, ErrorMessage, SUCCESS_CODE
- 所有文件路径相对于 `fruit-shop/` 目录

---

## Task 6: NestJS 项目初始化

**Files:**
- Modify: `packages/server/package.json`（添加 NestJS 全部依赖）
- Modify: `packages/server/tsconfig.json`（NestJS 专用配置）
- Create: `packages/server/src/main.ts`（NestJS bootstrap）
- Create: `packages/server/src/app.module.ts`（根模块）

- [ ] **Step 1: 更新 packages/server/package.json — 添加 NestJS 全部依赖**

```json
packages/server/package.json
```

```json
{
  "name": "server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "start:prod": "node dist/main.js",
    "start:debug": "nest start --debug --watch"
  },
  "dependencies": {
    "shared": "workspace:*",
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs-modules/ioredis": "^2.0.0",
    "typeorm": "^0.3.20",
    "mysql2": "^3.9.0",
    "ioredis": "^5.3.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "@types/passport-jwt": "^4.0.0",
    "@types/bcryptjs": "^2.4.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/uuid": "^9.0.0",
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "ts-node-dev": "^2.0.0",
    "source-map-support": "^0.5.0"
  }
}
```

- [ ] **Step 2: 更新 packages/server/tsconfig.json — NestJS 专用配置**

```json
packages/server/tsconfig.json
```

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": "./",
    "paths": {
      "shared": ["../shared/src"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 packages/server/src/main.ts — NestJS bootstrap**

```typescript
packages/server/src/main.ts
```

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局路由前缀 — nginx 反向代理 /api/ → /
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

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[Nest] Application is running on: http://localhost:${port}`);
}

bootstrap();
```

- [ ] **Step 4: 创建 packages/server/src/app.module.ts — 根模块（仅含基础设施，业务模块在后续 Task 注册）**

```typescript
packages/server/src/app.module.ts
```

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';

@Module({
  imports: [
    // 环境变量配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // TypeORM 配置（数据库连接注册在 Step 2 之后的 Task 7 中完成）
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),

    // Redis 配置（连接注册在 Task 7 中完成）
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: redisConfig,
    }),

    // 业务模块在后续 Task 中逐个注册
    // AuthModule, UserModule, ProductModule, CartModule, OrderModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 5: 创建 packages/server/nest-cli.json**

```json
packages/server/nest-cli.json
```

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "webpack": false
  }
}
```

- [ ] **Step 6: 安装依赖**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop
pnpm install
```

- [ ] **Step 7: Commit**

```bash
git add fruit-shop/packages/server/package.json fruit-shop/packages/server/tsconfig.json fruit-shop/packages/server/nest-cli.json fruit-shop/packages/server/src/main.ts fruit-shop/packages/server/src/app.module.ts fruit-shop/pnpm-lock.yaml
git commit -m "feat(server): NestJS 项目初始化 — 依赖安装 + tsconfig + bootstrap + 根模块骨架"
```

---

## Task 7: TypeORM + Redis 配置

**Files:**
- Create: `packages/server/src/config/database.config.ts`
- Create: `packages/server/src/config/redis.config.ts`
- Modify: `packages/server/src/app.module.ts`（确认集成）

- [ ] **Step 1: 创建 packages/server/src/config/database.config.ts — TypeORM 配置**

```typescript
packages/server/src/config/database.config.ts
```

```typescript
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USERNAME', 'root'),
  password: configService.get<string>('DB_PASSWORD', 'root123'),
  database: configService.get<string>('DB_DATABASE', 'fruit_shop'),
  // autoLoadEntities: true — 每个 module 中 TypeOrmModule.forFeature() 注册的 Entity 自动加载
  autoLoadEntities: true,
  synchronize: false, // 生产环境禁止 true，使用 init.sql 管理表结构
  logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
  timezone: '+08:00', // 东八区
  charset: 'utf8mb4',
});
```

- [ ] **Step 2: 创建 packages/server/src/config/redis.config.ts — Redis 配置**

```typescript
packages/server/src/config/redis.config.ts
```

```typescript
import { ConfigService } from '@nestjs/config';
import { RedisModuleOptions } from '@nestjs-modules/ioredis';

export const redisConfig = (
  configService: ConfigService,
): RedisModuleOptions => ({
  type: 'single',
  url: configService.get<string>(
    'REDIS_URL',
    `redis://${configService.get<string>('REDIS_HOST', 'localhost')}:${configService.get<number>('REDIS_PORT', 6379)}`,
  ),
});
```

- [ ] **Step 3: 创建 packages/server/.env.example — 环境变量模板**

```
packages/server/.env.example
```

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root123
DB_DATABASE=fruit_shop
DB_LOGGING=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-jwt-secret-change-in-prod
JWT_ACCESS_EXPIRES_IN=900
JWT_REFRESH_EXPIRES_IN=604800

# Server
PORT=3000
```

- [ ] **Step 4: 确认 app.module.ts 已集成**

Task 6 中创建的 `app.module.ts` 已经通过 `TypeOrmModule.forRootAsync` 和 `RedisModule.forRootAsync` 分别引用了 `databaseConfig` 和 `redisConfig`，无需额外修改。

但需要确认 `app.module.ts` 中的 import 路径正确：

```typescript
// app.module.ts 中已有的 import：
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
```

如果 Task 6 创建时已包含这些 import，则跳过此步。

- [ ] **Step 5: 验证编译**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop
pnpm --filter server exec tsc --noEmit
```

预期：无类型错误。

- [ ] **Step 6: Commit**

```bash
git add fruit-shop/packages/server/src/config/ fruit-shop/packages/server/.env.example
git commit -m "feat(server): TypeORM + Redis 配置 — 数据库和缓存连接从环境变量读取"
```

---

## Task 8: Guards + Decorators

**Files:**
- Create: `packages/server/src/common/guards/jwt-auth.guard.ts`
- Create: `packages/server/src/common/guards/roles.guard.ts`
- Create: `packages/server/src/common/decorators/current-user.decorator.ts`
- Create: `packages/server/src/common/decorators/roles.decorator.ts`
- Create: `packages/server/src/common/decorators/public.decorator.ts`

- [ ] **Step 1: 创建 packages/server/src/common/decorators/public.decorator.ts — @Public() 装饰器**

```typescript
packages/server/src/common/decorators/public.decorator.ts
```

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 标记接口为公开接口，跳过 JWT 认证
 * @example @Public()
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 2: 创建 packages/server/src/common/decorators/roles.decorator.ts — @Roles() 装饰器**

```typescript
packages/server/src/common/decorators/roles.decorator.ts
```

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'shared';

export const ROLES_KEY = 'roles';

/**
 * 标记接口所需角色
 * @example @Roles(UserRole.ADMIN)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 3: 创建 packages/server/src/common/decorators/current-user.decorator.ts — @CurrentUser() 参数装饰器**

```typescript
packages/server/src/common/decorators/current-user.decorator.ts
```

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 从 request.user 中提取当前用户信息
 * 由 JwtAuthGuard (passport-jwt) 注入
 * @example @CurrentUser() user: { id: number; role: string }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    // 支持 @CurrentUser('id') 提取单个字段
    return data ? user?.[data] : user;
  },
);
```

- [ ] **Step 4: 创建 packages/server/src/common/guards/jwt-auth.guard.ts — JWT 认证 Guard**

```typescript
packages/server/src/common/guards/jwt-auth.guard.ts
```

```typescript
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ErrorCode, ErrorMessage } from 'shared';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * 判断是否需要认证
   * 被 @Public() 标记的接口跳过认证
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  /**
   * Passport jwt 策略验证后的回调
   */
  handleRequest<TUser = any>(err: any, user: TUser, info: any): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(ErrorMessage[ErrorCode.UNAUTHORIZED])
      );
    }
    return user;
  }
}
```

- [ ] **Step 5: 创建 packages/server/src/common/guards/roles.guard.ts — 角色权限 Guard**

```typescript
packages/server/src/common/guards/roles.guard.ts
```

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole, ErrorCode, ErrorMessage } from 'shared';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取 @Roles() 装饰器指定的角色列表
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有 @Roles() 装饰器，则不需要角色检查
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(ErrorMessage[ErrorCode.FORBIDDEN]);
    }

    return true;
  }
}
```

- [ ] **Step 6: 验证编译**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop
pnpm --filter server exec tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add fruit-shop/packages/server/src/common/
git commit -m "feat(server): Guards + Decorators — JwtAuthGuard(黑名单检查) + RolesGuard + @CurrentUser/@Roles/@Public"
```

---

## Task 9: Interceptors + Filters

**Files:**
- Create: `packages/server/src/common/interceptors/transform.interceptor.ts`
- Create: `packages/server/src/common/filters/http-exception.filter.ts`
- Modify: `packages/server/src/main.ts`（注册全局 Interceptor 和 Filter）

- [ ] **Step 1: 创建 packages/server/src/common/interceptors/transform.interceptor.ts — 统一响应包装**

```typescript
packages/server/src/common/interceptors/transform.interceptor.ts
```

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SUCCESS_CODE } from 'shared';

/**
 * 统一成功响应格式
 * { code: 0, data: T, message: 'success' }
 */
export interface ApiResponseFormat<T> {
  code: number;
  data: T;
  message: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseFormat<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseFormat<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: SUCCESS_CODE,
        data,
        message: 'success',
      })),
    );
  }
}
```

- [ ] **Step 2: 创建 packages/server/src/common/filters/http-exception.filter.ts — 统一异常格式**

```typescript
packages/server/src/common/filters/http-exception.filter.ts
```

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * 统一异常响应格式
 * { code: number, message: string }
 *
 * 业务异常 (HttpException):
 *   - 从 exception.getResponse() 中提取 code 和 message
 *   - 如果 response 是字符串，则 code 使用 HTTP status
 *
 * 未知异常:
 *   - code: 500
 *   - message: '服务器内部错误'
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let code = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        // class-validator 验证错误格式: { message: string[], error: string, statusCode: number }
        const resp = exceptionResponse as Record<string, any>;
        if (Array.isArray(resp.message)) {
          code = status;
          message = resp.message.join('; ');
        } else if (typeof resp.code === 'number') {
          // 自定义业务异常: { code: 40001, message: '...' }
          code = resp.code;
          message = resp.message || exception.message;
        } else {
          code = status;
          message = resp.message || exception.message;
        }
      } else if (typeof exceptionResponse === 'string') {
        code = status;
        message = exceptionResponse;
      }
    } else {
      // 非HttpException的未知错误，记录日志
      this.logger.error('Unhandled exception:', exception);
    }

    response.status(HttpStatus.OK).json({
      code,
      message,
    });
  }
}
```

- [ ] **Step 3: 更新 packages/server/src/main.ts — 注册全局 Interceptor 和 Filter**

```typescript
packages/server/src/main.ts
```

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  console.log(`[Nest] Application is running on: http://localhost:${port}`);
}

bootstrap();
```

- [ ] **Step 4: 验证编译**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop
pnpm --filter server exec tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add fruit-shop/packages/server/src/common/interceptors/ fruit-shop/packages/server/src/common/filters/ fruit-shop/packages/server/src/main.ts
git commit -m "feat(server): Interceptors + Filters — TransformInterceptor 统一响应包装 + HttpExceptionFilter 统一异常格式"
```

---

## Task 10: Auth Module

**Files:**
- Create: `packages/server/src/modules/auth/dto/register.dto.ts`
- Create: `packages/server/src/modules/auth/dto/login.dto.ts`
- Create: `packages/server/src/modules/auth/dto/refresh-token.dto.ts`
- Create: `packages/server/src/modules/auth/auth.service.ts`
- Create: `packages/server/src/modules/auth/jwt.strategy.ts`
- Create: `packages/server/src/modules/auth/auth.controller.ts`
- Create: `packages/server/src/modules/auth/auth.module.ts`
- Modify: `packages/server/src/app.module.ts`（注册 AuthModule）

- [ ] **Step 1: 创建 packages/server/src/modules/auth/dto/register.dto.ts — 注册 DTO**

```typescript
packages/server/src/modules/auth/dto/register.dto.ts
```

```typescript
import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  @MaxLength(20, { message: '密码最多20位' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;
}
```

- [ ] **Step 2: 创建 packages/server/src/modules/auth/dto/login.dto.ts — 登录 DTO**

```typescript
packages/server/src/modules/auth/dto/login.dto.ts
```

```typescript
import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  phone: string;

  @IsString()
  password: string;
}
```

- [ ] **Step 3: 创建 packages/server/src/modules/auth/dto/refresh-token.dto.ts — 刷新 Token DTO**

```typescript
packages/server/src/modules/auth/dto/refresh-token.dto.ts
```

```typescript
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
```

- [ ] **Step 4: 创建 packages/server/src/modules/auth/jwt.strategy.ts — Passport JWT 策略**

```typescript
packages/server/src/modules/auth/jwt.strategy.ts
```

```typescript
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { ErrorCode, ErrorMessage } from 'shared';

interface JwtPayload {
  sub: number;
  phone: string;
  role: string;
  jti: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @Inject('REDIS_CLIENT')
    private redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'your-jwt-secret-change-in-prod'),
      passReqToCallback: false,
    });
  }

  /**
   * Passport 自动调用此方法验证 JWT payload
   * 1. 检查 token 类型必须是 access
   * 2. 检查 jti 是否在 Redis 黑名单中（已登出的 token）
   */
  async validate(payload: JwtPayload) {
    // 仅 accessToken 用于认证
    if (payload.type !== 'access') {
      throw new UnauthorizedException(ErrorMessage[ErrorCode.TOKEN_INVALID]);
    }

    // 检查 Redis 黑名单 — 登出时将 jti 加入黑名单，TTL 与 token 剩余过期时间一致
    const isBlacklisted = await this.redis.get(`token:blacklist:${payload.jti}`);
    if (isBlacklisted) {
      throw new UnauthorizedException(ErrorMessage[ErrorCode.TOKEN_EXPIRED]);
    }

    // 返回值会被挂载到 request.user
    return {
      id: payload.sub,
      phone: payload.phone,
      role: payload.role,
      jti: payload.jti,
    };
  }
}
```

- [ ] **Step 5: 创建 packages/server/src/modules/auth/auth.service.ts — 认证服务**

```typescript
packages/server/src/modules/auth/auth.service.ts
```

```typescript
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  UserRole,
  ErrorCode,
  ErrorMessage,
} from 'shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  /**
   * 注册
   * - 首个注册用户自动设为 admin
   * - bcrypt 加密密码 (salt rounds: 10)
   */
  async register(dto: RegisterDto) {
    // 检查手机号是否已注册
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException(ErrorMessage[ErrorCode.PHONE_EXISTS]);
    }

    // 判断是否为首个用户 → admin
    const userCount = await this.userRepo.count();
    const role = userCount === 0 ? UserRole.ADMIN : UserRole.USER;

    // bcrypt 加密
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      phone: dto.phone,
      password: hashedPassword,
      nickname: dto.nickname || null,
      role,
    });
    await this.userRepo.save(user);

    // 生成 token
    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    // 返回时不包含 password
    const { password: _, ...userWithoutPassword } = user;

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userWithoutPassword,
    };
  }

  /**
   * 登录
   * - bcrypt 校验密码
   * - 返回 accessToken + refreshToken + user
   */
  async login(dto: LoginDto) {
    // 查找用户（需要 password 字段）
    const user = await this.userRepo
      .createQueryBuilder('u')
      .where('u.phone = :phone', { phone: dto.phone })
      .getOne();

    if (!user) {
      throw new UnauthorizedException(ErrorMessage[ErrorCode.AUTH_FAILED]);
    }

    // bcrypt 校验
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(ErrorMessage[ErrorCode.AUTH_FAILED]);
    }

    // 生成 token
    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    // 返回时排除 password
    const { password: _, ...userWithoutPassword } = user;

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userWithoutPassword,
    };
  }

  /**
   * 刷新 Token
   * - 验证 refreshToken 有效性
   * - 返回新的 accessToken
   */
  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET', 'your-jwt-secret-change-in-prod'),
      });

      // 必须是 refresh 类型的 token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException(
          ErrorMessage[ErrorCode.REFRESH_TOKEN_INVALID],
        );
      }

      // 检查 refresh token 是否在黑名单中
      const isBlacklisted = await this.redis.get(
        `token:blacklist:${payload.jti}`,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException(
          ErrorMessage[ErrorCode.REFRESH_TOKEN_INVALID],
        );
      }

      // 验证用户是否仍存在
      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException(
          ErrorMessage[ErrorCode.REFRESH_TOKEN_INVALID],
        );
      }

      // 仅返回新的 accessToken，refreshToken 不自动续期
      const accessToken = this.generateAccessToken(
        user.id,
        user.phone,
        user.role,
      );

      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        ErrorMessage[ErrorCode.REFRESH_TOKEN_INVALID],
      );
    }
  }

  /**
   * 登出
   * - 将 accessToken 的 jti 加入 Redis 黑名单
   * - TTL = token 剩余过期时间（秒）
   */
  async logout(userId: number, jti: string, tokenRaw: string) {
    try {
      const decoded = this.jwtService.decode(tokenRaw) as {
        exp?: number;
      } | null;

      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redis.set(
            `token:blacklist:${jti}`,
            '1',
            'EX',
            ttl,
          );
        }
      }
    } catch {
      // 即使 decode 失败也静默处理，登出不应抛出异常
    }

    return null;
  }

  // ========== 私有方法 ==========

  /**
   * 生成 accessToken + refreshToken
   * accessToken:  15 min, payload 含 jti + type='access'
   * refreshToken: 7 days, payload 含 jti + type='refresh'
   */
  private async generateTokens(
    userId: number,
    phone: string,
    role: string,
  ) {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const accessExpiresIn = this.configService.get<number>(
      'JWT_ACCESS_EXPIRES_IN',
      900,
    ); // 15 min = 900s
    const refreshExpiresIn = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN',
      604800,
    ); // 7 days = 604800s

    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        phone,
        role,
        jti: accessJti,
        type: 'access',
      },
      { expiresIn: accessExpiresIn },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: userId,
        phone,
        role,
        jti: refreshJti,
        type: 'refresh',
      },
      { expiresIn: refreshExpiresIn },
    );

    return { accessToken, refreshToken };
  }

  private generateAccessToken(
    userId: number,
    phone: string,
    role: string,
  ): string {
    const accessJti = uuidv4();
    const accessExpiresIn = this.configService.get<number>(
      'JWT_ACCESS_EXPIRES_IN',
      900,
    );

    return this.jwtService.sign(
      {
        sub: userId,
        phone,
        role,
        jti: accessJti,
        type: 'access',
      },
      { expiresIn: accessExpiresIn },
    );
  }
}
```

- [ ] **Step 6: 创建 packages/server/src/modules/auth/auth.controller.ts — 认证控制器**

```typescript
packages/server/src/modules/auth/auth.controller.ts
```

```typescript
import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register
   * 注册新用户 — 公开接口
   */
  @Post('register')
  @Public()
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /api/auth/login
   * 登录 — 公开接口
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /api/auth/refresh
   * 刷新 accessToken — 公开接口
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  /**
   * POST /api/auth/logout
   * 登出 — 需认证，将 accessToken 加入黑名单
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: { id: number; jti: string },
    @Req() req: Request,
  ) {
    // 从 Header 中提取原始 token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    return this.authService.logout(user.id, user.jti, token);
  }
}
```

- [ ] **Step 7: 创建 packages/server/src/modules/auth/auth.module.ts — 认证模块**

```typescript
packages/server/src/modules/auth/auth.module.ts
```

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from '../../entities/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          'JWT_SECRET',
          'your-jwt-secret-change-in-prod',
        ),
        signOptions: {
          expiresIn: configService.get<number>('JWT_ACCESS_EXPIRES_IN', 900),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 8: 在 app.module.ts 中注册 AuthModule**

在 `app.module.ts` 的 `imports` 数组中添加 `AuthModule`：

```typescript
packages/server/src/app.module.ts
```

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule, InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),

    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: redisConfig,
    }),

    AuthModule,
  ],
  controllers: [],
  providers: [
    // 将 @nestjs-modules/ioredis 提供的 Redis 实例重新导出为 'REDIS_CLIENT' token
    // 供 JwtAuthGuard / JwtStrategy / AuthService 通过 @Inject('REDIS_CLIENT') 使用
    {
      provide: 'REDIS_CLIENT',
      useFactory: (redis: Redis) => redis,
      inject: [InjectRedis],
    },
  ],
})
export class AppModule {}
```

- [ ] **Step 9: 创建 packages/server/src/entities/user.entity.ts — UserEntity（Auth 模块依赖）**

Auth 模块需要 UserEntity。完整 entity 定义在 Part 3 Task 11 中完成，此处先创建一个最小可用版本（**Part 3 Task 11 Step 1 将用正式版本替换此文件**）：

```typescript
packages/server/src/entities/user.entity.ts
```

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from 'shared';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  phone: string;

  @Column({ length: 255, select: false })
  password: string;

  @Column({ length: 50, nullable: true })
  nickname: string;

  @Column({ length: 500, nullable: true })
  avatar: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: UserRole.USER,
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 10: 验证编译**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop
pnpm --filter server exec tsc --noEmit
```

预期：无类型错误。

- [ ] **Step 11: Commit**

```bash
git add fruit-shop/packages/server/src/modules/auth/ fruit-shop/packages/server/src/entities/ fruit-shop/packages/server/src/app.module.ts
git commit -m "feat(server): Auth Module — 注册/登录/刷新/登出，JWT双token，首用户admin，Redis黑名单"
```

---

## Task 依赖关系

```
Task 6 (NestJS 项目初始化)
  └── Task 7 (TypeORM + Redis 配置) ──── 依赖 Task 6 (需要 app.module.ts)
        └── Task 8 (Guards + Decorators) ── 依赖 Task 6 (需要 @nestjs/common)
              └── Task 9 (Interceptors + Filters) ── 依赖 Task 6
                    └── Task 10 (Auth Module) ────── 依赖 Task 6-9 全部完成
```

建议执行顺序：Task 6 → Task 7 → Task 8 → Task 9 → Task 10

---

## Contract DoD 映射

| DoD 条目 | 对应 Task |
|---------|-----------|
| 注册新用户 → 登录成功返回 token → 用 token 访问受保护接口成功 → 登出后 token 失效（返回 401） | Task 10 (Auth Module 完整流程) |
| accessToken 过期后，前端自动用 refreshToken 刷新成功继续请求 | Task 10 (AuthService.refresh) |
| refreshToken 失效则跳转登录页 | Task 10 (refresh 抛出 REFRESH_TOKEN_INVALID) |
| 首个注册用户自动设为 admin | Task 10 (AuthService.register userCount === 0) |
| admin 才能访问 POST/PUT/DELETE /api/products，非 admin 返回 403 | Task 8 (RolesGuard + @Roles) |
| 所有 API 响应统一 `{ code, data?, message }` 格式 | Task 9 (TransformInterceptor + HttpExceptionFilter) |
| 错误码 40001 范围（认证）、40003（无权限） | Task 9 (HttpExceptionFilter) + shared/constants.ts |
| JWT 黑名单机制 | Task 10 (AuthService.logout + JwtStrategy.validate) |
