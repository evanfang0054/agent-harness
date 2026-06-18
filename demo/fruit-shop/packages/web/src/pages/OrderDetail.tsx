import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '@/store/order.store';
import { OrderStatus } from 'shared';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toast } from '@/components/Toast';

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '待付款',
  [OrderStatus.PAID]: '已付款',
  [OrderStatus.SHIPPED]: '已发货',
  [OrderStatus.COMPLETED]: '已完成',
  [OrderStatus.CANCELLED]: '已取消',
};

const STATUS_BG: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'bg-brand-secondary',
  [OrderStatus.PAID]: 'bg-brand-accent',
  [OrderStatus.SHIPPED]: 'bg-brand-primary',
  [OrderStatus.COMPLETED]: 'bg-brand-green',
  [OrderStatus.CANCELLED]: 'bg-gray-400',
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrder, isLoading, fetchOrderById, cancelOrder, clearCurrentOrder } = useOrderStore();
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrderById(Number(id));
    }
    return () => {
      clearCurrentOrder();
    };
  }, [id, fetchOrderById, clearCurrentOrder]);

  const handleCancel = async () => {
    if (!id || !currentOrder) return;

    setIsCancelling(true);
    try {
      await cancelOrder(Number(id));
      Toast.show('订单已取消', 'success');
    } catch {
      Toast.show('取消订单失败', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-400 text-sm">订单不存在</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-4 text-brand-primary text-sm hover:underline"
        >
          返回订单列表
        </button>
      </div>
    );
  }

  const order = currentOrder;

  return (
    <div className="min-h-screen bg-brand-bg pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">订单详情</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 mt-3 space-y-3">
        {/* Status header */}
        <section className={`${STATUS_BG[order.status]} rounded-2xl p-5 text-white`}>
          <p className="text-2xl font-bold">{STATUS_LABELS[order.status]}</p>
          <p className="text-sm opacity-80 mt-1">订单号: {order.orderNo}</p>
          <p className="text-sm opacity-80">
            {new Date(order.createdAt).toLocaleString('zh-CN')}
          </p>
        </section>

        {/* Shipping info */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-primary">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            收货信息
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-gray-400 w-16 flex-shrink-0">收货地址</span>
              <span className="text-gray-800">{order.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-16 flex-shrink-0">手机号</span>
              <span className="text-gray-800">{order.phone}</span>
            </div>
            {order.remark && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-16 flex-shrink-0">备注</span>
                <span className="text-gray-800">{order.remark}</span>
              </div>
            )}
          </div>
        </section>

        {/* Items list */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">商品清单</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={item.image || '/placeholder-fruit.png'}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 line-clamp-1">{item.productName}</p>
                  {item.specLabel && (
                    <p className="text-xs text-gray-400">{item.specLabel}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-brand-primary">
                    ¥{Number(item.price).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">x{item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between items-center">
            <span className="text-sm text-gray-500">订单总额</span>
            <span className="text-lg font-bold text-brand-primary">
              ¥{Number(order.totalAmount).toFixed(2)}
            </span>
          </div>
        </section>
      </main>

      {/* Cancel button for PENDING orders */}
      {order.status === OrderStatus.PENDING && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-bottom">
          <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
            <button
              onClick={() => navigate('/orders')}
              className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-full hover:bg-brand-bg transition-colors"
            >
              返回列表
            </button>
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="flex-1 py-2.5 text-sm text-white bg-brand-coral rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isCancelling ? '取消中...' : '取消订单'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
