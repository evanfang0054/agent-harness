import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderStore } from '@/store/order.store';
import { OrderStatus } from 'shared';
import type { CreateReviewItemDTO } from 'shared';
import { orderApi } from '@/api/order';
import { reviewApi } from '@/api/review';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toast } from '@/components/Toast';

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '待付款',
  [OrderStatus.PAID]: '已付款',
  [OrderStatus.SHIPPED]: '已发货',
  [OrderStatus.COMPLETED]: '已完成',
  [OrderStatus.CANCELLED]: '已取消',
  [OrderStatus.REFUNDING]: '退款审核中',
  [OrderStatus.REFUNDED]: '已退款',
};

const STATUS_BG: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'bg-brand-secondary',
  [OrderStatus.PAID]: 'bg-brand-accent',
  [OrderStatus.SHIPPED]: 'bg-brand-primary',
  [OrderStatus.COMPLETED]: 'bg-brand-green',
  [OrderStatus.CANCELLED]: 'bg-gray-400',
  [OrderStatus.REFUNDING]: 'bg-brand-coral',
  [OrderStatus.REFUNDED]: 'bg-gray-400',
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrder, isLoading, fetchOrderById, cancelOrder, clearCurrentOrder } = useOrderStore();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<number, { rating: number; content: string }>
  >({});
  const [isReviewing, setIsReviewing] = useState(false);

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

  const handlePay = async () => {
    if (!id) return;
    setIsPaying(true);
    try {
      await orderApi.pay(Number(id));
      Toast.show('支付成功', 'success');
      await fetchOrderById(Number(id));
    } catch {
      Toast.show('支付失败', 'error');
    } finally {
      setIsPaying(false);
    }
  };

  const handleConfirm = async () => {
    if (!id) return;
    setIsConfirming(true);
    try {
      await orderApi.confirm(Number(id));
      Toast.show('确认收货成功', 'success');
      await fetchOrderById(Number(id));
    } catch {
      Toast.show('确认收货失败', 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  const openRefundModal = () => {
    setRefundReason('');
    setShowRefundModal(true);
  };

  const handleRequestRefund = async () => {
    if (!id) return;
    const reason = refundReason.trim();
    if (!reason) {
      Toast.show('请填写退款原因', 'error');
      return;
    }
    setIsRefunding(true);
    try {
      await orderApi.requestRefund(Number(id), reason);
      Toast.show('退款申请已提交', 'success');
      setShowRefundModal(false);
      await fetchOrderById(Number(id));
    } catch {
      Toast.show('申请退款失败', 'error');
    } finally {
      setIsRefunding(false);
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

  const showPayBtn = order.status === OrderStatus.PENDING;
  const showConfirmBtn = order.status === OrderStatus.SHIPPED;
  const showRefundBtn =
    order.status === OrderStatus.PAID || order.status === OrderStatus.SHIPPED;
  const showReviewBtn = order.status === OrderStatus.COMPLETED;

  const hasActionButtons =
    showPayBtn || showConfirmBtn || showRefundBtn || showReviewBtn;

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

      {/* Bottom action bar */}
      {hasActionButtons && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-bottom">
          <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
            <button
              onClick={() => navigate('/orders')}
              className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-full hover:bg-brand-bg transition-colors"
            >
              返回列表
            </button>
            {showPayBtn && (
              <button
                onClick={handlePay}
                disabled={isPaying || isCancelling}
                className="flex-1 py-2.5 text-sm text-white bg-brand-primary rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isPaying ? '支付中...' : '去支付'}
              </button>
            )}
            {showPayBtn && (
              <button
                onClick={handleCancel}
                disabled={isCancelling || isPaying}
                className="flex-1 py-2.5 text-sm text-white bg-brand-coral rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isCancelling ? '取消中...' : '取消订单'}
              </button>
            )}
            {showConfirmBtn && (
              <button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="flex-1 py-2.5 text-sm text-white bg-brand-primary rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isConfirming ? '处理中...' : '确认收货'}
              </button>
            )}
            {showRefundBtn && (
              <button
                onClick={openRefundModal}
                disabled={isConfirming}
                className="flex-1 py-2.5 text-sm text-brand-coral border border-brand-coral rounded-full hover:bg-brand-coral/5 disabled:opacity-50 transition-colors"
              >
                申请退款
              </button>
            )}
            {showReviewBtn && (
              <button
                onClick={() => {
                  const drafts: Record<number, { rating: number; content: string }> = {};
                  order.items.forEach((it) => {
                    drafts[it.productId] = { rating: 5, content: '' };
                  });
                  setReviewDrafts(drafts);
                  setShowReviewModal(true);
                }}
                className="flex-1 py-2.5 text-sm text-white bg-brand-primary rounded-full hover:opacity-90 transition-opacity"
              >
                去评价
              </button>
            )}
          </div>
        </div>
      )}

      {/* Refund modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-3">申请退款</h3>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="请填写退款原因"
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-primary resize-none"
              maxLength={200}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRefundModal(false)}
                disabled={isRefunding}
                className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-full hover:bg-brand-bg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRequestRefund}
                disabled={isRefunding}
                className="flex-1 py-2.5 text-sm text-white bg-brand-coral rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isRefunding ? '提交中...' : '提交申请'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {showReviewModal && currentOrder && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-brand-dark">评价订单</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-brand-dark"
              >
                &times;
              </button>
            </div>
            <div className="space-y-4">
              {currentOrder.items.map((item) => {
                const draft = reviewDrafts[item.productId] ?? {
                  rating: 5,
                  content: '',
                };
                return (
                  <div
                    key={item.id}
                    className="border border-brand-border rounded-2xl p-3"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={item.image || '/placeholder-fruit.png'}
                        alt={item.productName}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <p className="text-[13px] font-bold text-brand-dark line-clamp-1">
                        {item.productName}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setReviewDrafts({
                              ...reviewDrafts,
                              [item.productId]: { ...draft, rating: n },
                            })
                          }
                          className="p-0.5"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill={n <= draft.rating ? '#FF6B35' : 'none'}
                            stroke={n <= draft.rating ? '#FF6B35' : '#636E72'}
                            strokeWidth="2"
                          >
                            <polygon points="12,2 15,9 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 9,9" />
                          </svg>
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={draft.content}
                      onChange={(e) =>
                        setReviewDrafts({
                          ...reviewDrafts,
                          [item.productId]: {
                            ...draft,
                            content: e.target.value,
                          },
                        })
                      }
                      placeholder="说说你对这件商品的感受"
                      rows={2}
                      maxLength={300}
                      className="mt-2 w-full text-[13px] border border-brand-border rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary resize-none"
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowReviewModal(false)}
                disabled={isReviewing}
                className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-full hover:bg-brand-bg transition-colors"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  const reviews: CreateReviewItemDTO[] = currentOrder.items.map(
                    (item) => {
                      const draft =
                        reviewDrafts[item.productId] ?? {
                          rating: 5,
                          content: '',
                        };
                      return {
                        productId: item.productId,
                        rating: draft.rating,
                        content: draft.content.trim(),
                      };
                    },
                  );
                  // 至少要填一条内容
                  if (reviews.every((r) => !r.content)) {
                    Toast.show('请至少填写一条评价内容', 'warning');
                    return;
                  }
                  setIsReviewing(true);
                  try {
                    await reviewApi.createFromOrder(currentOrder.id, { reviews });
                    Toast.show('评价已提交', 'success');
                    setShowReviewModal(false);
                  } catch {
                    Toast.show('提交评价失败', 'error');
                  } finally {
                    setIsReviewing(false);
                  }
                }}
                disabled={isReviewing}
                className="flex-1 py-2.5 text-sm text-white bg-brand-primary rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isReviewing ? '提交中...' : '提交评价'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
