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
