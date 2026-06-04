import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { Toast } from '@/components/Toast';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      Toast.show('请输入手机号', 'warning');
      return;
    }
    if (!password.trim()) {
      Toast.show('请输入密码', 'warning');
      return;
    }

    try {
      await login({ phone: phone.trim(), password });
      Toast.show('登录成功', 'success');
      navigate(from, { replace: true });
    } catch {
      Toast.show('手机号或密码错误', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="max-w-lg mx-auto w-full px-4 pt-16 pb-8">
        <h1 className="text-3xl font-bold text-primary font-display">鲜果集</h1>
        <p className="text-gray-500 mt-2">登录以享受新鲜水果配送服务</p>
      </header>

      {/* Form */}
      <main className="max-w-lg mx-auto w-full px-4 flex-1">
        <form onSubmit={handleSubmit} className="space-y-5">
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary text-white font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all"
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          还没有账号？
          <button
            onClick={() => navigate('/register')}
            className="text-primary font-medium hover:underline ml-1"
          >
            立即注册
          </button>
        </p>
      </main>
    </div>
  );
}
