import { apiClient } from './client';
import type { ApiResponse, User } from 'shared';

export const userApi = {
  getProfile() {
    return apiClient.get<ApiResponse<User>>('/users/profile');
  },

  updateProfile(data: Partial<Pick<User, 'nickname' | 'avatar'>>) {
    return apiClient.patch<ApiResponse<User>>('/users/profile', data);
  },
};
