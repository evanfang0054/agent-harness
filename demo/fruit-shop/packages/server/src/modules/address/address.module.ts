import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressEntity } from '../../entities/address.entity';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AddressEntity])],
  controllers: [AddressController],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}
