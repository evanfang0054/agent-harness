import { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  alt?: string | null;
  size?: number;
}

/**
 * 头像组件：src 为空或加载失败时显示 alt 首字（无则 🍊 emoji）
 */
export function Avatar({ src, alt, size = 56 }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const showFallback = !src || errored;
  const initial = (alt ?? '').trim().charAt(0).toUpperCase();

  if (showFallback) {
    return (
      <div
        className="rounded-full border border-brand-border bg-brand-peach flex items-center justify-center text-brand-primary font-bold"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial || '🍊'}
      </div>
    );
  }

  return (
    <img
      src={src!}
      alt={alt ?? 'avatar'}
      onError={() => setErrored(true)}
      className="rounded-full border border-brand-border object-cover"
      style={{ width: size, height: size }}
    />
  );
}
