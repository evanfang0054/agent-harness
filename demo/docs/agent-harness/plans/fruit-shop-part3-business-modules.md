# 鲜果集全栈应用 — 实现计划 Part 3

> 业务模块：Entities + User/Product/Cart/Order Modules

## 前置条件

- Part 1 已完成：Monorepo 脚手架、共享类型包、init.sql、Docker 配置
- Part 2 已完成：NestJS 初始化、TypeORM+Redis 配置、Guards (JwtAuthGuard, RolesGuard)、Interceptors (TransformInterceptor)、Filters (HttpExceptionFilter)、Decorators (@CurrentUser, @Roles, @Public)、JwtStrategy、Auth Module
- 所有文件路径相对于 `fruit-shop/` 目录

---

## Task 11: TypeORM Entities

**Files:**
- Create: `packages/server/src/entities/user.entity.ts`
- Create: `packages/server/src/entities/category.entity.ts`
- Create: `packages/server/src/entities/product.entity.ts`
- Create: `packages/server/src/entities/cart.entity.ts`
- Create: `packages/server/src/entities/order.entity.ts`
- Create: `packages/server/src/entities/order-item.entity.ts`
- Create: `packages/server/src/entities/index.ts`
- Modify: `packages/server/src/app.module.ts`

- [ ] **Step 1: 创建 user.entity.ts**

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

- [ ] **Step 2: 创建 category.entity.ts**

```typescript
packages/server/src/entities/category.entity.ts
```

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('categories')
export class CategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  name: string;

  @Column({ length: 50, nullable: true })
  icon: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
```

- [ ] **Step 3: 创建 product.entity.ts**

```typescript
packages/server/src/entities/product.entity.ts
```

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductStatus } from 'shared';
import { CategoryEntity } from './category.entity';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 50, nullable: true })
  origin: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'original_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalPrice: number;

  @Column({ length: 20, nullable: true })
  unit: string;

  @Column({ length: 10, nullable: true })
  sweetness: string;

  @Column({ length: 30, nullable: true })
  weight: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  tags: string[] | null;

  @Column({ length: 500, nullable: true })
  image: string;

  @Column({ length: 10, nullable: true })
  color: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number;

  @ManyToOne(() => CategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;

  @Column({ default: 999 })
  stock: number;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.ON,
  })
  status: ProductStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 4: 创建 cart.entity.ts**

```typescript
packages/server/src/entities/cart.entity.ts
```

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { ProductEntity } from './product.entity';

@Entity('carts')
@Unique(['userId', 'productId', 'specLabel'])
export class CartEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ name: 'spec_label', length: 30 })
  specLabel: string;

  @Column({ default: 1 })
  quantity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;
}
```

- [ ] **Step 5: 创建 order.entity.ts**

```typescript
packages/server/src/entities/order.entity.ts
```

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { OrderStatus } from 'shared';
import { UserEntity } from './user.entity';
import { OrderItemEntity } from './order-item.entity';

@Entity('orders')
export class OrderEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_no', length: 32, unique: true })
  orderNo: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ length: 200 })
  address: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 200, nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(() => OrderItemEntity, (item) => item.order)
  items: OrderItemEntity[];
}
```

- [ ] **Step 6: 创建 order-item.entity.ts**

```typescript
packages/server/src/entities/order-item.entity.ts
```

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderEntity } from './order.entity';

@Entity('order_items')
export class OrderItemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @Column({ name: 'product_name', length: 50 })
  productName: string;

  @Column({ name: 'spec_label', length: 30 })
  specLabel: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column()
  quantity: number;

  @Column({ length: 500, nullable: true })
  image: string;

  @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;
}
```

- [ ] **Step 7: 创建 index.ts (barrel export)**

```typescript
packages/server/src/entities/index.ts
```

```typescript
export { UserEntity } from './user.entity';
export { CategoryEntity } from './category.entity';
export { ProductEntity } from './product.entity';
export { CartEntity } from './cart.entity';
export { OrderEntity } from './order.entity';
export { OrderItemEntity } from './order-item.entity';
```

