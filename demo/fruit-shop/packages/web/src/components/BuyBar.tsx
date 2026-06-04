import { useNavigate } from 'react-router-dom';
import type { Product } from 'shared';
import { useCartStore } from '@/store/cart.store';
import { useToast } from './Toast';

interface BuyBarProps {
  product: Product;
}

export function BuyBar({ product }: BuyBarProps) {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const isUpdating = useCartStore((s) => s.isUpdating);
  const { showToast } = useToast();

  const handleAddToCart = async () => {
    try {
      await addItem({ productId: product.id, specLabel: '默认', quantity: 1 });
      showToast('已加入购物车', 'success');
    } catch {
      showToast('添加失败，请重试', 'error');
    }
  };

  const handleBuyNow = async () => {
    try {
      await addItem({ productId: product.id, specLabel: '默认', quantity: 1 });
      navigate('/cart');
    } catch {
      showToast('操作失败，请重试', 'error');
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-40">
      <div className="flex items-center h-14 max-w-lg mx-auto px-4 gap-3">
        <button
          onClick={() => navigate('/cart')}
          className="flex flex-col items-center justify-center text-gray-500 min-w-[48px]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          <span className="text-[10px] mt-0.5">购物车</span>
        </button>

        <button
          onClick={handleAddToCart}
          disabled={isUpdating}
          className="flex-1 py-2.5 rounded-xl bg-accent text-gray-900 font-medium text-sm disabled:opacity-50 transition-opacity"
        >
          加入购物车
        </button>

        <button
          onClick={handleBuyNow}
          disabled={isUpdating}
          className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium text-sm disabled:opacity-50 transition-opacity"
        >
          立即购买
        </button>
      </div>
    </div>
  );
}
