import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cart.store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toast } from '@/components/Toast';

export default function Cart() {
  const navigate = useNavigate();
  const {
    items,
    isLoading,
    isUpdating,
    fetchCart,
    updateQuantity,
    removeFromCart,
    toggleSelect,
    toggleSelectAll,
    totalPrice,
    selectedItems,
    isSelectedAll,
  } = useCartStore();

  const [loadingItemId, setLoadingItemId] = useState<number | null>(null);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleQuantityChange = async (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setLoadingItemId(id);
    try {
      await updateQuantity(id, { quantity: newQuantity });
    } catch {
      Toast.show('更新数量失败', 'error');
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleRemove = async (id: number) => {
    setLoadingItemId(id);
    try {
      await removeFromCart(id);
      Toast.show('已移除', 'success');
    } catch {
      Toast.show('移除失败', 'error');
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleCheckout = () => {
    const selected = selectedItems();
    if (selected.length === 0) {
      Toast.show('请选择要结算的商品', 'warning');
      return;
    }
    navigate('/checkout');
  };

  const selectedCount = selectedItems().reduce((sum, item) => sum + item.quantity, 0);
  const total = totalPrice();

  // Loading state
  if (isLoading && items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-bg pb-20">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3">
            <h1 className="text-lg font-semibold text-gray-900 text-center">购物车</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-32">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-300">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          <p className="text-gray-400 mt-4 text-sm">购物车空空如也</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-brand-primary text-white text-sm rounded-full hover:opacity-90 transition-opacity"
          >
            去逛逛
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg pb-36">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">购物车</h1>
          <span className="text-sm text-gray-500">{items.length}件商品</span>
        </div>
      </header>

      {/* Cart items */}
      <main className="max-w-lg mx-auto px-4 mt-3 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 flex gap-3 shadow-sm"
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleSelect(item.id)}
              className={`w-5 h-5 mt-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                item.selected
                  ? 'bg-brand-primary border-brand-primary'
                  : 'border-gray-300'
              }`}
            >
              {item.selected && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            {/* Product image */}
            <div
              className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer"
              onClick={() => navigate(`/product/${item.productId}`)}
            >
              <img
                src={item.product.image || '/placeholder-fruit.png'}
                alt={item.product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Product info */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h3
                  className="text-sm font-medium text-gray-800 line-clamp-1 cursor-pointer"
                  onClick={() => navigate(`/product/${item.productId}`)}
                >
                  {item.product.name}
                </h3>
                {item.specLabel && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.specLabel}</p>
                )}
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-brand-primary font-semibold text-sm">
                  ¥{Number(item.product.price).toFixed(2)}
                  {item.product.unit && (
                    <span className="text-xs text-gray-400 font-normal">
                      /{item.product.unit}
                    </span>
                  )}
                </span>

                {/* Quantity controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1 || loadingItemId === item.id}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium w-6 text-center">
                    {loadingItemId === item.id ? '...' : item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    disabled={loadingItemId === item.id}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-brand-primary text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={() => handleRemove(item.id)}
              disabled={loadingItemId === item.id}
              className="self-start mt-1 p-1 text-gray-300 hover:text-brand-coral transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </main>

      {/* Bottom checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-bottom">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2"
          >
            <span
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelectedAll()
                  ? 'bg-brand-primary border-brand-primary'
                  : 'border-gray-300'
              }`}
            >
              {isSelectedAll() && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span className="text-sm text-gray-600">全选</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-sm text-gray-500">合计：</span>
              <span className="text-lg font-bold text-brand-primary">
                ¥{Number(total).toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={selectedCount === 0 || isUpdating}
              className="px-6 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-full hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              结算({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
