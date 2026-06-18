import { ProductStatus } from './product';

export interface CartItem {
  id: number;
  userId: number;
  productId: number;
  specLabel: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartDTO {
  productId: number;
  specLabel: string;
  quantity?: number;
}

export interface UpdateCartDTO {
  quantity: number;
}

export interface CartItemWithProduct extends CartItem {
  product: {
    id: number;
    name: string;
    price: number;
    originalPrice: number | null;
    image: string;
    unit: string;
    stock: number;
    status: ProductStatus;
  };
}
