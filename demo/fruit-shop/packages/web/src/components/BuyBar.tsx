import { useState } from 'react';
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
  const [qty, setQty] = useState(1);

  const handleAddToCart = async () => {
    try {
      await addItem({ productId: product.id, specLabel: '默认', quantity: qty });
      showToast(`已加入购物车 ×${qty}`, 'success');
    } catch {
      showToast('添加失败，请重试', 'error');
    }
  };

  const handleBuyNow = async () => {
    try {
      await addItem({ productId: product.id, specLabel: '默认', quantity: qty });
      navigate('/cart');
    } catch {
      showToast('操作失败，请重试', 'error');
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur-[12px] border-t-[1.5px] border-brand-border z-40">
      {/* 数量 */}
      <div className="flex items-center gap-2">
        <div
          onClick={() => setQty(Math.max(1, qty - 1))}
          className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center bg-brand-btn-bg cursor-pointer text-base font-bold text-brand-dark transition-transform duration-150 active:scale-90"
        >
          −
        </div>
        <span className="text-base font-extrabold min-w-6 text-center font-display">{qty}</span>
        <div
          onClick={() => setQty(qty + 1)}
          className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center bg-brand-btn-bg cursor-pointer text-base font-bold text-brand-dark transition-transform duration-150 active:scale-90"
        >
          +
        </div>
      </div>
      {/* 加购 */}
      <div
        onClick={handleAddToCart}
        className={`flex-1 py-3 rounded-2xl text-center bg-brand-secondary text-brand-dark font-bold text-[15px] cursor-pointer transition-transform duration-150 ${
          isUpdating ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        加入购物车
      </div>
      {/* 立即购买 */}
      <div
        onClick={handleBuyNow}
        className={`animate-pulse-glow flex-1 py-3 rounded-2xl text-center text-white font-bold text-[15px] cursor-pointer transition-transform duration-150 ${
          isUpdating ? 'opacity-50 pointer-events-none' : ''
        }`}
        style={{ background: 'var(--gradient-cta)' }}
      >
        立即购买
      </div>
    </div>
  );
}
