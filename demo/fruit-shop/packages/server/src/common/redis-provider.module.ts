import { Global, Module } from '@nestjs/common';
import { RedisModule, getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisConfig } from '../config/redis.config';

@Global()
@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: redisConfig,
    }),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (redis: Redis) => redis,
      inject: [getRedisConnectionToken()],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisProviderModule {}
