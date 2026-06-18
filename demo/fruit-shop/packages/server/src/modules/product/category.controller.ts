import { Controller, Get } from '@nestjs/common';
import { ProductService } from './product.service';

@Controller('categories')
export class CategoryController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll() {
    return this.productService.findAllCategories();
  }
}
