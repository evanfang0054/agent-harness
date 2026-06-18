import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ErrorCode, ErrorMessage } from 'shared';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(ErrorMessage[ErrorCode.USER_NOT_FOUND]);
    }
    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(ErrorMessage[ErrorCode.USER_NOT_FOUND]);
    }

    Object.assign(user, dto);
    await this.userRepo.save(user);
    return user;
  }
}
