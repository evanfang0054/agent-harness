import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastProvider } from './components/Toast';
import { useAuthStore } from '@/store/auth.store';

function App() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    // 仅登录用户启动时刷新 profile，避免 localStorage 中的 user 过期
    if (token) {
      useAuthStore.getState().refreshUserInfo();
    }
  }, [token]);

  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

export default App;
