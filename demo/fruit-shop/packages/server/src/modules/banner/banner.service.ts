import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { BannerEntity } from '../../entities/banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { ErrorCode, ErrorMessage } from 'shared';

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(BannerEntity)
    private readonly bannerRepo: Repository<BannerEntity>,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  async findActive() {
    const cacheKey = 'banners:active';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const banners = await this.bannerRepo.find({
      where: { status: 1 },
      order: { sortOrder: 'ASC' },
    });

    await this.redis.set(cacheKey, JSON.stringify(banners), 'EX', 300);
    return banners;
  }

  async findAll() {
    return this.bannerRepo.find({ order: { sortOrder: 'ASC' } });
  }

  async create(dto: CreateBannerDto) {
    const banner = this.bannerRepo.create(dto);
    const saved = await this.bannerRepo.save(banner);
    await this.clearCache();
    return saved;
  }

  async update(id: number, dto: UpdateBannerDto) {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException(ErrorMessage[ErrorCode.PRODUCT_NOT_FOUND]);
    }
    Object.assign(banner, dto);
    const saved = await this.bannerRepo.save(banner);
    await this.clearCache();
    return saved;
  }

  async remove(id: number) {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException(ErrorMessage[ErrorCode.PRODUCT_NOT_FOUND]);
    }
    await this.bannerRepo.remove(banner);
    await this.clearCache();
    return null;
  }

  private async clearCache() {
    const keys = await this.redis.keys('banners:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
