import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProductModule } from './modules/product/product.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { RefundModule } from './modules/refund/refund.module';
import { HealthModule } from './modules/health/health.module';
import { BannerModule } from './modules/banner/banner.module';
import { AddressModule } from './modules/address/address.module';
import { ReviewModule } from './modules/review/review.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { UploadModule } from './modules/upload/upload.module';
import { RedisProviderModule } from './common/redis-provider.module';
import { LoggingModule } from './common/logging/logging.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // 测试环境优先加载 .env.test（隔离的 fruit_shop_test + REDIS_DB=1）
      envFilePath:
        process.env.NODE_ENV === 'test'
          ? ['.env.test', '.env.local', '.env']
          : ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 60 }],
    }),
    LoggingModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),

    RedisProviderModule,

    AuthModule,
    UserModule,
    ProductModule,
    CartModule,
    OrderModule,
    RefundModule,
    HealthModule,
    BannerModule,
    AddressModule,
    ReviewModule,
    FavoriteModule,
    CouponModule,
    UploadModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    TransformInterceptor,
    HttpExceptionFilter,
  ],
})
export class AppModule {}
