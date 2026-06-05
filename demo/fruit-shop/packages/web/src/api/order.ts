import { apiClient } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Order,
  OrderWithItems,
  CreateOrderDTO,
  PaginationQuery,
} from 'shared';

export const orderApi = {
  create(data: CreateOrderDTO) {
    return apiClient.post<ApiResponse<Order>>('/orders', data);
  },

  getList(params?: PaginationQuery) {
    return apiClient.get<ApiResponse<PaginatedResponse<Order>>>('/orders', { params });
  },

  getDetail(id: number) {
    return apiClient.get<ApiResponse<OrderWithItems>>(`/orders/${id}`);
  },

  cancel(id: number) {
    return apiClient.put<ApiResponse<Order>>(`/orders/${id}/cancel`);
  },
};
