import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  const mockUserService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService) as jest.Mocked<UserService>;
    jest.clearAllMocks();
  });

  describe('GET /user/profile', () => {
    it('should return user profile', async () => {
      const profile = { id: 1, phone: '13800000001', nickname: 'test' };
      userService.getProfile.mockResolvedValue(profile as any);

      expect(await controller.getProfile(1)).toEqual(profile);
      expect(userService.getProfile).toHaveBeenCalledWith(1);
    });
  });

  describe('PUT /user/profile', () => {
    it('should update user profile', async () => {
      const dto = { nickname: 'new-name' };
      const updated = { id: 1, nickname: 'new-name' };
      userService.updateProfile.mockResolvedValue(updated as any);

      expect(await controller.updateProfile(1, dto)).toEqual(updated);
      expect(userService.updateProfile).toHaveBeenCalledWith(1, dto);
    });
  });
});
