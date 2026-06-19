export enum RefundStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
}

export interface Refund {
  id: number;
  orderId: number;
  userId: number;
  reason: string;
  prevStatus: number;
  status: RefundStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRefundDTO {
  reason: string;
}

export interface ReviewRefundDTO {
  adminNote?: string;
}
