import { apiClient } from './client';
import type {
  ApiResponse,
  CartItem,
  CartItemWithProduct,
  AddToCartDTO,
  UpdateCartDTO,
} from 'shared';

export const cartApi = {
  getList() {
    return apiClient.get<ApiResponse<CartItemWithProduct[]>>('/cart');
  },

  add(data: AddToCartDTO) {
    return apiClient.post<ApiResponse<CartItem>>('/cart', data);
  },

  update(id: number, data: UpdateCartDTO) {
    return apiClient.put<ApiResponse<CartItem>>(`/cart/${id}`, data);
  },

  remove(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/cart/${id}`);
  },

  clear() {
    return apiClient.delete<ApiResponse<null>>('/cart');
  },
};
