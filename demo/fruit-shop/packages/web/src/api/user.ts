import { apiClient } from './client';
import type { ApiResponse, User } from 'shared';

export const userApi = {
  getProfile() {
    return apiClient.get<ApiResponse<User>>('/user/profile');
  },

  updateProfile(data: Partial<Pick<User, 'nickname' | 'avatar'>>) {
    return apiClient.put<ApiResponse<User>>('/user/profile', data);
  },
};
