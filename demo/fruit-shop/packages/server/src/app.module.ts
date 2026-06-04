import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule, InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProductModule } from './modules/product/product.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';

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
    UserModule,
    ProductModule,
    CartModule,
    OrderModule,
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
