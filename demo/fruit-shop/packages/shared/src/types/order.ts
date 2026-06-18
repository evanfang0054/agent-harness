export interface Order {
  id: number;
  orderNo: string;
  userId: number;
  totalAmount: number;
  status: OrderStatus;
  address: string;
  phone: string;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export enum OrderStatus {
  PENDING = 0,
  PAID = 1,
  SHIPPED = 2,
  COMPLETED = 3,
  CANCELLED = 4,
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  specLabel: string;
  price: number;
  quantity: number;
  image: string;
}

export interface CreateOrderDTO {
  address: string;
  phone: string;
  remark?: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}
