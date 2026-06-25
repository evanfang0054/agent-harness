import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonVariant = 'ghost' | 'solid';
type IconButtonShape = 'circle' | 'square';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  shape?: IconButtonShape;
  size?: IconButtonSize;
  children: ReactNode;
}

const SIZE_DIM: Record<IconButtonSize, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
};

const SHAPE_CLASS: Record<IconButtonShape, string> = {
  circle: 'rounded-full',
  square: 'rounded-xl',
};

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  ghost: 'bg-brand-btn-bg text-brand-dark hover:bg-brand-bg',
  solid: 'bg-brand-primary text-white',
};

export function IconButton({
  variant = 'ghost',
  shape = 'circle',
  size = 'md',
  className = '',
  children,
  ...rest
}: IconButtonProps) {
  const classes = [
    'flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 disabled:active:scale-100',
    SIZE_DIM[size],
    SHAPE_CLASS[shape],
    VARIANT_CLASS[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
