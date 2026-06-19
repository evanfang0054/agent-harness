import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cart.store';
import { useOrderStore } from '@/store/order.store';
import { addressApi } from '@/api/address';
import type { Address } from 'shared';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toast } from '@/components/Toast';

export default function Checkout() {
  const navigate = useNavigate();
  const { selectedItems, totalPrice } = useCartStore();
  const { createOrder } = useOrderStore();

  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultAddr, setDefaultAddr] = useState<Address | null>(null);
  const [useAddressBook, setUseAddressBook] = useState(false);

  const selected = selectedItems();
  const subtotal = totalPrice();
  const shippingFee = subtotal >= 99 ? 0 : 8;
  const totalAmount = subtotal + shippingFee;

  useEffect(() => {
    if (selected.length === 0) {
      Toast.show('请先选择商品', 'warning');
      navigate('/cart', { replace: true });
    }
  }, [selected.length, navigate]);

  // 拉取默认地址，自动填充
  useEffect(() => {
    addressApi
      .getList()
      .then((res) => {
        const list = res.data.data ?? [];
        const picked =
          list.find((a) => a.isDefault) ?? (list.length > 0 ? list[0] : null);
        if (picked) {
          setDefaultAddr(picked);
          setUseAddressBook(true);
          const full = `${picked.province}${picked.city}${picked.district}${picked.detail}`;
          setAddress(full);
          setPhone(picked.phone);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!address.trim()) {
      Toast.show('请输入收货地址', 'warning');
      return;
    }
    if (!phone.trim() || phone.trim().length < 11) {
      Toast.show('请输入正确的手机号', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await createOrder({
        address: address.trim(),
        phone: phone.trim(),
        remark: remark.trim() || undefined,
      });
      Toast.show('下单成功', 'success');
      navigate(`/order/${order.id}`, { replace: true });
    } catch {
      Toast.show('下单失败，请重试', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selected.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg pb-28">
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
          <h1 className="text-lg font-semibold text-gray-900">确认订单</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 mt-3">
        {/* Address form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="bg-white rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">收货信息</h2>
              <button
                type="button"
                onClick={() => navigate('/addresses')}
                className="text-[12px] text-brand-primary hover:underline"
              >
                管理地址簿
              </button>
            </div>

            {defaultAddr && (
              <div className="rounded-2xl border border-brand-border p-3 bg-brand-bg">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-brand-dark">
                    {defaultAddr.recipientName}
                  </span>
                  <span className="text-[12px] text-brand-muted">
                    {defaultAddr.phone}
                  </span>
                  {defaultAddr.isDefault && (
                    <span className="px-1.5 py-0.5 rounded-md bg-brand-peach text-brand-primary text-[10px] font-bold">
                      默认
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12px] text-brand-dark">
                  {defaultAddr.province}
                  {defaultAddr.city}
                  {defaultAddr.district}
                  {defaultAddr.detail}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAddressBook}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setUseAddressBook(next);
                        if (next) {
                          const full = `${defaultAddr.province}${defaultAddr.city}${defaultAddr.district}${defaultAddr.detail}`;
                          setAddress(full);
                          setPhone(defaultAddr.phone);
                        }
                      }}
                      className="w-3.5 h-3.5 accent-brand-primary"
                    />
                    <span className="text-[11px] text-brand-muted">
                      使用地址簿地址
                    </span>
                  </label>
                  <span className="text-[11px] text-brand-muted">
                    取消勾选可手动修改
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1">收货地址</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="请输入详细收货地址"
                rows={2}
                className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 bg-brand-bg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors resize-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">手机号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入收货人手机号"
                maxLength={11}
                className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 bg-brand-bg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                备注 <span className="text-gray-400">（选填）</span>
              </label>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="对订单有什么要求？"
                maxLength={100}
                className="w-full px-3 py-2.5 rounded-2xl border border-gray-200 bg-brand-bg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors text-sm"
              />
            </div>
          </section>

          {/* Selected items summary */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">商品清单</h2>
            <div className="space-y-3">
              {selected.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={item.product.image || '/placeholder-fruit.png'}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 line-clamp-1">{item.product.name}</p>
                    {item.specLabel && (
                      <p className="text-xs text-gray-400">{item.specLabel}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-brand-primary">
                      ¥{Number(item.product.price).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">x{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Price summary */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>商品小计</span>
                <span>¥{Number(subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>配送费</span>
                <span className={shippingFee === 0 ? 'text-brand-green' : ''}>
                  {shippingFee === 0 ? '免运费' : `¥${Number(shippingFee).toFixed(2)}`}
                </span>
              </div>
              {shippingFee > 0 && (
                <p className="text-xs text-gray-400">
                  再买¥{(99 - Number(subtotal)).toFixed(2)}即可免运费
                </p>
              )}
              <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                <span className="font-medium text-gray-800">合计</span>
                <span className="text-xl font-bold text-brand-primary">
                  ¥{Number(totalAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </section>
        </form>
      </main>

      {/* Bottom submit bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-bottom">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">应付：</span>
            <span className="text-xl font-bold text-brand-primary">
              ¥{Number(totalAmount).toFixed(2)}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSubmitting ? '提交中...' : '提交订单'}
          </button>
        </div>
      </div>
    </div>
  );
}
