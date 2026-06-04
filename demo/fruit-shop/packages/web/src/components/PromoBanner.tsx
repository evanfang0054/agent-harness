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
