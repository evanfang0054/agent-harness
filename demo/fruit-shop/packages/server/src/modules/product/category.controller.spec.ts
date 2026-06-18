import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { ProductService } from './product.service';

describe('CategoryController', () => {
  let controller: CategoryController;

  const mockProductService = {
    findAllCategories: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: ProductService, useValue: mockProductService }],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    jest.clearAllMocks();
  });

  describe('GET /categories', () => {
    it('should return all categories', async () => {
      const categories = [
        { id: 1, name: '热带水果', icon: '🥭', sortOrder: 1 },
        { id: 2, name: '苹果', icon: '🍎', sortOrder: 2 },
      ];
      mockProductService.findAllCategories.mockResolvedValue(categories as any);

      expect(await controller.findAll()).toEqual(categories);
    });
  });
});
