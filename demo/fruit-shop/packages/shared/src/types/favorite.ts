export interface Favorite {
  id: number;
  userId: number;
  productId: number;
  createdAt: string;
}

export interface FavoriteWithProduct extends Favorite {
  product: {
    id: number;
    name: string;
    price: number;
    image: string;
    status: number;
  } | null;
}
