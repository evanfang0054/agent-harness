import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: jest.Mocked<OrderService>;

  const mockOrderService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    cancel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: mockOrderService }],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get(OrderService) as jest.Mocked<OrderService>;
    jest.clearAllMocks();
  });

  describe('POST /orders', () => {
    it('should create an order', async () => {
      const dto = { address: '北京市朝阳区', phone: '13800000001' };
      const order = { id: 1, orderNo: '20260618001', status: 0 };
      orderService.create.mockResolvedValue(order as any);

      expect(await controller.create(1, dto)).toEqual(order);
      expect(orderService.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('GET /orders', () => {
    it('should return paginated orders', async () => {
      const result = { list: [], total: 0, page: 1, limit: 10 };
      orderService.findAll.mockResolvedValue(result as any);

      expect(await controller.findAll(1, { page: 1, limit: 10 })).toEqual(result);
    });
  });

  describe('GET /orders/:id', () => {
    it('should return order details', async () => {
      const order = { id: 7, orderNo: '20260618007', items: [] };
      orderService.findOne.mockResolvedValue(order as any);

      expect(await controller.findOne(1, 7)).toEqual(order);
      expect(orderService.findOne).toHaveBeenCalledWith(1, 7);
    });
  });

  describe('PUT /orders/:id/cancel', () => {
    it('should cancel an order', async () => {
      const order = { id: 7, status: 3 };
      orderService.cancel.mockResolvedValue(order as any);

      expect(await controller.cancel(1, 7)).toEqual(order);
      expect(orderService.cancel).toHaveBeenCalledWith(1, 7);
    });
  });
});
