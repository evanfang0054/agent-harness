import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Redis } from 'ioredis';
import { ProductEntity, CategoryEntity } from '../../entities';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ErrorCode, ErrorMessage, ProductStatus } from 'shared';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  async findAll(query: QueryProductDto) {
    const { categoryId, keyword, page = 1, limit = 10 } = query;
    const cacheKey = `products:${categoryId || 'all'}:${keyword || 'all'}:${page}:${limit}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const qb = this.productRepo.createQueryBuilder('p');

    if (categoryId) {
      qb.andWhere('p.category_id = :categoryId', { categoryId });
    }

    if (keyword) {
      qb.andWhere('p.name LIKE :keyword', { keyword: `%${keyword}%` });
    }

    qb.andWhere('p.status = :status', { status: ProductStatus.ON });

    const total = await qb.getCount();
    const list = await qb
      .orderBy('p.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const result = { list, total, page, limit };

    // Cache for 60 seconds
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 60);

    return result;
  }

  async findOne(id: number) {
    const cacheKey = `product:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(ErrorMessage[ErrorCode.PRODUCT_NOT_FOUND]);
    }

    await this.redis.set(cacheKey, JSON.stringify(product), 'EX', 60);
    return product;
  }

  async findRecommendations(opts: { limit?: number; excludeId?: number }) {
    const limit = Math.min(opts.limit ?? 10, 20);
    const excludeId = opts.excludeId ?? 0;
    const cacheKey = `products:recs:${limit}:${excludeId}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: ProductStatus.ON })
      .andWhere('p.stock > 0');

    if (excludeId > 0) {
      qb.andWhere('p.id != :excludeId', { excludeId });
    }

    const list = await qb
      .orderBy('p.created_at', 'DESC')
      .take(limit)
      .getMany();

    const result = { list };
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 60);
    return result;
  }

  async create(dto: CreateProductDto) {
    const product = this.productRepo.create(dto);
    const saved = await this.productRepo.save(product);
    await this.clearProductCache();
    return saved;
  }

  async update(id: number, dto: UpdateProductDto) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(ErrorMessage[ErrorCode.PRODUCT_NOT_FOUND]);
    }

    Object.assign(product, dto);
    const saved = await this.productRepo.save(product);
    await this.clearProductCache();
    await this.redis.del(`product:${id}`);
    return saved;
  }

  async remove(id: number) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(ErrorMessage[ErrorCode.PRODUCT_NOT_FOUND]);
    }

    await this.productRepo.remove(product);
    await this.clearProductCache();
    await this.redis.del(`product:${id}`);
    return null;
  }

  async findAllCategories() {
    const cacheKey = 'categories:all';
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.categoryRepo.find({
      order: { sortOrder: 'ASC' },
    });

    await this.redis.set(cacheKey, JSON.stringify(categories), 'EX', 300);
    return categories;
  }

  private async clearProductCache() {
    const keys = await this.redis.keys('products:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
