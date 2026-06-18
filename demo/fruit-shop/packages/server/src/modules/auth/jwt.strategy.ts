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
