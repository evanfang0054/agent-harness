import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

describe('CartController', () => {
  let controller: CartController;
  let cartService: jest.Mocked<CartService>;

  const mockCartService = {
    findAll: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: mockCartService }],
    }).compile();

    controller = module.get<CartController>(CartController);
    cartService = module.get(CartService) as jest.Mocked<CartService>;
    jest.clearAllMocks();
  });

  describe('GET /cart', () => {
    it('should return cart items for user', async () => {
      const items = [{ id: 1, productId: 1, quantity: 2 }];
      cartService.findAll.mockResolvedValue(items as any);

      expect(await controller.findAll(1)).toEqual(items);
      expect(cartService.findAll).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /cart', () => {
    it('should add item to cart', async () => {
      const dto = { productId: 1, specLabel: '500g', quantity: 1 };
      const items = [{ id: 1, ...dto }];
      cartService.add.mockResolvedValue(items as any);

      expect(await controller.add(1, dto)).toEqual(items);
      expect(cartService.add).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('PUT /cart/:id', () => {
    it('should update cart item quantity', async () => {
      const dto = { quantity: 3 };
      const items = [{ id: 1, quantity: 3 }];
      cartService.update.mockResolvedValue(items as any);

      expect(await controller.update(1, 1, dto)).toEqual(items);
      expect(cartService.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('DELETE /cart/:id', () => {
    it('should remove cart item', async () => {
      const items: any[] = [];
      cartService.remove.mockResolvedValue(items as any);

      expect(await controller.remove(1, 1)).toEqual(items);
      expect(cartService.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
