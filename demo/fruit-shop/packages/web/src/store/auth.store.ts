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
          const { accessToken, refreshToken, user } = resData.data!;
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
          const { accessToken, refreshToken, user } = resData.data!;
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
          set({ user: data.data! });
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
