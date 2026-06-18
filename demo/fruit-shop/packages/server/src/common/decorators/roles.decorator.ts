import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'shared';

export const ROLES_KEY = 'roles';

/**
 * 标记接口所需角色
 * @example @Roles(UserRole.ADMIN)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
