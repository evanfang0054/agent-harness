import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

describe('ProductController', () => {
  let controller: ProductController;
  let productService: jest.Mocked<ProductService>;

  const mockProductService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: mockProductService }],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    productService = module.get(ProductService) as jest.Mocked<ProductService>;
    jest.clearAllMocks();
  });

  describe('GET /products', () => {
    it('should return paginated products', async () => {
      const result = { list: [], total: 0, page: 1, limit: 10 };
      productService.findAll.mockResolvedValue(result as any);

      expect(await controller.findAll({ page: 1, limit: 10 })).toEqual(result);
    });
  });

  describe('GET /products/:id', () => {
    it('should return a product by id', async () => {
      const product = { id: 1, name: '苹果' };
      productService.findOne.mockResolvedValue(product as any);

      expect(await controller.findOne(1)).toEqual(product);
      expect(productService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /products', () => {
    it('should create a product (ADMIN)', async () => {
      const dto = {
        name: '苹果',
        origin: '山东',
        price: 9.9,
        unit: '斤',
        sweetness: '甜',
        weight: '500g',
        image: 'http://example.com/apple.jpg',
        color: '#FF0000',
        categoryId: 1,
        stock: 100,
      };
      const created = { id: 1, ...dto };
      productService.create.mockResolvedValue(created as any);

      expect(await controller.create(dto)).toEqual(created);
      expect(productService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('PUT /products/:id', () => {
    it('should update a product (ADMIN)', async () => {
      const dto = { price: 12.9 };
      const updated = { id: 1, name: '苹果', price: 12.9 };
      productService.update.mockResolvedValue(updated as any);

      expect(await controller.update(1, dto)).toEqual(updated);
      expect(productService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should remove a product (ADMIN)', async () => {
      productService.remove.mockResolvedValue(null as any);

      expect(await controller.remove(1)).toBeNull();
      expect(productService.remove).toHaveBeenCalledWith(1);
    });
  });
});
