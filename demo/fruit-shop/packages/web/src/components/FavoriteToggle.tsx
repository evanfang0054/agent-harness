import { useState, useEffect } from 'react';
import { favoriteApi } from '@/api/favorite';
import { useAuthStore } from '@/store/auth.store';
import { Toast } from '@/components/Toast';

interface FavoriteToggleProps {
  productId: number;
  size?: number;
}

/**
 * 心形收藏切换按钮。已登录时初始化状态并调用 add/remove；
 * 未登录时点击提示并跳转登录。
 */
export function FavoriteToggle({ productId, size = 22 }: FavoriteToggleProps) {
  const token = useAuthStore((s) => s.token);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    favoriteApi
      .getStatus(productId)
      .then((res) => {
        if (cancelled) return;
        setFavorited(Boolean(res.data.data?.favorited));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [productId, token]);

  const handleToggle = async () => {
    if (!token) {
      Toast.show('请先登录', 'warning');
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      if (favorited) {
        await favoriteApi.remove(productId);
        setFavorited(false);
        Toast.show('已取消收藏', 'info');
      } else {
        await favoriteApi.add(productId);
        setFavorited(true);
        Toast.show('已加入收藏', 'success');
      }
    } catch {
      Toast.show('操作失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-label={favorited ? '取消收藏' : '加入收藏'}
      className="flex items-center justify-center disabled:opacity-50 transition-transform active:scale-90"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={favorited ? '#E84393' : 'none'}
        stroke={favorited ? '#E84393' : '#2D3436'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    </button>
  );
}