- [ ] **Step 8: 更新 app.module.ts 的 TypeOrmModule 配置**

在 `app.module.ts` 中添加 `TypeOrmModule.forFeature` 引入所有实体。找到已有的 TypeORM 配置部分（通常在 `imports` 数组中），确保 `entities` 数组包含所有 6 个实体。

```typescript
packages/server/src/app.module.ts
```

在 `TypeOrmModule.forRootAsync`（或 `forRoot`）的配置中，确保 `entities` 字段引用所有实体：

```typescript
import * as entities from './entities';

// 在 TypeOrmModule.forRootAsync 的配置工厂中:
entities: Object.values(entities),
```

或者，如果使用 `autoLoadEntities: true`（推荐），则在每个业务 module 中使用 `TypeOrmModule.forFeature([XxxEntity])` 即可自动加载，不需要在 `app.module.ts` 中显式列出。确认 `app.module.ts` 中 TypeORM 配置包含：

```typescript
TypeOrmModule.forRootAsync({
  // ... 其他配置
  useFactory: (configService: ConfigService) => ({
    // ...
    autoLoadEntities: true,
    // ...
  }),
}),
```

- [ ] **Step 9: 验证编译**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop
pnpm --filter server exec tsc --noEmit
```

预期: 无类型错误。

- [ ] **Step 10: Commit**

```bash
git add fruit-shop/packages/server/src/entities/ fruit-shop/packages/server/src/app.module.ts
git commit -m "feat(server): TypeORM entities — user/category/product/cart/order/order-item 6 个实体定义"
```

---

## Task 12: User Module

**Files:**
- Create: `packages/server/src/modules/user/dto/update-profile.dto.ts`
- Create: `packages/server/src/modules/user/user.service.ts`
- Create: `packages/server/src/modules/user/user.controller.ts`
- Create: `packages/server/src/modules/user/user.module.ts`

- [ ] **Step 1: 创建 update-profile.dto.ts**

```typescript
packages/server/src/modules/user/dto/update-profile.dto.ts
```

```typescript
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;
}
```

- [ ] **Step 2: 创建 user.service.ts**

```typescript
packages/server/src/modules/user/user.service.ts
```

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'phone', 'nickname', 'avatar', 'role', 'createdAt', 'updatedAt'],
    });
    if (!user) {
      return null;
    }
    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    await this.userRepo.update(userId, {
      ...(dto.nickname !== undefined && { nickname: dto.nickname }),
      ...(dto.avatar !== undefined && { avatar: dto.avatar }),
    });
    return this.getProfile(userId);
  }
}
```

- [ ] **Step 3: 创建 user.controller.ts**

```typescript
packages/server/src/modules/user/user.controller.ts
```

```typescript
import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: { id: number }) {
    return this.userService.getProfile(user.id);
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.id, dto);
  }
}
```

- [ ] **Step 4: 创建 user.module.ts**

```typescript
packages/server/src/modules/user/user.module.ts
```

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../entities';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

- [ ] **Step 5: 在 app.module.ts 中注册 UserModule**

在 `app.module.ts` 的 `imports` 数组中添加：

```typescript
import { UserModule } from './modules/user/user.module';

// imports 数组中添加:
UserModule,
```

- [ ] **Step 6: 验证编译**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop
pnpm --filter server exec tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add fruit-shop/packages/server/src/modules/user/ fruit-shop/packages/server/src/app.module.ts
git commit -m "feat(server): User Module — GET/PUT /user/profile，认证用户信息查询与更新"
```

---

## Task 13: Product Module (含 Category)

**Files:**
- Create: `packages/server/src/modules/product/dto/query-product.dto.ts`
- Create: `packages/server/src/modules/product/dto/create-product.dto.ts`
- Create: `packages/server/src/modules/product/dto/update-product.dto.ts`
- Create: `packages/server/src/modules/product/product.service.ts`
- Create: `packages/server/src/modules/product/product.controller.ts`
- Create: `packages/server/src/modules/product/product.module.ts`

- [ ] **Step 1: 创建 query-product.dto.ts**

```typescript
packages/server/src/modules/product/dto/query-product.dto.ts
```

```typescript
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQuery } from 'shared';

