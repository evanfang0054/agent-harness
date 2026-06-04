import { useState, useEffect, useCallback } from 'react';
import { productApi, type ProductQuery } from '@/api/product';
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
  { id: 1, name: '热带水果', icon: '🌴', sortOrder: 1 },
  { id: 2, name: '柑橘类', icon: '🍊', sortOrder: 2 },
  { id: 3, name: '浆果类', icon: '🫐', sortOrder: 3 },
  { id: 4, name: '瓜类', icon: '🍉', sortOrder: 4 },
  { id: 5, name: '进口水果', icon: '✈️', sortOrder: 5 },
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

        const response = await productApi.getList(params);
        const items = response.data.list;

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
