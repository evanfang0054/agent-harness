import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ReviewEntity,
  OrderEntity,
  OrderItemEntity,
  UserEntity,
  ProductEntity,
} from '../../entities';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReviewEntity,
      OrderEntity,
      OrderItemEntity,
      UserEntity,
      ProductEntity,
    ]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