export class QueryProductDto implements PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
```

- [ ] **Step 2: 创建 create-product.dto.ts**

```typescript
packages/server/src/modules/product/dto/create-product.dto.ts
```

```typescript
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductStatus } from 'shared';

export class CreateProductDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  origin?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  sweetness?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  weight?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  color?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
```

- [ ] **Step 3: 创建 update-product.dto.ts**

```typescript
packages/server/src/modules/product/dto/update-product.dto.ts
```

```typescript
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductStatus } from 'shared';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  origin?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  sweetness?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  weight?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  color?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
```

- [ ] **Step 4: 创建 product.service.ts**

```typescript
packages/server/src/modules/product/product.service.ts
```

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Inject } from '@nestjs/common';
import { ProductEntity, CategoryEntity } from '../../entities';
import { Redis } from 'ioredis';
import { ProductStatus, ErrorCode, ErrorMessage } from 'shared';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_LIST_TTL = 300; // 5 min
const PRODUCT_DETAIL_TTL = 600; // 10 min
const CATEGORY_ALL_TTL = 1800; // 30 min

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

  // ========== 商品 ==========

  async findAll(query: QueryProductDto) {
    const { category, keyword, page = 1, limit = 10 } = query;
    const cacheKey = `product:list:${category ?? 'all'}:${page}:${limit}:${keyword ?? ''}`;

    // 查缓存
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const qb = this.productRepo.createQueryBuilder('p')
      .where('p.status = :status', { status: ProductStatus.ON });

    if (category) {
      qb.andWhere('p.category_id = :categoryId', { categoryId: category });
    }

    if (keyword) {
      qb.andWhere('p.name LIKE :keyword', { keyword: `%${keyword}%` });
    }

    const [list, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const result = { list, total, page, limit };

    // 写缓存
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', PRODUCT_LIST_TTL);

    return result;
  }

  async findOne(id: number) {
    const cacheKey = `product:detail:${id}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(ErrorMessage[ErrorCode.PRODUCT_NOT_FOUND]);
    }

    await this.redis.set(cacheKey, JSON.stringify(product), 'EX', PRODUCT_DETAIL_TTL);

    return product;
  }

  async create(dto: CreateProductDto) {
    const product = this.productRepo.create(dto);
    const saved = await this.productRepo.save(product);
    await this.clearProductListCache();
    return saved;
  }

  async update(id: number, dto: UpdateProductDto) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(ErrorMessage[ErrorCode.PRODUCT_NOT_FOUND]);
    }

    Object.assign(product, dto);
    const saved = await this.productRepo.save(product);

    // 清除详情缓存和列表缓存
    await this.redis.del(`product:detail:${id}`);
    await this.clearProductListCache();

    return saved;
  }

  async remove(id: number) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(ErrorMessage[ErrorCode.PRODUCT_NOT_FOUND]);
    }

    await this.productRepo.remove(product);

    await this.redis.del(`product:detail:${id}`);
    await this.clearProductListCache();

    return null;
  }

  // ========== 分类 ==========

  async findAllCategories() {
    const cacheKey = 'category:all';

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.categoryRepo.find({
      order: { sortOrder: 'ASC' },
    });

    await this.redis.set(cacheKey, JSON.stringify(categories), 'EX', CATEGORY_ALL_TTL);

    return categories;
  }

  // ========== 私有方法 ==========

  /**
   * 清除商品列表相关缓存（按 key 前缀模糊删除）
   */
  private async clearProductListCache() {
    const keys = await this.redis.keys('product:list:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

- [ ] **Step 5: 创建 product.controller.ts**

```typescript
packages/server/src/modules/product/product.controller.ts
```

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from 'shared';
import { ProductService } from './product.service';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * GET /products?category=&keyword=&page=1&limit=10
   * 公开接口，Redis 缓存
   */
  @Get()
  @Public()
  async findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  /**
   * GET /products/:id
   * 公开接口，Redis 缓存
   */
  @Get(':id')
  @Public()
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  /**
   * POST /products
   * admin 专用，创建后清除缓存
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  /**
   * PUT /products/:id
   * admin 专用，更新后清除缓存
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, dto);
  }

  /**
   * DELETE /products/:id
   * admin 专用，删除后清除缓存
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }
}
```

- [ ] **Step 6: 创建分类子路由 — 在 product.controller.ts 中补充 Category 路由（独立 Controller）**

由于分类路由路径 `/categories` 与 `/products` 不同前缀，需要创建独立的 Controller：

```typescript
packages/server/src/modules/product/category.controller.ts
```

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ProductService } from './product.service';

@Controller('categories')
export class CategoryController {
  constructor(private readonly productService: ProductService) {}

  /**
   * GET /categories
   * 公开接口，Redis 缓存
   */
  @Get()
  @Public()
  async findAll() {
    return this.productService.findAllCategories();
  }
}
```

- [ ] **Step 7: 创建 product.module.ts**

```typescript
packages/server/src/modules/product/product.module.ts
```

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity, CategoryEntity } from '../../entities';
import { ProductController } from './product.controller';
import { CategoryController } from './category.controller';
import { ProductService } from './product.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity, CategoryEntity])],
  controllers: [ProductController, CategoryController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
```

- [ ] **Step 8: 在 app.module.ts 中注册 ProductModule**

在 `app.module.ts` 的 `imports` 数组中添加：

```typescript
import { ProductModule } from './modules/product/product.module';

// imports 数组中添加:
ProductModule,
```

- [ ] **Step 9: 验证编译**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop
pnpm --filter server exec tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add fruit-shop/packages/server/src/modules/product/ fruit-shop/packages/server/src/app.module.ts
git commit -m "feat(server): Product Module — 商品CRUD+分类查询，Redis缓存，admin权限控制"
```

---

## Task 14: Cart Module

**Files:**
- Create: `packages/server/src/modules/cart/dto/add-to-cart.dto.ts`
- Create: `packages/server/src/modules/cart/dto/update-cart.dto.ts`
- Create: `packages/server/src/modules/cart/cart.service.ts`
- Create: `packages/server/src/modules/cart/cart.controller.ts`
- Create: `packages/server/src/modules/cart/cart.module.ts`

- [ ] **Step 1: 创建 add-to-cart.dto.ts**

```typescript
packages/server/src/modules/cart/dto/add-to-cart.dto.ts
```

```typescript
import { IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';

export class AddToCartDto {
  @IsNumber()
  productId: number;

  @IsString()
  @MaxLength(30)
  specLabel: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number = 1;
}
```

- [ ] **Step 2: 创建 update-cart.dto.ts**

```typescript
packages/server/src/modules/cart/dto/update-cart.dto.ts
```

```typescript
import { IsNumber, Min } from 'class-validator';

export class UpdateCartDto {
  @IsNumber()
  @Min(1)
  quantity: number;
}
```

- [ ] **Step 3: 创建 cart.service.ts**

```typescript
packages/server/src/modules/cart/cart.service.ts
```

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CartEntity, ProductEntity } from '../../entities';
import { ErrorCode, ErrorMessage } from 'shared';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 获取购物车列表（关联商品信息）
   */
  async findAll(userId: number) {
    const items = await this.cartRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.product', 'p')
      .where('c.user_id = :userId', { userId })
      .orderBy('c.created_at', 'DESC')
      .getMany();

    return items.map((item) => ({
      id: item.id,
      userId: item.userId,
      productId: item.productId,
      specLabel: item.specLabel,
      quantity: item.quantity,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      product: {
        id: item.product.id,
        name: item.product.name,
        price: Number(item.product.price),
        originalPrice: item.product.originalPrice ? Number(item.product.originalPrice) : null,
        image: item.product.image,
        unit: item.product.unit,
        stock: item.product.stock,
        status: item.product.status,
      },
    }));
  }

  /**
   * 加入购物车 — 利用联合唯一约束 upsert
   * 如果 user_id + product_id + spec_label 已存在则 quantity +N
   */
  async add(userId: number, dto: AddToCartDto) {
    const { productId, specLabel, quantity = 1 } = dto;

    // 验证商品存在
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(ErrorMessage[ErrorCode.PRODUCT_NOT_FOUND]);
    }

    // 使用 queryBuilder 做 upsert (ON DUPLICATE KEY UPDATE)
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(CartEntity)
      .values({
        userId,
        productId,
        specLabel,
        quantity,
      })
      .orUpdate(['quantity = quantity + VALUES(quantity)'], [
        'user_id',
        'product_id',
        'spec_label',
      ])
      .execute();

    // 查询更新后的记录
    const cartItem = await this.cartRepo.findOne({
      where: { userId, productId, specLabel },
      relations: ['product'],
    });

    return {
      id: cartItem.id,
      userId: cartItem.userId,
      productId: cartItem.productId,
      specLabel: cartItem.specLabel,
      quantity: cartItem.quantity,
      createdAt: cartItem.createdAt,
      updatedAt: cartItem.updatedAt,
      product: {
        id: cartItem.product.id,
        name: cartItem.product.name,
        price: Number(cartItem.product.price),
        originalPrice: cartItem.product.originalPrice
          ? Number(cartItem.product.originalPrice)
          : null,
        image: cartItem.product.image,
        unit: cartItem.product.unit,
        stock: cartItem.product.stock,
        status: cartItem.product.status,
      },
    };
  }

  /**
   * 更新购物车条目数量
   */
  async update(userId: number, cartId: number, dto: UpdateCartDto) {
    const cartItem = await this.cartRepo.findOne({ where: { id: cartId } });
    if (!cartItem) {
      throw new NotFoundException(ErrorMessage[ErrorCode.CART_ITEM_NOT_FOUND]);
    }
    if (cartItem.userId !== userId) {
      throw new ForbiddenException(ErrorMessage[ErrorCode.FORBIDDEN]);
    }

    cartItem.quantity = dto.quantity;
    await this.cartRepo.save(cartItem);

    return this.findAll(userId);
  }

  /**
   * 删除购物车条目
   */
  async remove(userId: number, cartId: number) {
    const cartItem = await this.cartRepo.findOne({ where: { id: cartId } });
    if (!cartItem) {
      throw new NotFoundException(ErrorMessage[ErrorCode.CART_ITEM_NOT_FOUND]);
    }
    if (cartItem.userId !== userId) {
      throw new ForbiddenException(ErrorMessage[ErrorCode.FORBIDDEN]);
    }

    await this.cartRepo.remove(cartItem);

    return this.findAll(userId);
  }

  /**
   * 批量删除购物车条目（下单后调用）
   */
  async removeByUserAndProductIds(userId: number, productIds: number[]) {
    if (productIds.length === 0) return;
    await this.cartRepo
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId AND product_id IN (:...productIds)', {
        userId,
        productIds,
      })
      .execute();
  }
}
```

- [ ] **Step 4: 创建 cart.controller.ts**

```typescript
packages/server/src/modules/cart/cart.controller.ts
```

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * GET /cart
   * 获取当前用户购物车列表（含商品信息）
   */
  @Get()
  async findAll(@CurrentUser() user: { id: number }) {
    return this.cartService.findAll(user.id);
  }

  /**
   * POST /cart
   * 加入购物车，已存在则数量累加
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async add(
    @CurrentUser() user: { id: number },
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.add(user.id, dto);
  }

  /**
   * PUT /cart/:id
   * 修改购物车条目数量
   */
  @Put(':id')
  async update(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.update(user.id, id, dto);
  }

  /**
   * DELETE /cart/:id
   * 删除购物车条目
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cartService.remove(user.id, id);
  }
}
```

- [ ] **Step 5: 创建 cart.module.ts**

```typescript
packages/server/src/modules/cart/cart.module.ts
```

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartEntity, ProductEntity } from '../../entities';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [TypeOrmModule.forFeature([CartEntity, ProductEntity])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
```

- [ ] **Step 6: 在 app.module.ts 中注册 CartModule**

在 `app.module.ts` 的 `imports` 数组中添加：

```typescript
import { CartModule } from './modules/cart/cart.module';

// imports 数组中添加:
CartModule,
```

- [ ] **Step 7: 验证编译**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop
pnpm --filter server exec tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add fruit-shop/packages/server/src/modules/cart/ fruit-shop/packages/server/src/app.module.ts
git commit -m "feat(server): Cart Module — 购物车CRUD，联合唯一约束upsert，关联商品信息查询"
```

---

## Task 15: Order Module

**Files:**
- Create: `packages/server/src/modules/order/dto/create-order.dto.ts`
- Create: `packages/server/src/modules/order/dto/query-order.dto.ts`
- Create: `packages/server/src/modules/order/order.service.ts`
- Create: `packages/server/src/modules/order/order.controller.ts`
- Create: `packages/server/src/modules/order/order.module.ts`

- [ ] **Step 1: 创建 create-order.dto.ts**

```typescript
packages/server/src/modules/order/dto/create-order.dto.ts
```

```typescript
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @MaxLength(200)
  address: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
```

- [ ] **Step 2: 创建 query-order.dto.ts**

```typescript
packages/server/src/modules/order/dto/query-order.dto.ts
```

```typescript
import { IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from 'shared';
import { PaginationQuery } from 'shared';

export class QueryOrderDto implements PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
```

- [ ] **Step 3: 创建 order.service.ts**

```typescript
packages/server/src/modules/order/order.service.ts
```

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity, OrderItemEntity, CartEntity } from '../../entities';
import { OrderStatus, ErrorCode, ErrorMessage } from 'shared';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 生成订单号: 时间戳 + 6 位随机数
   */
  private generateOrderNo(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `${timestamp}${random}`;
  }

  /**
   * 创建订单
   * 1. 获取购物车中所有商品
   * 2. 快照商品信息到 order_items
   * 3. 清除购物车中已下单商品
   */
  async create(userId: number, dto: CreateOrderDto) {
    // 获取购物车
    const cartItems = await this.cartRepo.find({
      where: { userId },
      relations: ['product'],
    });

    if (cartItems.length === 0) {
      throw new BadRequestException(ErrorMessage[ErrorCode.CART_EMPTY]);
    }

    // 验证所有商品有效
    for (const item of cartItems) {
      if (!item.product) {
        throw new NotFoundException(
          `商品 ID ${item.productId} 不存在`,
        );
      }
    }

    // 计算总金额
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    // 使用事务保证原子性
    const order = await this.dataSource.transaction(async (manager) => {
      // 创建订单
      const newOrder = manager.create(OrderEntity, {
        orderNo: this.generateOrderNo(),
        userId,
        totalAmount,
        status: OrderStatus.PENDING,
        address: dto.address,
        phone: dto.phone,
        remark: dto.remark || null,
      });
      const savedOrder = await manager.save(OrderEntity, newOrder);

      // 快照商品信息到 order_items
      const orderItems = cartItems.map((item) =>
        manager.create(OrderItemEntity, {
          orderId: savedOrder.id,
          productId: item.product.id,
          productName: item.product.name,
          specLabel: item.specLabel,
          price: Number(item.product.price),
          quantity: item.quantity,
          image: item.product.image,
        }),
      );
      await manager.save(OrderItemEntity, orderItems);

      // 清空用户购物车
      await manager.delete(CartEntity, { userId });

      return savedOrder;
    });

    // 返回完整订单（含 items）
    return this.findOne(userId, order.id);
  }

  /**
   * 获取订单列表（分页 + 状态筛选）
   */
  async findAll(userId: number, query: QueryOrderDto) {
    const { status, page = 1, limit = 10 } = query;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'oi')
      .where('o.user_id = :userId', { userId });

    if (status !== undefined) {
      qb.andWhere('o.status = :status', { status });
    }

    const [list, total] = await qb
      .orderBy('o.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { list, total, page, limit };
  }

  /**
   * 获取订单详情
   */
  async findOne(userId: number, orderId: number) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(ErrorMessage[ErrorCode.ORDER_NOT_FOUND]);
    }

    return order;
  }

  /**
   * 取消订单
   * 仅 status=PENDING(0) 可取消 → status=CANCELLED(4)
   */
  async cancel(userId: number, orderId: number) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessage[ErrorCode.ORDER_NOT_FOUND]);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        ErrorMessage[ErrorCode.ORDER_CANCEL_NOT_ALLOWED],
      );
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepo.save(order);

    return this.findOne(userId, orderId);
  }
}
```

- [ ] **Step 4: 创建 order.controller.ts**

```typescript
packages/server/src/modules/order/order.controller.ts
```

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * POST /orders
   * 创建订单：从购物车获取商品，快照到 order_items，清空购物车
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.create(user.id, dto);
  }

  /**
   * GET /orders?status=&page=1&limit=10
   * 我的订单列表，可按状态筛选，分页
   */
  @Get()
  async findAll(
    @CurrentUser() user: { id: number },
    @Query() query: QueryOrderDto,
  ) {
    return this.orderService.findAll(user.id, query);
  }

  /**
   * GET /orders/:id
   * 订单详情（含 order_items）
   */
  @Get(':id')
  async findOne(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.findOne(user.id, id);
  }

  /**
   * PUT /orders/:id/cancel
   * 取消订单，仅 status=PENDING(0) 可取消
   */
  @Put(':id/cancel')
  async cancel(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.cancel(user.id, id);
  }
}
```

