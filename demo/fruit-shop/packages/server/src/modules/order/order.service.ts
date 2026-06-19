import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  OrderEntity,
  OrderItemEntity,
  CartEntity,
  ShippingEntity,
  RefundEntity,
  AddressEntity,
  UserCouponEntity,
} from '../../entities';
import { CartService } from '../cart/cart.service';
import { CouponService } from '../coupon/coupon.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { ShipDto } from './dto/ship.dto';
import { RefundRequestDto } from './dto/refund-request.dto';
import { RefundReviewDto } from './dto/refund-review.dto';
import { OrderStatus, ErrorCode, ErrorMessage, RefundStatus } from 'shared';
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
    @InjectRepository(ShippingEntity)
    private readonly shippingRepo: Repository<ShippingEntity>,
    @InjectRepository(RefundEntity)
    private readonly refundRepo: Repository<RefundEntity>,
    @InjectRepository(AddressEntity)
    private readonly addressRepo: Repository<AddressEntity>,
    @InjectRepository(UserCouponEntity)
    private readonly userCouponRepo: Repository<UserCouponEntity>,
    private readonly cartService: CartService,
    private readonly couponService: CouponService,
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
      throw new BadRequestException({
        code: ErrorCode.CART_EMPTY,
        message: ErrorMessage[ErrorCode.CART_EMPTY],
      });
    }

    // 若传入 addressId，从地址薄读取最新快照覆盖 dto.address / dto.phone
    let orderAddress = dto.address;
    let orderPhone = dto.phone;
    if (dto.addressId) {
      const address = await this.addressRepo.findOne({
        where: { id: dto.addressId, userId },
      });
      if (!address) {
        throw new BadRequestException({
          code: ErrorCode.ADDRESS_NOT_FOUND,
          message: ErrorMessage[ErrorCode.ADDRESS_NOT_FOUND],
        });
      }
      orderAddress = `${address.province}${address.city}${address.district}${address.detail}`;
      orderPhone = address.phone;
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
      const item_product_category = new Map<number, number>();
      for (const item of cartItems) {
        if (!item.product) continue;
        const price = Number(item.product.price);
        totalAmount += price * item.quantity;
        item_product_category.set(item.productId, item.product.categoryId);
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

      // 4.5 优惠券核销（若传入 couponId）
      let discountAmount = 0;
      let userCouponDbId: number | null = null;
      let couponTemplateId: number | null = null;
      if (dto.couponId) {
        // 行锁 user_coupons
        const ucRows: {
          id: number;
          user_id: number;
          coupon_id: number;
          used_at: Date | null;
        }[] = await queryRunner.manager.query(
          'SELECT id, user_id, coupon_id, used_at FROM user_coupons WHERE id = ? FOR UPDATE',
          [dto.couponId],
        );
        if (ucRows.length === 0) {
          throw new BadRequestException({
            code: ErrorCode.COUPON_NOT_FOUND,
            message: ErrorMessage[ErrorCode.COUPON_NOT_FOUND],
          });
        }
        const uc = ucRows[0];
        if (uc.user_id !== userId) {
          throw new BadRequestException({
            code: ErrorCode.COUPON_NOT_APPLICABLE,
            message: ErrorMessage[ErrorCode.COUPON_NOT_APPLICABLE],
          });
        }
        if (uc.used_at !== null && uc.used_at !== undefined) {
          throw new BadRequestException({
            code: ErrorCode.COUPON_USED,
            message: ErrorMessage[ErrorCode.COUPON_USED],
          });
        }
        // 计算 discount（复用 CouponService.calculateDiscount）
        const template = await this.couponService.getTemplate(uc.coupon_id);
        discountAmount = this.couponService.calculateDiscount(template, orderItems.map((i) => ({
          productId: i.productId!,
          quantity: i.quantity!,
          price: Number(i.price),
          categoryId: item_product_category.get(i.productId!)!,
        })));
        if (totalAmount - discountAmount < 0) {
          throw new BadRequestException({
            code: ErrorCode.COUPON_NOT_APPLICABLE,
            message: ErrorMessage[ErrorCode.COUPON_NOT_APPLICABLE],
          });
        }
        userCouponDbId = uc.id;
        couponTemplateId = uc.coupon_id;
      }

      const finalTotalAmount = Math.round((totalAmount - discountAmount) * 100) / 100;

      // 5. 创建订单
      const orderNo = `${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const order = queryRunner.manager.create(OrderEntity, {
        orderNo,
        userId,
        totalAmount: finalTotalAmount,
        status: OrderStatus.PENDING,
        address: orderAddress,
        phone: orderPhone,
        remark: dto.remark,
        couponId: couponTemplateId,
        discountAmount,
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

      // 7. 核销优惠券
      if (userCouponDbId) {
        await queryRunner.manager.query(
          'UPDATE user_coupons SET order_id = ?, used_at = NOW() WHERE id = ?',
          [savedOrder.id, userCouponDbId],
        );
      }

      // 8. 清空购物车
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
          totalAmount: finalTotalAmount,
          itemCount: orderItems.length,
          couponId: couponTemplateId,
          discountAmount,
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
      throw new NotFoundException({
        code: ErrorCode.ORDER_NOT_FOUND,
        message: ErrorMessage[ErrorCode.ORDER_NOT_FOUND],
      });
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
        throw new NotFoundException({
        code: ErrorCode.ORDER_NOT_FOUND,
        message: ErrorMessage[ErrorCode.ORDER_NOT_FOUND],
      });
      }
      // 2. 状态校验（rows[0].status 从 mysql 返回为 smallint → number）
      if (rows[0].status !== OrderStatus.PENDING) {
        throw new BadRequestException({
          code: ErrorCode.ORDER_CANCEL_NOT_ALLOWED,
          message: ErrorMessage[ErrorCode.ORDER_CANCEL_NOT_ALLOWED],
        });
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

      // 4.5 解绑优惠券（若有）
      const couponRows: { coupon_id: number | null }[] =
        await queryRunner.manager.query(
          'SELECT coupon_id FROM orders WHERE id = ?',
          [id],
        );
      const cid = couponRows[0]?.coupon_id;
      if (cid) {
        await queryRunner.manager.query(
          'UPDATE user_coupons SET order_id = NULL, used_at = NULL WHERE coupon_id = ? AND order_id = ?',
          [cid, id],
        );
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return this.findOne(userId, id);
  }

  async pay(userId: number, id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const rows: { id: number; status: number }[] =
        await queryRunner.manager.query(
          'SELECT id, status FROM orders WHERE id = ? AND user_id = ? FOR UPDATE',
          [id, userId],
        );
      if (rows.length === 0) {
        throw new NotFoundException({
        code: ErrorCode.ORDER_NOT_FOUND,
        message: ErrorMessage[ErrorCode.ORDER_NOT_FOUND],
      });
      }
      if (rows[0].status !== OrderStatus.PENDING) {
        throw new BadRequestException({
          code: ErrorCode.ORDER_STATUS_ERROR,
          message: ErrorMessage[ErrorCode.ORDER_STATUS_ERROR],
        });
      }
      await queryRunner.manager.query(
        'UPDATE orders SET status = ?, paid_at = NOW() WHERE id = ?',
        [OrderStatus.PAID, id],
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

  async ship(id: number, dto: ShipDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const rows: { id: number; status: number }[] =
        await queryRunner.manager.query(
          'SELECT id, status FROM orders WHERE id = ? FOR UPDATE',
          [id],
        );
      if (rows.length === 0) {
        throw new NotFoundException({
        code: ErrorCode.ORDER_NOT_FOUND,
        message: ErrorMessage[ErrorCode.ORDER_NOT_FOUND],
      });
      }
      if (rows[0].status !== OrderStatus.PAID) {
        throw new BadRequestException({
          code: ErrorCode.ORDER_STATUS_ERROR,
          message: ErrorMessage[ErrorCode.ORDER_STATUS_ERROR],
        });
      }
      const shipping = queryRunner.manager.create(ShippingEntity, {
        orderId: id,
        company: dto.company,
        trackingNo: dto.trackingNo,
        shippedAt: new Date(),
        status: 0,
      });
      await queryRunner.manager.save(ShippingEntity, shipping);
      await queryRunner.manager.query(
        'UPDATE orders SET status = ?, shipped_at = NOW() WHERE id = ?',
        [OrderStatus.SHIPPED, id],
      );
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
    return this.findOneInternal(id);
  }

  async confirm(userId: number, id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const rows: { id: number; status: number }[] =
        await queryRunner.manager.query(
          'SELECT id, status FROM orders WHERE id = ? AND user_id = ? FOR UPDATE',
          [id, userId],
        );
      if (rows.length === 0) {
        throw new NotFoundException({
        code: ErrorCode.ORDER_NOT_FOUND,
        message: ErrorMessage[ErrorCode.ORDER_NOT_FOUND],
      });
      }
      if (rows[0].status !== OrderStatus.SHIPPED) {
        throw new BadRequestException({
          code: ErrorCode.ORDER_STATUS_ERROR,
          message: ErrorMessage[ErrorCode.ORDER_STATUS_ERROR],
        });
      }
      await queryRunner.manager.query(
        'UPDATE orders SET status = ? WHERE id = ?',
        [OrderStatus.COMPLETED, id],
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

  async requestRefund(userId: number, id: number, dto: RefundRequestDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const rows: { id: number; status: number }[] =
        await queryRunner.manager.query(
          'SELECT id, status FROM orders WHERE id = ? AND user_id = ? FOR UPDATE',
          [id, userId],
        );
      if (rows.length === 0) {
        throw new NotFoundException({
        code: ErrorCode.ORDER_NOT_FOUND,
        message: ErrorMessage[ErrorCode.ORDER_NOT_FOUND],
      });
      }
      const currentStatus = rows[0].status;
      if (
        currentStatus !== OrderStatus.PAID &&
        currentStatus !== OrderStatus.SHIPPED
      ) {
        throw new BadRequestException({
          code: ErrorCode.REFUND_NOT_ALLOWED,
          message: ErrorMessage[ErrorCode.REFUND_NOT_ALLOWED],
        });
      }
      const refund = queryRunner.manager.create(RefundEntity, {
        orderId: id,
        userId,
        reason: dto.reason,
        prevStatus: currentStatus,
        status: RefundStatus.PENDING,
      });
      await queryRunner.manager.save(RefundEntity, refund);
      await queryRunner.manager.query(
        'UPDATE orders SET status = ? WHERE id = ?',
        [OrderStatus.REFUNDING, id],
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

  async findShipping(id: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.ORDER_NOT_FOUND,
        message: ErrorMessage[ErrorCode.ORDER_NOT_FOUND],
      });
    }
    const shipping = await this.shippingRepo.findOne({
      where: { orderId: id },
    });
    return shipping;
  }

  // 内部使用：不校验 userId（Admin 路径）
  private async findOneInternal(id: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.ORDER_NOT_FOUND,
        message: ErrorMessage[ErrorCode.ORDER_NOT_FOUND],
      });
    }
    const items = await this.orderItemRepo.find({ where: { orderId: id } });
    return { ...order, items };
  }
}
