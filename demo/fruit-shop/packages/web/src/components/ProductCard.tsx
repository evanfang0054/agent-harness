import { useNavigate } from 'react-router-dom';
import type { Product } from 'shared';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image || '/placeholder-fruit.png'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.origin && (
          <span className="absolute top-2 left-2 bg-primary/90 text-white text-xs px-2 py-0.5 rounded-full">
            {product.origin}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-800 line-clamp-1">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
            {product.description}
          </p>
        )}
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-lg font-bold text-primary">
            ¥{formatPrice(product.price)}
          </span>
          {product.unit && (
            <span className="text-xs text-gray-400">/{product.unit}</span>
          )}
        </div>
      </div>
    </div>
  );
}