- [ ] **Step 5: 创建 order.module.ts**

```typescript
packages/server/src/modules/order/order.module.ts
```

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity, OrderItemEntity, CartEntity } from '../../entities';
import { CartModule } from '../cart/cart.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity, CartEntity]),
    CartModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
```

- [ ] **Step 6: 在 app.module.ts 中注册 OrderModule**

在 `app.module.ts` 的 `imports` 数组中添加：

```typescript
import { OrderModule } from './modules/order/order.module';

// imports 数组中添加:
OrderModule,
```

- [ ] **Step 7: 验证编译**

```bash
cd /Users/arwen/Desktop/Arwen/evanfang/agent-harness/demo/fruit-shop
pnpm --filter server exec tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add fruit-shop/packages/server/src/modules/order/ fruit-shop/packages/server/src/app.module.ts
git commit -m "feat(server): Order Module — 订单创建/查询/取消，购物车快照，事务保证原子性"
```

---

## Task 依赖关系

```
Task 11 (TypeORM Entities)
  ├── Task 12 (User Module)   ──── 依赖 Task 11 (需要 UserEntity)
  ├── Task 13 (Product Module) ──── 依赖 Task 11 (需要 ProductEntity + CategoryEntity)
  ├── Task 14 (Cart Module)   ──── 依赖 Task 11 (需要 CartEntity + ProductEntity)
  └── Task 15 (Order Module)  ──── 依赖 Task 11 + Task 14 (需要 OrderEntity + CartService)
