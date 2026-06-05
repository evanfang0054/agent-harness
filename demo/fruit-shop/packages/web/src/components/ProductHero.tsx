import { useState } from 'react';

interface ProductHeroProps {
  image: string;
  name: string;
  color: string;
}

export function ProductHero({ image, name, color }: ProductHeroProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-b-[32px]">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${color}22 0%, var(--color-brand-bg) 100%)`,
        }}
      />
      <div className={`flex justify-center px-6 pt-5 pb-4 ${loaded ? 'animate-bounce-in' : ''}`}>
        <img
          src={image}
          alt={name}
          onLoad={() => setLoaded(true)}
          className="w-full h-[280px] object-cover rounded-3xl"
          style={{ boxShadow: `0 8px 32px ${color}33` }}
        />
      </div>
      <div className="flex justify-center gap-1.5 pb-3">
        <div className="w-5 h-1 rounded-sm bg-brand-primary" />
        <div className="w-2 h-1 rounded-sm bg-gray-300" />
        <div className="w-2 h-1 rounded-sm bg-gray-300" />
      </div>
    </div>
  );
}
