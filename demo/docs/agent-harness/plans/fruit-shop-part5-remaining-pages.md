## Part 5: 剩余页面（Tasks 23-28）

---

## Task 23: 登录 + 注册页面

- [ ] **Step 1**: 创建登录页面 `packages/web/src/pages/Login.tsx`

```tsx
// packages/web/src/pages/Login.tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (!phone.trim()) {
      useAuthStore.setState({ error: '请输入手机号' });
      return;
    }
    if (!password.trim()) {
      useAuthStore.setState({ error: '请输入密码' });
      return;
    }

    await login({ phone: phone.trim(), password });
    const user = useAuthStore.getState().user;
    if (user) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* 品牌标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">鲜果集</h1>
          <p className="text-gray-500 mt-2">新鲜水果，送到家</p>
        </div>

        {/* 登录表单 */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5"
        >
          <h2 className="text-xl font-semibold text-gray-800">登录</h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* 手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              手机号
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              maxLength={11}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {/* 密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <LoadingSpinner size="sm" />}
            {loading ? '登录中...' : '登录'}
          </button>

          {/* 注册链接 */}
          <p className="text-center text-sm text-gray-500">
            还没有账号？
            <Link to="/register" className="text-primary hover:underline ml-1">
              立即注册
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2**: 创建注册页面 `packages/web/src/pages/Register.tsx`

```tsx
// packages/web/src/pages/Register.tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Register() {
  const navigate = useNavigate();
  const { register, login, loading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (!phone.trim()) {
      useAuthStore.setState({ error: '请输入手机号' });
      return;
    }
    if (!/^\d{11}$/.test(phone.trim())) {
      useAuthStore.setState({ error: '请输入正确的11位手机号' });
      return;
    }
    if (!password.trim() || password.length < 6) {
      useAuthStore.setState({ error: '密码至少6位' });
      return;
    }
    if (!nickname.trim()) {
      useAuthStore.setState({ error: '请输入昵称' });
      return;
    }

    const ok = await register({
      phone: phone.trim(),
      password,
      nickname: nickname.trim(),
    });
    if (ok) {
      // 注册成功，自动登录
      await login({ phone: phone.trim(), password });
      const user = useAuthStore.getState().user;
      if (user) {
        navigate('/', { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* 品牌标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">鲜果集</h1>
          <p className="text-gray-500 mt-2">新鲜水果，送到家</p>
        </div>

        {/* 注册表单 */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5"
        >
          <h2 className="text-xl font-semibold text-gray-800">注册</h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* 手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              手机号
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入11位手机号"
              maxLength={11}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {/* 密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6位密码"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {/* 昵称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入昵称"
              maxLength={20}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <LoadingSpinner size="sm" />}
            {loading ? '注册中...' : '注册'}
          </button>

          {/* 登录链接 */}
          <p className="text-center text-sm text-gray-500">
            已有账号？
            <Link to="/login" className="text-primary hover:underline ml-1">
              立即登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
```

```bash
git add packages/web/src/pages/Login.tsx packages/web/src/pages/Register.tsx
git commit -m "feat(web): 添加登录和注册页面 (Task 23)"
```

---

## Task 24: 购物车页面

- [ ] **Step 1**: 创建购物车页面 `packages/web/src/pages/Cart.tsx`

```tsx
// packages/web/src/pages/Cart.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toast } from '@/components/Toast';

export default function Cart() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    items,
    loading,
    fetchCart,
    updateQuantity,
    removeFromCart,
    toggleSelect,
    toggleSelectAll,
    isSelectedAll,
    selectedItems,
    clearCart,
  } = useCartStore();

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user, fetchCart]);

  // 计算选中商品总价
  const selectedTotal = selectedItems().reduce((sum, item) => {
    return sum + item.product.price * item.quantity;
  }, 0);

  const selectedCount = selectedItems().reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const handleCheckout = () => {
    if (selectedCount === 0) {
      Toast.show('请先选择商品');
      return;
    }
    navigate('/checkout');
  };

  // 未登录
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-4">🔒</div>
        <p className="text-gray-500 mb-4">请先登录后查看购物车</p>
        <button
          onClick={() => navigate('/login')}
          className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
        >
          去登录
        </button>
      </div>
    );
  }

  // 加载中
  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // 空购物车
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-4">🛒</div>
        <p className="text-gray-500 mb-4">购物车空空如也</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
        >
          去逛逛
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">购物车</h1>
          <button
            onClick={clearCart}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            清空
          </button>
        </div>
      </header>

      {/* 商品列表 */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 flex items-center gap-3"
          >
            {/* 选择框 */}
            <button
              onClick={() => toggleSelect(item.id)}
              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                item.selected
                  ? 'bg-primary border-primary'
                  : 'border-gray-300'
              }`}
            >
              {item.selected && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            {/* 商品图片 */}
            <div
              onClick={() => navigate(`/product/${item.productId}`)}
              className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer bg-gray-100"
            >
              {item.product.image ? (
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  🍎
                </div>
              )}
            </div>

            {/* 商品信息 */}
            <div className="flex-1 min-w-0">
              <h3
                onClick={() => navigate(`/product/${item.productId}`)}
                className="text-sm font-medium text-gray-800 truncate cursor-pointer"
              >
                {item.product.name}
              </h3>
              <p className="text-primary font-semibold mt-1">
                ¥{item.product.price.toFixed(2)}
              </p>

              {/* 数量控制 */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() =>
                    updateQuantity(item.id, Math.max(0, item.quantity - 1))
                  }
                  className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  -
                </button>
                <span className="text-sm font-medium w-8 text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* 删除 */}
            <button
              onClick={() => removeFromCart(item.id)}
              className="text-gray-300 hover:text-red-500 transition-colors p-1"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* 底部结算栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 全选 */}
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2"
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelectedAll()
                    ? 'bg-primary border-primary'
                    : 'border-gray-300'
                }`}
              >
                {isSelectedAll() && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-600">全选</span>
            </button>

            {/* 合计 */}
            <div className="text-sm">
              <span className="text-gray-500">合计：</span>
              <span className="text-primary font-bold text-lg">
                ¥{selectedTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 结算按钮 */}
          <button
            onClick={handleCheckout}
            disabled={selectedCount === 0}
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            结算({selectedCount})
          </button>
        </div>
      </div>
    </div>
  );
}
```

```bash
git add packages/web/src/pages/Cart.tsx
git commit -m "feat(web): 添加购物车页面，支持数量控制、全选和结算 (Task 24)"
```

---

## Task 25: 下单确认页面

- [ ] **Step 1**: 创建下单确认页面 `packages/web/src/pages/Checkout.tsx`

```tsx
// packages/web/src/pages/Checkout.tsx
import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cart.store';
import { useOrderStore } from '@/store/order.store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toast } from '@/components/Toast';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, selectedItems, fetchCart } = useCartStore();
  const { createOrder, isPlacing: orderLoading } = useOrderStore();

  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [remark, setRemark] = useState('');

  const selected = selectedItems();

  // 没有选中商品时跳回购物车
  useEffect(() => {
    if (items.length > 0 && selected.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [items, selected, navigate]);

  // 计算金额
  const subtotal = selected.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const shippingFee = subtotal >= 99 ? 0 : 10;
  const totalAmount = subtotal + shippingFee;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!address.trim()) {
      Toast.show('请输入收货地址');
      return;
    }
    if (!phone.trim() || !/^\d{11}$/.test(phone.trim())) {
      Toast.show('请输入正确的手机号');
      return;
    }

    const order = await createOrder({
      address: address.trim(),
      phone: phone.trim(),
      remark: remark.trim() || undefined,
    });

    if (order) {
      Toast.show('下单成功');
      await fetchCart();
      navigate(`/order/${order.id}`, { replace: true });
    }
  };

  if (selected.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">确认订单</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* 收货信息 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 space-y-4">
          <h2 className="font-medium text-gray-800">收货信息</h2>

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              收货地址 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="请输入详细收货地址"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              联系电话 <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入联系电话"
              maxLength={11}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">备注</label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="备注信息（可选）"
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>

        {/* 商品列表 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 space-y-3">
          <h2 className="font-medium text-gray-800">商品清单</h2>
          {selected.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                {item.product.image ? (
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">
                    🍎
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">
                  {item.product.name}
                </p>
                <p className="text-xs text-gray-400">x{item.quantity}</p>
              </div>
              <p className="text-sm font-medium text-gray-800">
                ¥{(item.product.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* 金额汇总 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">商品小计</span>
            <span className="text-gray-800">¥{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">运费</span>
            <span className="text-gray-800">
              {shippingFee === 0 ? (
                <span className="text-green-500">免运费</span>
              ) : (
                `¥${shippingFee.toFixed(2)}`
              )}
            </span>
          </div>
          {shippingFee > 0 && (
            <p className="text-xs text-gray-400">
              满 ¥99 免运费，还差 ¥{(99 - subtotal).toFixed(2)}
            </p>
          )}
          <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
            <span className="font-medium text-gray-800">合计</span>
            <span className="text-primary font-bold text-xl">
              ¥{totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </form>

      {/* 底部提交栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">应付：</span>
            <span className="text-primary font-bold text-xl">
              ¥{totalAmount.toFixed(2)}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={orderLoading}
            className="bg-primary text-white px-8 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {orderLoading && <LoadingSpinner size="sm" />}
            {orderLoading ? '提交中...' : '提交订单'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

```bash
git add packages/web/src/pages/Checkout.tsx
git commit -m "feat(web): 添加下单确认页面，支持收货地址、金额汇总和提交订单 (Task 25)"
```

---

## Task 26: 订单列表页面

- [ ] **Step 1**: 创建订单列表页面 `packages/web/src/pages/OrderList.tsx`

```tsx
// packages/web/src/pages/OrderList.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderStatus as OrderStatusEnum } from 'shared';
import { useOrderStore } from '@/store/order.store';
import { useAuthStore } from '@/store/auth.store';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type OrderStatusKey = keyof typeof OrderStatusEnum;

const STATUS_TABS: { label: string; value: OrderStatusEnum | 'ALL' }[] = [
  { label: '全部', value: 'ALL' },
  { label: '待付款', value: OrderStatusEnum.PENDING },
  { label: '已付款', value: OrderStatusEnum.PAID },
  { label: '已发货', value: OrderStatusEnum.SHIPPED },
  { label: '已完成', value: OrderStatusEnum.COMPLETED },
  { label: '已取消', value: OrderStatusEnum.CANCELLED },
];

const STATUS_LABEL: Record<OrderStatusEnum, string> = {
  [OrderStatusEnum.PENDING]: '待付款',
  [OrderStatusEnum.PAID]: '已付款',
  [OrderStatusEnum.SHIPPED]: '已发货',
  [OrderStatusEnum.COMPLETED]: '已完成',
  [OrderStatusEnum.CANCELLED]: '已取消',
};

const STATUS_COLOR: Record<OrderStatusEnum, string> = {
  [OrderStatusEnum.PENDING]: 'text-yellow-600 bg-yellow-50',
  [OrderStatusEnum.PAID]: 'text-blue-600 bg-blue-50',
  [OrderStatusEnum.SHIPPED]: 'text-purple-600 bg-purple-50',
  [OrderStatusEnum.COMPLETED]: 'text-green-600 bg-green-50',
  [OrderStatusEnum.CANCELLED]: 'text-gray-500 bg-gray-50',
};

export default function OrderList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { orders, total, page, totalPages, isLoading, fetchOrders } =
    useOrderStore();

  const [activeTab, setActiveTab] = useState<OrderStatusEnum | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const loadOrders = useCallback(() => {
    if (!user) return;
    fetchOrders({
      page: currentPage,
      limit: 10,
      status: activeTab === 'ALL' ? undefined : activeTab,
    });
  }, [user, currentPage, activeTab, fetchOrders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleTabChange = (tab: OrderStatusEnum | 'ALL') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // 未登录
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-4">🔒</div>
        <p className="text-gray-500 mb-4">请先登录后查看订单</p>
        <button
          onClick={() => navigate('/login')}
          className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
        >
          去登录
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-800">我的订单</h1>
        </div>

        {/* 状态 tabs */}
        <div className="max-w-lg mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'text-primary border-primary'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 订单列表 */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {isLoading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-gray-400">暂无订单</p>
          </div>
        ) : (
          <>
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/order/${order.id}`)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 cursor-pointer hover:shadow-md transition-shadow"
              >
                {/* 订单头部 */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleString('zh-CN')}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      STATUS_COLOR[order.status]
                    }`}
                  >
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>

                {/* 商品预览 */}
                <div className="flex gap-2 mb-3 overflow-x-auto">
                  {(order.items || []).slice(0, 4).map((item, idx) => (
                    <div
                      key={idx}
                      className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          🍎
                        </div>
                      )}
                    </div>
                  ))}
                  {(order.items || []).length > 4 && (
                    <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>

                {/* 订单底部 */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    共{(order.items || []).reduce((s, i) => s + i.quantity, 0)}件商品
                  </span>
                  <div className="text-sm">
                    <span className="text-gray-500">合计：</span>
                    <span className="text-primary font-bold">
                      ¥{order.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-500">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

```bash
git add packages/web/src/pages/OrderList.tsx
git commit -m "feat(web): 添加订单列表页面，支持状态筛选和分页加载 (Task 26)"
```

---

## Task 27: 订单详情页面

- [ ] **Step 1**: 创建订单详情页面 `packages/web/src/pages/OrderDetail.tsx`

```tsx
// packages/web/src/pages/OrderDetail.tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrderStatus as OrderStatusEnum } from 'shared';
import { useOrderStore } from '@/store/order.store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toast } from '@/components/Toast';

const STATUS_LABEL: Record<OrderStatusEnum, string> = {
  [OrderStatusEnum.PENDING]: '待付款',
  [OrderStatusEnum.PAID]: '已付款',
  [OrderStatusEnum.SHIPPED]: '已发货',
  [OrderStatusEnum.COMPLETED]: '已完成',
  [OrderStatusEnum.CANCELLED]: '已取消',
};

const STATUS_COLOR: Record<OrderStatusEnum, string> = {
  [OrderStatusEnum.PENDING]: 'bg-yellow-500',
  [OrderStatusEnum.PAID]: 'bg-blue-500',
  [OrderStatusEnum.SHIPPED]: 'bg-purple-500',
  [OrderStatusEnum.COMPLETED]: 'bg-green-500',
  [OrderStatusEnum.CANCELLED]: 'bg-gray-400',
};

const STATUS_DESCRIPTION: Record<OrderStatusEnum, string> = {
  [OrderStatusEnum.PENDING]: '请尽快完成付款，超时订单将自动取消',
  [OrderStatusEnum.PAID]: '商家正在为您准备商品',
  [OrderStatusEnum.SHIPPED]: '商品已发出，请耐心等待',
  [OrderStatusEnum.COMPLETED]: '订单已完成，感谢您的购买',
  [OrderStatusEnum.CANCELLED]: '订单已取消',
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrder: order, isLoading, fetchOrderById, cancelOrder } =
    useOrderStore();

  useEffect(() => {
    if (id) {
      fetchOrderById(Number(id));
    }
  }, [id, fetchOrderById]);

  const handleCancel = async () => {
    if (!order) return;
    const confirmed = window.confirm('确定要取消该订单吗？');
    if (!confirmed) return;

    const ok = await cancelOrder(order.id);
    if (ok) {
      Toast.show('订单已取消');
      fetchOrderById(order.id);
    }
  };

  // 加载中
  if (isLoading || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">订单详情</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* 订单状态 */}
        <div className={`${STATUS_COLOR[order.status]} rounded-xl p-5 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {STATUS_LABEL[order.status]}
              </h2>
              <p className="text-sm opacity-90 mt-1">
                {STATUS_DESCRIPTION[order.status]}
              </p>
            </div>
            <div className="text-4xl opacity-30">
              {order.status === OrderStatusEnum.PENDING && '💰'}
              {order.status === OrderStatusEnum.PAID && '✅'}
              {order.status === OrderStatusEnum.SHIPPED && '🚚'}
              {order.status === OrderStatusEnum.COMPLETED && '🎉'}
              {order.status === OrderStatusEnum.CANCELLED && '❌'}
            </div>
          </div>
        </div>

        {/* 收货信息 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50">
          <h3 className="font-medium text-gray-800 mb-3">收货信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-gray-400 flex-shrink-0 mt-0.5">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </span>
              <span className="text-gray-700">{order.address || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 flex-shrink-0">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </span>
              <span className="text-gray-700">{order.phone || '-'}</span>
            </div>
            {order.remark && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 flex-shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                </span>
                <span className="text-gray-700">{order.remark}</span>
              </div>
            )}
          </div>
        </div>

        {/* 商品列表 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 space-y-3">
          <h3 className="font-medium text-gray-800">商品信息</h3>
          {(order.items || []).map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">
                    🍎
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">
                  {item.productName}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">x{item.quantity}</p>
              </div>
              <p className="text-sm font-medium text-gray-800">
                ¥{item.price.toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* 订单信息 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 space-y-2">
          <h3 className="font-medium text-gray-800 mb-2">订单信息</h3>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">订单编号</span>
            <span className="text-gray-700 font-mono text-xs">{order.id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">下单时间</span>
            <span className="text-gray-700">
              {new Date(order.createdAt).toLocaleString('zh-CN')}
            </span>
          </div>
          {order.paidAt && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">付款时间</span>
              <span className="text-gray-700">
                {new Date(order.paidAt).toLocaleString('zh-CN')}
              </span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="text-sm font-medium text-gray-800">订单金额</span>
            <span className="text-primary font-bold text-lg">
              ¥{order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        {order.status === OrderStatusEnum.PENDING && (
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消订单
            </button>
            <button
              onClick={() => {
                Toast.show('支付功能开发中');
              }}
              className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              去支付
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

```bash
git add packages/web/src/pages/OrderDetail.tsx
git commit -m "feat(web): 添加订单详情页面，含状态、收货信息、商品列表和取消订单 (Task 27)"
```

---

## Task 28: Admin 商品管理页面

- [ ] **Step 1**: 创建 Admin 商品管理页面 `packages/web/src/pages/AdminProducts.tsx`

```tsx
// packages/web/src/pages/AdminProducts.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductStatus as ProductStatusEnum, Category, UserRole as UserRoleEnum } from 'shared';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/api/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toast } from '@/components/Toast';

const STATUS_OPTIONS: { label: string; value: ProductStatusEnum }[] = [
  { label: '上架', value: ProductStatusEnum.ON },
  { label: '下架', value: ProductStatusEnum.OFF },
];

const STATUS_LABEL: Record<ProductStatusEnum, string> = {
  [ProductStatusEnum.ON]: '上架',
  [ProductStatusEnum.OFF]: '下架',
};

const STATUS_BADGE: Record<ProductStatusEnum, string> = {
  [ProductStatusEnum.ON]: 'text-green-700 bg-green-50',
  [ProductStatusEnum.OFF]: 'text-gray-500 bg-gray-100',
};

// 表单初始值
interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  image: string;
  status: ProductStatusEnum;
}

const emptyForm: ProductForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
  categoryId: '',
  image: '',
  status: ProductStatusEnum.ON,
};

export default function AdminProducts() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // 列表状态
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal 状态
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // 删除确认
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // 权限检查
  useEffect(() => {
    if (user && user.role !== UserRoleEnum.ADMIN) {
      Toast.show('无权访问');
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // 获取分类
  useEffect(() => {
    apiClient.get('/categories')
      .then((res) => {
        if (res.data.code === 0) {
          setCategories(res.data.data || []);
        }
      })
      .catch(() => {});
  }, []);

  // 获取商品列表
  const fetchProducts = async (p: number = 1) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/products', { params: { page: p, limit: 10 } });
      const data = res.data;
      if (data.code === 0) {
        setProducts(data.data?.items || []);
        setTotalPages(data.data?.totalPages || 1);
        setPage(p);
      }
    } catch {
      Toast.show('获取商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === UserRoleEnum.ADMIN) {
      fetchProducts(1);
    }
  }, [user]);

  // 打开新建/编辑 Modal
  const openModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setForm({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        stock: product.stock.toString(),
        categoryId: product.categoryId?.toString() || '',
        image: product.image || '',
        status: product.status,
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setShowModal(true);
  };

  // 提交表单
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: parseFloat(form.price),
      stock: parseInt(form.stock, 10),
      categoryId: form.categoryId ? parseInt(form.categoryId, 10) : undefined,
      image: form.image.trim() || undefined,
      status: form.status,
    };

    try {
      const res = editingId
        ? await apiClient.put(`/products/${editingId}`, payload)
        : await apiClient.post('/products', payload);
      const data = res.data;

      if (data.code === 0) {
        Toast.show(editingId ? '更新成功' : '创建成功');
        setShowModal(false);
        fetchProducts(page);
      } else {
        Toast.show(data.message || '操作失败');
      }
    } catch {
      Toast.show('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除商品
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await apiClient.delete(`/products/${deleteId}`);
      const data = res.data;
      if (data.code === 0) {
        Toast.show('删除成功');
        setDeleteId(null);
        fetchProducts(page);
      } else {
        Toast.show(data.message || '删除失败');
      }
    } catch {
      Toast.show('网络错误');
    }
  };

  // 未登录或非管理员
  if (!user || user.role !== UserRoleEnum.ADMIN) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return '-';
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || '-';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800">商品管理</h1>
          </div>
          <button
            onClick={() => openModal()}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + 新增商品
          </button>
        </div>
      </header>

      {/* 表格 */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        ID
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        商品
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        分类
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">
                        价格
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">
                        库存
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">
                        状态
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                          {product.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  🍎
                                </div>
                              )}
                            </div>
                            <span className="font-medium text-gray-800 truncate max-w-[200px]">
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {getCategoryName(product.categoryId)}
                        </td>
                        <td className="px-4 py-3 text-right text-primary font-medium">
                          ¥{product.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {product.stock}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                              STATUS_BADGE[product.status]
                            }`}
                          >
                            {STATUS_LABEL[product.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openModal(product)}
                              className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => setDeleteId(product.id)}
                              className="text-red-500 hover:text-red-600 text-xs font-medium transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {products.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  暂无商品数据
                </div>
              )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => fetchProducts(page - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => fetchProducts(page + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 新建/编辑 Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* 遮罩 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !submitting && setShowModal(false)}
          />

          {/* 表单 */}
          <form
            onSubmit={handleSubmit}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-800">
              {editingId ? '编辑商品' : '新增商品'}
            </h2>

            {/* 商品名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                商品名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="请输入商品名称"
                maxLength={50}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                商品描述
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="请输入商品描述（可选）"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
              />
            </div>

            {/* 价格 + 库存 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  价格 <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="0.00"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  库存 <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stock: e.target.value }))
                  }
                  placeholder="0"
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* 分类 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类
              </label>
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoryId: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors bg-white"
              >
                <option value="">请选择分类</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 图片 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                图片URL
              </label>
              <input
                type="url"
                value={form.image}
                onChange={(e) =>
                  setForm((f) => ({ ...f, image: e.target.value }))
                }
                placeholder="https://..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            {/* 状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <div className="flex gap-3">
                {STATUS_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      checked={form.status === opt.value}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          status: e.target.value as ProductStatusEnum,
                        }))
                      }
                      className="text-primary focus:ring-primary/30"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <LoadingSpinner size="sm" />}
                {submitting ? '提交中...' : editingId ? '更新' : '创建'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 删除确认 Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteId(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-800">确认删除</h3>
            <p className="text-sm text-gray-500">
              删除后不可恢复，确定要删除该商品吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

```bash
git add packages/web/src/pages/AdminProducts.tsx
git commit -m "feat(web): 添加Admin商品管理页面，支持CRUD、Modal表单和删除确认 (Task 28)"
```

---

## 总结

| Task | 页面 | 文件路径 | 核心功能 |
|------|------|----------|----------|
| 23 | 登录 + 注册 | `pages/Login.tsx`, `pages/Register.tsx` | 手机号+密码登录, 注册后自动登录跳首页 |
| 24 | 购物车 | `pages/Cart.tsx` | 数量加减, 全选, 底部结算栏, 空状态 |
| 25 | 下单确认 | `pages/Checkout.tsx` | 收货地址/电话/备注, 金额汇总(含运费), 提交跳订单详情 |
| 26 | 订单列表 | `pages/OrderList.tsx` | 6个状态Tab, 分页加载, 订单卡片预览 |
| 27 | 订单详情 | `pages/OrderDetail.tsx` | 状态头部, 收货信息, 商品列表, 取消订单 |
| 28 | Admin商品管理 | `pages/AdminProducts.tsx` | CRUD表格, Modal表单, 删除确认弹窗, 分页 |

所有页面遵循统一设计规范：
- Tailwind 品牌色（`text-primary`, `bg-primary`）
- `max-w-lg` 移动端布局（Admin 页面使用 `max-w-5xl`）
- 复用 `useAuthStore`, `useCartStore`, `useOrderStore`, `Toast`, `LoadingSpinner`
- 共享类型从 `shared` 包导入（`OrderStatus`, `ProductStatus`, `UserRole` 等）