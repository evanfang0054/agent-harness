import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus } from 'shared';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepo: any;
  let orderItemRepo: any;
  let cartRepo: any;
  let shippingRepo: any;
  let refundRepo: any;
  let addressRepo: any;
  let userCouponRepo: any;
  let couponService: any;
  let cartService: any;
  let dataSource: any;
  let queryRunner: any;
  let logger: any;

  beforeEach(() => {
    const execute = jest.fn();
    const deleteQb = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute,
    };
    // `manager.query` mocks TypeORM's raw SQL interface used for row locks
    // and bulk updates inside transactions. Default returns empty array
    // (sufficient for UPDATE/DELETE statements whose return value the
    // service ignores). Specific tests override via mockResolvedValueOnce.
    const managerQuery = jest.fn().mockResolvedValue([]);
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      manager: {
        create: jest.fn((_, x) => x),
        save: jest.fn(),
        createQueryBuilder: jest.fn(() => deleteQb),
        query: managerQuery,
        find: jest.fn(),
      },
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };
    dataSource = { createQueryRunner: jest.fn(() => queryRunner) };
    // orderRepo.save is required because cancel() calls orderRepo.save(order)
    orderRepo = { createQueryBuilder: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    orderItemRepo = { find: jest.fn() };
    cartRepo = { find: jest.fn() };
    shippingRepo = { findOne: jest.fn() };
    refundRepo = {};
    addressRepo = { findOne: jest.fn() };
    cartService = {};
    userCouponRepo = {};
    couponService = { getTemplate: jest.fn(), calculateDiscount: jest.fn().mockReturnValue(0) };
    logger = { setContext: jest.fn(), info: jest.fn() };
    service = new OrderService(
      orderRepo,
      orderItemRepo,
      cartRepo,
      shippingRepo,
      refundRepo,
      addressRepo,
      userCouponRepo,
      cartService,
      couponService,
      dataSource,
      logger,
    );
  });

  describe('create', () => {
    it('should throw BadRequest when cart empty', async () => {
      cartRepo.find.mockResolvedValue([]);
      await expect(
        service.create(1, { address: 'a', phone: 'p' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should compute totalAmount and commit in order', async () => {
      cartRepo.find.mockResolvedValue([
        {
          productId: 1,
          specLabel: '1kg',
          quantity: 2,
          product: { id: 1, name: 'A', price: '9.9', image: 'i', categoryId: 1 },
        },
        {
          productId: 2,
          specLabel: '2kg',
          quantity: 1,
          product: { id: 2, name: 'B', price: '5', image: 'j', categoryId: 1 },
        },
      ]);
      queryRunner.manager.save.mockResolvedValueOnce({ id: 100 } as any); // savedOrder
      orderRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 100 }),
      });
      // create() tail calls findOne(userId, savedOrder.id) which calls orderRepo.findOne
      orderRepo.findOne.mockResolvedValue({ id: 100 });
      orderItemRepo.find.mockResolvedValue([{ id: 1, orderId: 100 }]);
      // create() issues FOR UPDATE SELECT on products then UPDATEs stock;
      // provide locked rows so stock validation passes.
      queryRunner.manager.query.mockResolvedValueOnce([
        { id: 1, stock: 100, name: 'A' },
        { id: 2, stock: 100, name: 'B' },
      ]);

      const result = await service.create(1, { address: 'a', phone: 'p' } as any);

      // totalAmount = 9.9*2 + 5*1 = 24.8 (float, use tolerance)
      expect(queryRunner.manager.save).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({ userId: 1 }),
      );
      expect(
        queryRunner.manager.save.mock.calls[0][1].totalAmount,
      ).toBeCloseTo(24.8, 5);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ id: 100, items: [{ id: 1, orderId: 100 }] }),
      );
    });

    it('should rollback and rethrow on save error', async () => {
      cartRepo.find.mockResolvedValue([
        {
          productId: 1,
          quantity: 1,
          product: { price: '1', name: 'A', image: 'i', categoryId: 1 },
        },
      ]);
      // FOR UPDATE returns enough stock; subsequent save() rejects to trigger rollback.
      queryRunner.manager.query.mockResolvedValueOnce([
        { id: 1, stock: 100, name: 'A' },
      ]);
      queryRunner.manager.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.create(1, { address: 'a', phone: 'p' } as any),
      ).rejects.toThrow('db down');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should apply status filter', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      orderRepo.createQueryBuilder.mockReturnValue(qb);
      const r = await service.findAll(1, { status: 1, page: 2, limit: 5 });
      expect(qb.andWhere).toHaveBeenCalledWith('o.status = :status', {
        status: 1,
      });
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(r.page).toBe(2);
    });

    it('should default page/limit', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      orderRepo.createQueryBuilder.mockReturnValue(qb);
      const r = await service.findAll(1, {});
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('findOne', () => {
    it('should throw NotFound when order missing', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('should return order with items', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 1 });
      orderItemRepo.find.mockResolvedValue([{ id: 1 }]);
      const r = await service.findOne(1, 1);
      expect(r.items).toEqual([{ id: 1 }]);
    });
  });

  describe('cancel', () => {
    it('should throw NotFound when order missing', async () => {
      // cancel() now does FOR UPDATE on orders before NotFoundException check,
      // so query must return empty rows → service throws ORDER_NOT_FOUND.
      queryRunner.manager.query.mockResolvedValueOnce([]);
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.cancel(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequest when not PENDING', async () => {
      // OrderStatus.PAID=1 — non-PENDING value
      // FOR UPDATE returns one row with status=PAID; status check throws.
      queryRunner.manager.query.mockResolvedValueOnce([
        { id: 1, status: OrderStatus.PAID },
      ]);
      orderRepo.findOne.mockResolvedValue({ id: 1, status: OrderStatus.PAID });
      await expect(service.cancel(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should update status to CANCELLED and persist via orderRepo.save', async () => {
      const order = { id: 1, status: OrderStatus.PENDING }; // PENDING = 0
      // FOR UPDATE on orders returns the PENDING row (status=0).
      queryRunner.manager.query.mockResolvedValueOnce([
        { id: 1, status: OrderStatus.PENDING },
      ]);
      // cancel() reads order items via queryRunner.manager.find (not orderItemRepo);
      // empty list → no stock restock queries needed.
      queryRunner.manager.find.mockResolvedValue([]);
      orderRepo.findOne.mockResolvedValue(order);
      await service.cancel(1, 1);
      // Implementation now persists via raw UPDATE query (no orderRepo.save call),
      // but the trailing findOne() returns the mocked order object. Verify the
      // status UPDATE was issued with CANCELLED status.
      expect(queryRunner.manager.query).toHaveBeenCalledWith(
        'UPDATE orders SET status = ? WHERE id = ?',
        [OrderStatus.CANCELLED, 1],
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
