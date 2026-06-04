import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from 'shared';

const Home = lazy(() => import('@/pages/Home'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const OrderList = lazy(() => import('@/pages/OrderList'));
const OrderDetail = lazy(() => import('@/pages/OrderDetail'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const AdminProducts = lazy(() => import('@/pages/AdminProducts'));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

// 登录保护：未登录跳转到 /login
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// 管理员保护：非管理员跳转到首页
function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== UserRole.ADMIN) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SuspenseWrapper><Home /></SuspenseWrapper>,
  },
  {
    path: '/product/:id',
    element: <SuspenseWrapper><ProductDetail /></SuspenseWrapper>,
  },
  {
    path: '/cart',
    element: <SuspenseWrapper><ProtectedRoute><Cart /></ProtectedRoute></SuspenseWrapper>,
  },
  {
    path: '/checkout',
    element: <SuspenseWrapper><ProtectedRoute><Checkout /></ProtectedRoute></SuspenseWrapper>,
  },
  {
    path: '/orders',
    element: <SuspenseWrapper><ProtectedRoute><OrderList /></ProtectedRoute></SuspenseWrapper>,
  },
  {
    path: '/order/:id',
    element: <SuspenseWrapper><ProtectedRoute><OrderDetail /></ProtectedRoute></SuspenseWrapper>,
  },
  {
    path: '/login',
    element: <SuspenseWrapper><Login /></SuspenseWrapper>,
  },
  {
    path: '/register',
    element: <SuspenseWrapper><Register /></SuspenseWrapper>,
  },
  {
    path: '/admin/products',
    element: <SuspenseWrapper><AdminRoute><AdminProducts /></AdminRoute></SuspenseWrapper>,
  },
]);
