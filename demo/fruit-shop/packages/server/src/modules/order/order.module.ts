import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity, OrderItemEntity, CartEntity, ShippingEntity, RefundEntity, AddressEntity } from '../../entities';
import { CartModule } from '../cart/cart.module';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';

@Module({
  imports: [
    CartModule,
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      CartEntity,
      ShippingEntity,
      RefundEntity,
      AddressEntity,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
