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

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const { data } = await productApi.getDetail(Number(id));
        setProduct(data.data!);
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

  const images = (product as Product & { images?: string[] }).images?.length
    ? (product as Product & { images?: string[] }).images!
    : ['/placeholder-fruit.png'];
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
            <SpecSelector specs={specs} onChange={() => {}} />
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
