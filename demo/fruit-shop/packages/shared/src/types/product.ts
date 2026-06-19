export interface Product {
  id: number;
  name: string;
  origin: string;
  price: number;
  originalPrice: number | null;
  unit: string;
  sweetness: string;
  weight: string;
  description: string | null;
  tags: string[] | null;
  image: string;
  color: string;
  categoryId: number;
  stock: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  specs: ProductSpec[] | null;
  isRecommended: boolean;
  featuredSortOrder: number;
}

export interface ProductSpec {
  name: string;
  values: string[];
}

export enum ProductStatus {
  OFF = 0,
  ON = 1,
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  sortOrder: number;
}
