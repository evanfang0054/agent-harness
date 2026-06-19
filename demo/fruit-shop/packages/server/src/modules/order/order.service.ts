import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity, OrderItemEntity, CartEntity } from '../../entities';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrderStatus, ErrorCode, ErrorMessage } from 'shared';
import { PinoLogger } from 'nestjs-pino';

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
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OrderService.name);
  }

  async create(userId: number, dto: CreateOrderDto) {
    // Get cart items with product info
    const cartItems = await this.cartRepo.find({
      where: { userId },
      relations: ['product'],
    });

    if (cartItems.length === 0) {
      throw new BadRequestException(ErrorMessage[ErrorCode.CART_EMPTY]);
    }

    // Execute in transaction (row-lock products, validate stock, deduct)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 行锁 + 读取最新库存
      const productIds = cartItems.map((item) => item.productId);
      const lockedProducts: { id: number; stock: number; name: string }[] =
        await queryRunner.manager.query(
          'SELECT id, stock, name FROM products WHERE id IN (?) FOR UPDATE',
          [productIds],
        );
      const stockMap = new Map(lockedProducts.map((p) => [p.id, p]));

      // 2. 库存校验
      for (const item of cartItems) {
        if (!item.product) continue;
        const latest = stockMap.get(item.productId);
        if (!latest || latest.stock < item.quantity) {
          throw new BadRequestException({
            code: ErrorCode.STOCK_INSUFFICIENT,
            message: ErrorMessage[ErrorCode.STOCK_INSUFFICIENT],
          });
        }
      }

      // 3. 计算总额 + 快照
      let totalAmount = 0;
      const orderItems: Partial<OrderItemEntity>[] = [];
      for (const item of cartItems) {
        if (!item.product) continue;
        const price = Number(item.product.price);
        totalAmount += price * item.quantity;
        orderItems.push({
          productId: item.productId,
          productName: item.product.name,
          specLabel: item.specLabel,
          price,
          quantity: item.quantity,
          image: item.product.image,
        });
      }

      // 4. 扣减库存（批量 UPDATE）
      for (const item of cartItems) {
        if (!item.product) continue;
        await queryRunner.manager.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.productId],
        );
      }

      // 5. 创建订单
      const orderNo = `${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const order = queryRunner.manager.create(OrderEntity, {
        orderNo,
        userId,
        totalAmount,
        status: OrderStatus.PENDING,
        address: dto.address,
        phone: dto.phone,
        remark: dto.remark,
      });
      const savedOrder = await queryRunner.manager.save(OrderEntity, order);

      // 6. 创建订单项
      const items = orderItems.map((item) =>
        queryRunner.manager.create(OrderItemEntity, {
          ...item,
          orderId: savedOrder.id,
        }),
      );
      await queryRunner.manager.save(OrderItemEntity, items);

      // 7. 清空购物车
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from(CartEntity)
        .where('user_id = :userId', { userId })
        .andWhere('product_id IN (:...productIds)', { productIds })
        .execute();

      await queryRunner.commitTransaction();

      this.logger.info(
        {
          orderId: savedOrder.id,
          orderNo,
          userId,
          totalAmount,
          itemCount: orderItems.length,
        },
        '订单创建成功',
      );

      return this.findOne(userId, savedOrder.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(userId: number, query: QueryOrderDto) {
    const { status, page = 1, limit = 10 } = query;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.user_id = :userId', { userId });

    if (status !== undefined) {
      qb.andWhere('o.status = :status', { status });
    }

    const total = await qb.getCount();
    const list = await qb
      .orderBy('o.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { list, total, page, limit };
  }

  async findOne(userId: number, id: number) {
    const order = await this.orderRepo.findOne({
      where: { id, userId },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessage[ErrorCode.ORDER_NOT_FOUND]);
    }

    const items = await this.orderItemRepo.find({
      where: { orderId: id },
    });

    return { ...order, items };
  }

  async cancel(userId: number, id: number) {
    // 整个流程在事务内完成：先 FOR UPDATE 锁定订单行（同时完成归属校验），
    // 再做状态校验，最后锁 products + 回补库存 + 改状态。
    // 这避免了 TOCTOU：并发 cancel 同一 PENDING 订单时，第二个会因行锁阻塞，
    // 等第一个 commit（状态已变 CANCELLED）后再读到新状态，校验失败抛错。
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 行锁 + 归属校验（一并完成）
      const rows: { id: number; status: number }[] =
        await queryRunner.manager.query(
          'SELECT id, status FROM orders WHERE id = ? AND user_id = ? FOR UPDATE',
          [id, userId],
        );
      if (rows.length === 0) {
        throw new NotFoundException(ErrorMessage[ErrorCode.ORDER_NOT_FOUND]);
      }
      // 2. 状态校验（rows[0].status 从 mysql 返回为 smallint → number）
      if (rows[0].status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          ErrorMessage[ErrorCode.ORDER_CANCEL_NOT_ALLOWED],
        );
      }

      // 3. 锁订单项对应商品 + 回补库存
      const items = await queryRunner.manager.find(OrderItemEntity, {
        where: { orderId: id },
      });
      const productIds = items.map((i) => i.productId);
      if (productIds.length > 0) {
        await queryRunner.manager.query(
          'SELECT id FROM products WHERE id IN (?) FOR UPDATE',
          [productIds],
        );
        for (const item of items) {
          await queryRunner.manager.query(
            'UPDATE products SET stock = stock + ? WHERE id = ?',
            [item.quantity, item.productId],
          );
        }
      }

      // 4. 改订单状态
      await queryRunner.manager.query(
        'UPDATE orders SET status = ? WHERE id = ?',
        [OrderStatus.CANCELLED, id],
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return this.findOne(userId, id);
  }
}
