import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { favoriteApi } from '@/api/favorite';
import type { FavoriteWithProduct } from 'shared';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Toast } from '@/components/Toast';

const PAGE_SIZE = 10;

export default function Favorites() {
  const navigate = useNavigate();
  const [list, setList] = useState<FavoriteWithProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchPage = async (targetPage: number) => {
    setLoading(true);
    try {
      const { data } = await favoriteApi.getList({
        page: targetPage,
        limit: PAGE_SIZE,
      });
      const payload = data.data;
      setList(payload?.list ?? []);
      setTotal(payload?.total ?? 0);
      setPage(targetPage);
    } catch {
      Toast.show('加载收藏失败', 'error');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleRemove = async (fav: FavoriteWithProduct) => {
    if (!fav.product) return;
    setRemovingId(fav.id);
    try {
      await favoriteApi.remove(fav.product.id);
      Toast.show('已取消收藏', 'info');
      // 当前页若已空且非首页则回退一页
      if (list.length === 1 && page > 1) {
        fetchPage(page - 1);
      } else {
        fetchPage(page);
      }
    } catch {
      Toast.show('操作失败', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-brand-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-brand-dark">
            我的收藏
            {total > 0 && (
              <span className="ml-1 text-[13px] text-brand-muted font-medium">
                ({total})
              </span>
            )}
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 mt-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner size="lg" />
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-border p-8 text-center">
            <p className="text-sm text-brand-muted">还没有收藏任何商品</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 rounded-full bg-gradient-to-br from-brand-primary to-brand-coral text-white text-sm font-bold"
            >
              去逛逛
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {list.map((fav) => {
              const product = fav.product;
              if (!product) {
                return (
                  <div
                    key={fav.id}
                    className="bg-white rounded-2xl border border-brand-border p-4 text-[12px] text-brand-muted"
                  >
                    商品已下架
                  </div>
                );
              }
              return (
                <div
                  key={fav.id}
                  className="bg-white rounded-3xl border border-brand-border overflow-hidden flex flex-col"
                >
                  <div
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="cursor-pointer"
                  >
                    <img
                      src={product.image || '/placeholder-fruit.png'}
                      alt={product.name}
                      className="w-full h-[140px] object-cover"
                    />
                    <div className="p-3">
                      <p className="text-[14px] font-bold text-brand-dark line-clamp-1">
                        {product.name}
                      </p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xs text-brand-primary font-bold">
                          ¥
                        </span>
                        <span className="text-lg font-extrabold text-brand-primary font-display leading-none">
                          {product.price}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => handleRemove(fav)}
                      disabled={removingId === fav.id}
                      className="w-full py-1.5 text-[12px] rounded-full border border-brand-border text-brand-muted hover:text-brand-coral hover:border-brand-coral disabled:opacity-50 transition-colors"
                    >
                      {removingId === fav.id ? '处理中...' : '取消收藏'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => fetchPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-[12px] rounded-full border border-brand-border text-brand-dark disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-[12px] text-brand-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => fetchPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-[12px] rounded-full border border-brand-border text-brand-dark disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
