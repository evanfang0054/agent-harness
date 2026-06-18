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

  async create(userId: number, dto: CreateOrderDto) {
    // Get cart items with product info
    const cartItems = await this.cartRepo.find({
      where: { userId },
      relations: ['product'],
    });

    if (cartItems.length === 0) {
      throw new BadRequestException(ErrorMessage[ErrorCode.CART_EMPTY]);
    }

    // Calculate total and snapshot items
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

    // Generate order number: timestamp + random
    const orderNo = `${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Execute in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create order
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

      // Create order items
      const items = orderItems.map((item) =>
        queryRunner.manager.create(OrderItemEntity, {
          ...item,
          orderId: savedOrder.id,
        }),
      );
      await queryRunner.manager.save(OrderItemEntity, items);

      // Clear cart
      const productIds = cartItems.map((item) => item.productId);
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from(CartEntity)
        .where('user_id = :userId', { userId })
        .andWhere('product_id IN (:...productIds)', { productIds })
        .execute();

      await queryRunner.commitTransaction();

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
    const order = await this.orderRepo.findOne({
      where: { id, userId },
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

    return this.findOne(userId, id);
  }
}
