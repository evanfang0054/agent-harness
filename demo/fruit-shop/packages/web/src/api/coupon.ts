import { apiClient } from './client';
import type {
  ApiResponse,
  CouponTemplate,
  UserCoupon,
  CreateCouponTemplateDTO,
  UpdateCouponTemplateDTO,
  CouponPreviewRequest,
  CouponPreviewResponse,
} from 'shared';

export interface AvailableCoupon extends CouponTemplate {
  claimed: boolean;
}

export interface MineCouponsResponse {
  list: Array<UserCoupon & { coupon: CouponTemplate | null }>;
  total: number;
  page: number;
  limit: number;
}

export const couponApi = {
  // ===== 用户端 =====
  getAvailable() {
    return apiClient.get<ApiResponse<AvailableCoupon[]>>('/coupons/available');
  },

  getMine(page = 1, limit = 10) {
    return apiClient.get<ApiResponse<MineCouponsResponse>>('/coupons/mine', {
      params: { page, limit },
    });
  },

  claim(couponId: number) {
    return apiClient.post<ApiResponse<UserCoupon>>(`/coupons/${couponId}/claim`);
  },

  preview(data: CouponPreviewRequest) {
    return apiClient.post<ApiResponse<CouponPreviewResponse>>('/coupons/preview', data);
  },

  // ===== Admin CRUD =====
  findAllTemplates() {
    return apiClient.get<ApiResponse<CouponTemplate[]>>('/admin/coupons');
  },

  createTemplate(data: CreateCouponTemplateDTO) {
    return apiClient.post<ApiResponse<CouponTemplate>>('/admin/coupons', data);
  },

  updateTemplate(id: number, data: UpdateCouponTemplateDTO) {
    return apiClient.put<ApiResponse<CouponTemplate>>(`/admin/coupons/${id}`, data);
  },

  removeTemplate(id: number) {
    return apiClient.delete<ApiResponse<{ id: number }>>(`/admin/coupons/${id}`);
  },
};
