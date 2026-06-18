# Part 4: 前端基础（Tasks 16-22）

## Task 16: Vite + React 项目初始化

- [ ] **Step 1: 创建 Vite 配置文件**

```typescript
// packages/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 2: 创建 index.html 入口**

```html
<!-- packages/web/index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="鲜果集 - 新鲜水果，产地直送" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap"
      rel="stylesheet"
    />
    <title>鲜果集 - 新鲜水果产地直送</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: 创建 React 入口文件**

```typescript
// packages/web/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: 创建 App 根组件**

```tsx
// packages/web/src/App.tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

export default App;
```

- [ ] **Step 5: 创建 Vite 环境类型声明**

```typescript
// packages/web/src/vite-env.d.ts
/// <reference types="vite/client" />
```

- [ ] **Step 6: 创建 package.json**

```json
// packages/web/package.json
{
  "name": "@fruit-shop/web",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@fruit-shop/shared": "workspace:*",
    "axios": "^1.7.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 7: 创建 tsconfig.json**

```json
// packages/web/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "shared": ["../shared/src"]
    }
  },
  "include": ["src"]
}
```

```bash
git add packages/web/ && git commit -m "feat(web): Vite + React 18 项目初始化，配置代理和路径别名"
```

---

## Task 17: Tailwind CSS v4 品牌主题 + 动画

- [ ] **Step 1: 创建品牌主题样式**

```css
/* packages/web/src/styles/index.css */
@import "tailwindcss";

@theme {
  /* 品牌主色 */
  --color-primary: #FF6B35;
  --color-primary-light: #FF8C5A;
  --color-primary-dark: #E55A2B;

  /* 强调色 */
  --color-accent: #FFD32A;

  /* 语义色 */
  --color-success: #26DE81;
  --color-danger: #FF6B6B;
  --color-warning: #FFA502;
  --color-info: #45AAF2;

  /* 中性色 */
  --color-gray-50: #FAFAFA;
  --color-gray-100: #F5F5F5;
  --color-gray-200: #EEEEEE;
  --color-gray-300: #E0E0E0;
  --color-gray-400: #BDBDBD;
  --color-gray-500: #9E9E9E;
  --color-gray-600: #757575;
  --color-gray-700: #616161;
  --color-gray-800: #424242;
  --color-gray-900: #212121;

  /* 字体 */
  --font-display: 'Fredoka', sans-serif;
  --font-body: 'Noto Sans SC', sans-serif;
}

/* 基础重置 */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
  color: var(--color-gray-900);
  background-color: #FFFFFF;
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-gray-300);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-gray-400);
}

/* 常用工具类 */
.font-display {
  font-family: var(--font-display);
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 安全区域适配 */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.safe-top {
  padding-top: env(safe-area-inset-top, 0px);
}
```

- [ ] **Step 2: 创建动画样式**

```css
/* packages/web/src/styles/animations.css */

/* 弹入动画 */
@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 浮动动画 */
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* 脉冲发光 */
@keyframes pulseGlow {
  0%,
  100% {
    box-shadow: 0 0 5px rgba(255, 107, 53, 0.4);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 107, 53, 0.8);
  }
}

/* 慢速旋转 */
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 上滑进入 */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 淡入 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Tailwind v4 自定义动画注册 */
@utility animate-bounce-in {
  animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55) both;
}

@utility animate-float {
  animation: float 3s ease-in-out infinite;
}

@utility animate-pulse-glow {
  animation: pulseGlow 2s ease-in-out infinite;
}

@utility animate-spin-slow {
  animation: spin-slow 8s linear infinite;
}

@utility animate-slide-up {
  animation: slideUp 0.4s ease-out both;
}

@utility animate-fade-in {
  animation: fadeIn 0.3s ease-out both;
}
```

- [ ] **Step 3: 更新 index.css 引入动画**

在 `index.css` 顶部添加动画导入：

```css
/* packages/web/src/styles/index.css — 在文件顶部添加 */
@import "./animations.css";
```

```bash
git add packages/web/src/styles/ && git commit -m "feat(web): Tailwind v4 品牌主题配置 + 6个自定义动画"
```

---

## Task 18: React Router 路由配置

- [ ] **Step 1: 创建路由配置**

```tsx
// packages/web/src/router/index.tsx
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
```

- [ ] **Step 2: 创建 ProtectedRoute 组件**

```tsx
// packages/web/src/router/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: 创建 AdminRoute 组件**

```tsx
// packages/web/src/router/AdminRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole } from 'shared';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== ('admin' as UserRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

```bash
git add packages/web/src/router/ && git commit -m "feat(web): React Router v6 路由配置，ProtectedRoute + AdminRoute 守卫"
```

---

## Task 19: Axios 实例 + API 模块

- [ ] **Step 1: 创建 Axios 客户端实例**

```typescript
// packages/web/src/api/client.ts
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';
import type { ApiResponse } from 'shared';

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：注入 token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 刷新 token 状态管理
let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processPendingRequests(token: string | null, error?: unknown) {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
    } else {
      reject(error);
    }
  });
  pendingRequests = [];
}

// 响应拦截器：处理 401 自动刷新
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post<ApiResponse<{ token: string }>>(
          '/api/auth/refresh',
          { refreshToken },
        );

        const newToken = data.data.token;
        useAuthStore.getState().setToken(newToken);

        processPendingRequests(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processPendingRequests(null, refreshError);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
```

- [ ] **Step 2: 创建 auth API 模块**

```typescript
// packages/web/src/api/auth.ts
import { apiClient } from './client';
import type {
  ApiResponse,
  LoginDTO,
  RegisterDTO,
  LoginResponse,
} from 'shared';

export const authApi = {
  login(data: LoginDTO) {
    return apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data);
  },

  register(data: RegisterDTO) {
    return apiClient.post<ApiResponse<LoginResponse>>('/auth/register', data);
  },

  refresh(refreshToken: string) {
    return apiClient.post<ApiResponse<{ token: string }>>('/auth/refresh', {
      refreshToken,
    });
  },

  logout() {
    return apiClient.post<ApiResponse<null>>('/auth/logout');
  },
};
```

- [ ] **Step 3: 创建 user API 模块**

```typescript
// packages/web/src/api/user.ts
import { apiClient } from './client';
import type { ApiResponse, User } from 'shared';

export const userApi = {
  getProfile() {
    return apiClient.get<ApiResponse<User>>('/users/profile');
  },

  updateProfile(data: Partial<Pick<User, 'nickname' | 'avatar'>>) {
    return apiClient.patch<ApiResponse<User>>('/users/profile', data);
  },
};
```

- [ ] **Step 4: 创建 product API 模块**

```typescript
// packages/web/src/api/product.ts
import { apiClient } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  PaginationQuery,
} from 'shared';

export interface ProductQuery extends PaginationQuery {
  categoryId?: number;
  keyword?: string;
  status?: string;
}

export const productApi = {
  getList(params?: ProductQuery) {
    return apiClient.get<PaginatedResponse<Product>>('/products', { params });
  },

  getDetail(id: number) {
    return apiClient.get<ApiResponse<Product>>(`/products/${id}`);
  },

  getRecommendations(limit = 10) {
    return apiClient.get<ApiResponse<Product[]>>('/products/recommendations', {
      params: { limit },
    });
  },
};
```

- [ ] **Step 5: 创建 cart API 模块**

```typescript
// packages/web/src/api/cart.ts
import { apiClient } from './client';
import type {
  ApiResponse,
  CartItem,
  CartItemWithProduct,
  AddToCartDTO,
  UpdateCartDTO,
} from 'shared';

export const cartApi = {
  getList() {
    return apiClient.get<ApiResponse<CartItemWithProduct[]>>('/cart');
  },

  add(data: AddToCartDTO) {
    return apiClient.post<ApiResponse<CartItem>>('/cart', data);
  },

  update(id: number, data: UpdateCartDTO) {
    return apiClient.patch<ApiResponse<CartItem>>(`/cart/${id}`, data);
  },

  remove(id: number) {
    return apiClient.delete<ApiResponse<null>>(`/cart/${id}`);
  },

  clear() {
    return apiClient.delete<ApiResponse<null>>('/cart');
  },
};
```

- [ ] **Step 6: 创建 order API 模块**

```typescript
// packages/web/src/api/order.ts
import { apiClient } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Order,
  OrderWithItems,
  CreateOrderDTO,
  PaginationQuery,
} from 'shared';

export const orderApi = {
  create(data: CreateOrderDTO) {
    return apiClient.post<ApiResponse<Order>>('/orders', data);
  },

  getList(params?: PaginationQuery) {
    return apiClient.get<PaginatedResponse<Order>>('/orders', { params });
  },

  getDetail(id: number) {
    return apiClient.get<ApiResponse<OrderWithItems>>(`/orders/${id}`);
  },

  cancel(id: number) {
    return apiClient.patch<ApiResponse<Order>>(`/orders/${id}/cancel`);
  },
};
```

- [ ] **Step 7: 创建 API 统一导出**

```typescript
// packages/web/src/api/index.ts
export { apiClient } from './client';
export { authApi } from './auth';
export { userApi } from './user';
export { productApi, type ProductQuery } from './product';
export { cartApi } from './cart';
export { orderApi } from './order';
```

```bash
git add packages/web/src/api/ && git commit -m "feat(web): Axios 实例 + 401 自动刷新拦截器 + 5个 API 模块"
```

---

## Task 20: Zustand Stores（3个）

- [ ] **Step 1: 创建 auth store**

```typescript
// packages/web/src/store/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginDTO, RegisterDTO } from 'shared';
import { authApi } from '@/api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  setToken: (token: string) => void;
  login: (data: LoginDTO) => Promise<void>;
  register: (data: RegisterDTO) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshUserInfo: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      setToken: (token: string) => {
        set({ token });
      },

      login: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { data: resData } = await authApi.login(data);
          const { accessToken, refreshToken, user } = resData.data;
          set({ user, token: accessToken, refreshToken, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error?.response?.data?.message || '登录失败' });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { data: resData } = await authApi.register(data);
          const { accessToken, refreshToken, user } = resData.data;
          set({ user, token: accessToken, refreshToken, isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error?.response?.data?.message || '注册失败' });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null, error: null });
      },

      clearError: () => {
        set({ error: null });
      },

      refreshUserInfo: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const { userApi } = await import('@/api/user');
          const { data } = await userApi.getProfile();
          set({ user: data.data });
        } catch {
          // token 无效，清除登录态
          set({ user: null, token: null, refreshToken: null });
        }
      },
    }),
    {
      name: 'fruit-shop-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);
```

- [ ] **Step 2: 创建 cart store**

```typescript
// packages/web/src/store/cart.store.ts
import { create } from 'zustand';
import type { CartItemWithProduct, AddToCartDTO, UpdateCartDTO } from 'shared';
import { cartApi } from '@/api/cart';

interface CartState {
  items: CartItemWithProduct[];
  isLoading: boolean;
  isUpdating: boolean;
  loading: boolean; // alias for isLoading

  fetchCart: () => Promise<void>;
  addItem: (data: AddToCartDTO) => Promise<void>;
  updateQuantity: (id: number, data: UpdateCartDTO) => Promise<void>;
  removeFromCart: (id: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleSelect: (id: number) => void;
  toggleSelectAll: () => void;

  totalCount: () => number;
  totalPrice: () => number;
  selectedItems: () => CartItemWithProduct[];
  isSelectedAll: () => boolean;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  isLoading: false,
  isUpdating: false,
  loading: false,

  fetchCart: async () => {
    set({ isLoading: true, loading: true });
    try {
      const { data } = await cartApi.getList();
      set({ items: data.data, isLoading: false, loading: false });
    } catch {
      set({ isLoading: false, loading: false });
    }
  },

  addItem: async (itemData) => {
    set({ isUpdating: true });
    try {
      await cartApi.add(itemData);
      await get().fetchCart();
    } finally {
      set({ isUpdating: false });
    }
  },

  updateQuantity: async (id, updateData) => {
    set({ isUpdating: true });
    try {
      await cartApi.update(id, updateData);
      await get().fetchCart();
    } finally {
      set({ isUpdating: false });
    }
  },

  removeFromCart: async (id) => {
    set({ isUpdating: true });
    try {
      await cartApi.remove(id);
      await get().fetchCart();
    } finally {
      set({ isUpdating: false });
    }
  },

  clearCart: async () => {
    set({ isUpdating: true });
    try {
      await cartApi.clear();
      set({ items: [] });
    } finally {
      set({ isUpdating: false });
    }
  },

  toggleSelect: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      ),
    }));
  },

  toggleSelectAll: () => {
    const allSelected = get().isSelectedAll();
    set((state) => ({
      items: state.items.map((item) => ({ ...item, selected: !allSelected })),
    }));
  },

  totalCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  totalPrice: () => {
    return get().items
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  },

  selectedItems: () => {
    return get().items.filter((item) => item.selected);
  },

  isSelectedAll: () => {
    const { items } = get();
    return items.length > 0 && items.every((item) => item.selected);
  },
}));
```

- [ ] **Step 3: 创建 order store**

```typescript
// packages/web/src/store/order.store.ts
import { create } from 'zustand';
import type { Order, OrderWithItems, CreateOrderDTO, PaginationQuery } from 'shared';
import { orderApi } from '@/api/order';

interface OrderState {
  orders: Order[];
  currentOrder: OrderWithItems | null;
  isLoading: boolean;
  isPlacing: boolean;
  total: number;
  totalPages: number;
  page: number;

  fetchOrders: (params?: PaginationQuery) => Promise<void>;
  fetchOrderById: (id: number) => Promise<void>;
  createOrder: (data: CreateOrderDTO) => Promise<Order>;
  cancelOrder: (id: number) => Promise<void>;
  clearCurrentOrder: () => void;
}

export const useOrderStore = create<OrderState>()((set, get) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  isPlacing: false,
  total: 0,
  totalPages: 0,
  page: 1,

  fetchOrders: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await orderApi.getList(params);
      set((state) => ({
        orders: params?.page === 1 || !params?.page ? data.data.items : [...state.orders, ...data.data.items],
        total: data.data.total,
        totalPages: data.data.totalPages,
        page: params?.page ?? 1,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  fetchOrderById: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await orderApi.getDetail(id);
      set({ currentOrder: data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createOrder: async (orderData) => {
    set({ isPlacing: true });
    try {
      const { data } = await orderApi.create(orderData);
      const order = data.data;
      set({ isPlacing: false });
      return order;
    } catch (error) {
      set({ isPlacing: false });
      throw error;
    }
  },

  cancelOrder: async (id) => {
    try {
      await orderApi.cancel(id);
      // 刷新订单详情
      const currentOrder = get().currentOrder;
      if (currentOrder && currentOrder.id === id) {
        await get().fetchOrderById(id);
      }
      // 刷新订单列表
      await get().fetchOrders({ page: 1 });
    } catch (error) {
      throw error;
    }
  },

  clearCurrentOrder: () => {
    set({ currentOrder: null });
  },
}));
```

```bash
git add packages/web/src/store/ && git commit -m "feat(web): Zustand stores - auth/cart/order 状态管理"
```

---

## Task 21: 可复用 UI 组件

- [ ] **Step 1: 创建 Toast 通知组件**

```tsx
// packages/web/src/components/Toast.tsx
import { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let toastId = 0;

// 用于 Toast.show() 静态方法的外部 showToast 引用
let externalShowToast: ((message: string, type?: ToastType) => void) | null = null;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // 注册到外部引用
  externalShowToast = showToast;

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const typeStyles: Record<ToastType, string> = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    warning: 'bg-warning text-gray-900',
    info: 'bg-info text-white',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-slide-up rounded-lg px-4 py-3 shadow-lg text-sm font-medium min-w-[240px] max-w-[360px] flex items-center justify-between ${typeStyles[toast.type]}`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 opacity-70 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// 静态方法：允许在非 React 组件中调用
Toast.show = function (message: string, type: ToastType = 'info') {
  if (externalShowToast) {
    externalShowToast(message, type);
  } else {
    console.warn('Toast.show() called before ToastProvider mounted');
  }
};
```

- [ ] **Step 2: 创建 ProductCard 组件**

```tsx
// packages/web/src/components/ProductCard.tsx
import { useNavigate } from 'react-router-dom';
import type { Product } from 'shared';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image || '/placeholder-fruit.png'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.origin && (
          <span className="absolute top-2 left-2 bg-primary/90 text-white text-xs px-2 py-0.5 rounded-full">
            {product.origin}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-800 line-clamp-1">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
            {product.description}
          </p>
        )}
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-lg font-bold text-primary">
            ¥{formatPrice(product.price)}
          </span>
          {product.unit && (
            <span className="text-xs text-gray-400">/{product.unit}</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 CategoryTabs 组件**

```tsx
// packages/web/src/components/CategoryTabs.tsx
import type { Category } from 'shared';

interface CategoryTabsProps {
  categories: Category[];
  activeId?: number;
  onChange: (categoryId?: number) => void;
}

export function CategoryTabs({ categories, activeId, onChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onChange(undefined)}
        className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
          activeId === undefined
            ? 'bg-primary text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        全部
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            activeId === cat.id
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 创建 SearchBar 组件**

```tsx
// packages/web/src/components/SearchBar.tsx
import { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  onSearch: (keyword: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export function SearchBar({
  onSearch,
  placeholder = '搜索水果...',
  initialValue = '',
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (text: string) => {
    setValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(text);
    }, 400);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-8 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 创建 PromoBanner 组件**

```tsx
// packages/web/src/components/PromoBanner.tsx
import { useState, useEffect } from 'react';

interface Banner {
  id: number;
  image: string;
  title: string;
  link?: string;
}

interface PromoBannerProps {
  banners: Banner[];
}

export function PromoBanner({ banners }: PromoBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl aspect-[2/1]">
      <div
        className="flex transition-transform duration-500 ease-out h-full"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {banners.map((banner) => (
          <div key={banner.id} className="min-w-full h-full relative">
            <img
              src={banner.image}
              alt={banner.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <h3 className="absolute bottom-3 left-4 text-white font-display text-lg font-semibold drop-shadow-md">
              {banner.title}
            </h3>
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-2 right-3 flex gap-1.5">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === activeIndex
                  ? 'bg-white w-4'
                  : 'bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: 创建 TabBar 底部导航组件**

```tsx
// packages/web/src/components/TabBar.tsx
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  {
    path: '/',
    label: '首页',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    activeIcon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <rect x="9" y="12" width="6" height="10" rx="1" />
      </svg>
    ),
  },
  {
    path: '/cart',
    label: '购物车',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
      </svg>
    ),
    activeIcon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9" cy="21" r="1.5" />
        <circle cx="20" cy="21" r="1.5" />
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    path: '/orders',
    label: '订单',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    activeIcon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <rect x="8" y="12" width="8" height="2" rx="1" />
        <rect x="8" y="16" width="8" height="2" rx="1" />
      </svg>
    ),
  },
];

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-50">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path);

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`}
            >
              {isActive ? tab.activeIcon : tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 7: 创建 BuyBar 购买栏组件**

```tsx
// packages/web/src/components/BuyBar.tsx
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
```

- [ ] **Step 8: 创建 SpecSelector 规格选择组件**

```tsx
// packages/web/src/components/SpecSelector.tsx
import { useState } from 'react';

interface Spec {
  name: string;
  values: string[];
}

interface SpecSelectorProps {
  specs: Spec[];
  onChange: (selected: Record<string, string>) => void;
}

export function SpecSelector({ specs, onChange }: SpecSelectorProps) {
  const [selected, setSelected] = useState<Record<string, string>>({});

  const handleSelect = (specName: string, value: string) => {
    const next = { ...selected, [specName]: value };
    setSelected(next);
    onChange(next);
  };

  if (specs.length === 0) return null;

  return (
    <div className="space-y-4">
      {specs.map((spec) => (
        <div key={spec.name}>
          <h4 className="text-sm font-medium text-gray-700 mb-2">{spec.name}</h4>
          <div className="flex flex-wrap gap-2">
            {spec.values.map((value) => {
              const isActive = selected[spec.name] === value;
              return (
                <button
                  key={value}
                  onClick={() => handleSelect(spec.name, value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 9: 创建 LoadingSpinner 组件**

```tsx
// packages/web/src/components/LoadingSpinner.tsx

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const sizeMap = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function LoadingSpinner({ size = 'md', color }: LoadingSpinnerProps) {
  return (
    <div
      className={`${sizeMap[size]} animate-spin`}
      style={{ color: color || 'var(--color-primary)' }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.2"
        />
        <path
          d="M12 2a10 10 0 0110 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
```

```bash
git add packages/web/src/components/ && git commit -m "feat(web): 9个可复用 UI 组件 - Toast/ProductCard/CategoryTabs/SearchBar/PromoBanner/TabBar/BuyBar/SpecSelector/LoadingSpinner"
```

---

## Task 22: 首页 + 商品详情页

- [ ] **Step 1: 创建首页**

```tsx
// packages/web/src/pages/Home.tsx
import { useState, useEffect, useCallback } from 'react';
import { productApi, type ProductQuery } from '@/api/product';
import { useCartStore } from '@/store/cart.store';
import type { Product, Category } from 'shared';
import { ProductCard } from '@/components/ProductCard';
import { CategoryTabs } from '@/components/CategoryTabs';
import { SearchBar } from '@/components/SearchBar';
import { PromoBanner } from '@/components/PromoBanner';
import { TabBar } from '@/components/TabBar';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const MOCK_BANNERS = [
  { id: 1, image: '/banners/summer.jpg', title: '夏日鲜果季 限时特惠' },
  { id: 2, image: '/banners/mango.jpg', title: '海南芒果 产地直发' },
  { id: 3, image: '/banners/organic.jpg', title: '有机认证 安心好果' },
];

const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: '热带水果', icon: '🌴', sort: 1 },
  { id: 2, name: '柑橘类', icon: '🍊', sort: 2 },
  { id: 3, name: '浆果类', icon: '🫐', sort: 3 },
  { id: 4, name: '瓜类', icon: '🍉', sort: 4 },
  { id: 5, name: '进口水果', icon: '✈️', sort: 5 },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchProducts = useCallback(
    async (p: number, kw?: string, catId?: number) => {
      setIsLoading(true);
      try {
        const params: ProductQuery = { page: p, limit: 12 };
        if (kw) params.keyword = kw;
        if (catId) params.categoryId = catId;

        const { data } = await productApi.getList(params);
        const items = data.data.items;

        setProducts((prev) => (p === 1 ? items : [...prev, ...items]));
        setHasMore(items.length >= 12);
      } catch {
        // 静默处理，显示空状态
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setPage(1);
    fetchProducts(1, keyword, activeCategory);
  }, [keyword, activeCategory, fetchProducts]);

  const handleSearch = (kw: string) => {
    setKeyword(kw);
  };

  const handleCategoryChange = (catId?: number) => {
    setActiveCategory(catId);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, keyword, activeCategory);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm safe-top">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-2xl font-bold text-primary">
              鲜果集
            </h1>
            <div className="flex items-center gap-2">
              <button className="text-gray-500 hover:text-primary transition-colors">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </button>
            </div>
          </div>
          <SearchBar onSearch={handleSearch} />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4">
        {/* 轮播 Banner */}
        <section className="mt-4">
          <PromoBanner banners={MOCK_BANNERS} />
        </section>

        {/* 分类标签 */}
        <section className="mt-4">
          <CategoryTabs
            categories={MOCK_CATEGORIES}
            activeId={activeCategory}
            onChange={handleCategoryChange}
          />
        </section>

        {/* 快捷入口 */}
        <section className="mt-4 grid grid-cols-4 gap-3">
          {MOCK_CATEGORIES.slice(0, 4).map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className="flex flex-col items-center gap-1 py-2"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs text-gray-600">{cat.name}</span>
            </button>
          ))}
        </section>

        {/* 商品列表 */}
        <section className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-gray-800">
              {activeCategory
                ? MOCK_CATEGORIES.find((c) => c.id === activeCategory)?.name || '精选好果'
                : '精选好果'}
            </h2>
          </div>

          {isLoading && page === 1 ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-sm">
                {keyword ? `未找到"${keyword}"相关水果` : '暂无商品'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="px-6 py-2 text-sm text-primary border border-primary/30 rounded-full hover:bg-primary/5 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? '加载中...' : '查看更多'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <TabBar />
    </div>
  );
}
```

- [ ] **Step 2: 创建商品详情页**

```tsx
// packages/web/src/pages/ProductDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productApi } from '@/api/product';
import type { Product } from 'shared';
import { SpecSelector } from '@/components/SpecSelector';
import { BuyBar } from '@/components/BuyBar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const { data } = await productApi.getDetail(Number(id));
        setProduct(data.data);
      } catch {
        showToast('商品不存在或已下架', 'error');
        navigate('/', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate, showToast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!product) return null;

  const images = product.images?.length ? product.images : ['/placeholder-fruit.png'];
  const currentPrice = product.price * quantity;

  // 解析规格：假设 product 有 specs 字段（JSON 存储的规格信息）
  const specs: Array<{ name: string; values: string[] }> = [];
  if ((product as Product & { specs?: string }).specs) {
    try {
      const parsed = JSON.parse(
        (product as Product & { specs?: string }).specs || '[]',
      );
      if (Array.isArray(parsed)) {
        parsed.forEach((s: { name: string; values: string[] }) => {
          if (s.name && Array.isArray(s.values)) {
            specs.push(s);
          }
        });
      }
    } catch {
      // specs 格式不合法，忽略
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-30 safe-top">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 商品图片轮播 */}
      <div className="relative aspect-square bg-white">
        <div
          className="flex transition-transform duration-300 h-full"
          style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
        >
          {images.map((img, idx) => (
            <div key={idx} className="min-w-full h-full">
              <img
                src={img}
                alt={`${product.name} ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentImageIndex((prev) =>
                  prev === 0 ? images.length - 1 : prev - 1,
                )
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 shadow"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={() =>
                setCurrentImageIndex((prev) =>
                  prev === images.length - 1 ? 0 : prev + 1,
                )
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 shadow"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
              {currentImageIndex + 1}/{images.length}
            </div>
          </>
        )}
      </div>

      {/* 商品信息 */}
      <main className="max-w-lg mx-auto">
        {/* 价格区 */}
        <div className="bg-white px-4 py-4">
          <div className="flex items-baseline gap-1">
            <span className="text-primary text-3xl font-bold font-display">
              ¥{product.price.toFixed(2)}
            </span>
            {product.unit && (
              <span className="text-gray-400 text-sm">/{product.unit}</span>
            )}
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mt-2">
            {product.name}
          </h1>
          {product.origin && (
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {product.origin} 产地直发
              </span>
            </div>
          )}
        </div>

        {/* 数量选择 */}
        <div className="bg-white px-4 py-4 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">数量</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <span className="text-base font-medium w-8 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>
          <div className="text-right mt-2 text-sm text-gray-500">
            小计：
            <span className="text-primary font-semibold text-base">
              ¥{currentPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 规格选择 */}
        {specs.length > 0 && (
          <div className="bg-white px-4 py-4 mt-2">
            <SpecSelector specs={specs} onChange={setSelectedSpecs} />
          </div>
        )}

        {/* 商品详情 */}
        <div className="bg-white px-4 py-4 mt-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">商品详情</h3>
          {product.description ? (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          ) : (
            <p className="text-sm text-gray-400">暂无详情描述</p>
          )}
        </div>
      </main>

      {/* 底部购买栏 */}
      <BuyBar product={product} />
    </div>
  );
}
```

```bash
git add packages/web/src/pages/ && git commit -m "feat(web): 首页 + 商品详情页完整实现"
```

---

以上就是 Part 4 前端基础的全部 7 个 Task。涵盖的技术栈和要点：

| Task | 内容 | 核心依赖 |
|------|------|---------|
| 16 | Vite + React 18 项目初始化 | vite, react 18, react-dom |
| 17 | Tailwind v4 品牌主题 + 6 个自定义动画 | tailwindcss v4, @tailwindcss/vite |
| 18 | React Router v6 路由 + 守卫 | react-router-dom v6 |
| 19 | Axios 实例 + 401 刷新 + 5 个 API 模块 | axios |
| 20 | Zustand 状态管理 (auth/cart/order) | zustand |
| 21 | 9 个可复用 UI 组件 | react, tailwind 品牌色 |
| 22 | 首页 + 商品详情页 | 全部上述依赖 |