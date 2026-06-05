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
  synchronize: true, // 开发环境自动同步表结构
  logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
  timezone: '+08:00', // 东八区
  charset: 'utf8mb4',
});