```

建议执行顺序: Task 11 → Task 12 → Task 13 → Task 14 → Task 15

---

## Contract DoD 映射

| DoD 条目 | 对应 Task |
|---------|-----------|
| users 表 role 字段 (VARCHAR(10) DEFAULT 'user') | Task 11 (UserEntity role 列定义) |
| 商品列表支持分页（每页 10 条，返回 `{ list, total, page, limit }`） | Task 13 (ProductService.findAll) |
| 商品详情页展示全部字段 | Task 13 (ProductService.findOne) |
| 同一商品不同规格在购物车中是独立条目（联合唯一约束） | Task 11 (CartEntity @Unique) + Task 14 (upsert) |
| 加入已存在的商品+规格则数量 +1 | Task 14 (CartService.add ON DUPLICATE KEY UPDATE) |
| 下单后：购物车清除，order_items 快照，状态为 0（待付款） | Task 15 (OrderService.create 事务) |
| 取消订单仅限 status=0 → status=4，其他状态返回错误 | Task 15 (OrderService.cancel 状态检查) |
| admin 才能访问 POST/PUT/DELETE /api/products，非 admin 返回 403 | Task 13 (@Roles(UserRole.ADMIN)) |
| 所有 API 响应统一 `{ code, data?, message }` 格式 | Part 2 TransformInterceptor + HttpExceptionFilter |
| 库存不做扣减 | 全部 Task（未包含库存扣减逻辑） |
