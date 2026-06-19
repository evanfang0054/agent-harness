import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepo: any;
  let orderItemRepo: any;
  let cartRepo: any;
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
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      manager: {
        create: jest.fn((_, x) => x),
        save: jest.fn(),
        createQueryBuilder: jest.fn(() => deleteQb),
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
    cartService = {};
    logger = { setContext: jest.fn(), info: jest.fn() };
    service = new OrderService(
      orderRepo,
      orderItemRepo,
      cartRepo,
      cartService,
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
          product: { id: 1, name: 'A', price: '9.9', image: 'i' },
        },
        {
          productId: 2,
          specLabel: '2kg',
          quantity: 1,
          product: { id: 2, name: 'B', price: '5', image: 'j' },
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

      const result = await service.create(1, { address: 'a', phone: 'p' } as any);

      // totalAmount = 9.9*2 + 5*1 = 24.8
      expect(queryRunner.manager.save).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({ totalAmount: 24.8 }),
      );
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
          product: { price: '1', name: 'A', image: 'i' },
        },
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
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.cancel(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequest when not PENDING', async () => {
      // OrderStatus.PENDING=0, PAID=1 — use a non-PENDING value
      orderRepo.findOne.mockResolvedValue({ id: 1, status: 1 });
      await expect(service.cancel(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should update status to CANCELLED and persist via orderRepo.save', async () => {
      const order = { id: 1, status: 0 }; // PENDING = 0
      orderRepo.findOne.mockResolvedValue(order);
      orderItemRepo.find.mockResolvedValue([]);
      await service.cancel(1, 1);
      expect(order.status).toBe(4); // CANCELLED = 4
      // Implementation calls orderRepo.save(order) — verify the persistence occurred
      expect(orderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, status: 4 }),
      );
    });
  });
});
