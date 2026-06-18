import type { Product } from 'shared';

interface RecommendFruitsProps {
  items: Product[];
  onClick: (id: number) => void;
}

export function RecommendFruits({ items, onClick }: RecommendFruitsProps) {
  if (items.length === 0) return null;

  return (
    <div className="px-5 pb-6">
      <div className="text-[15px] font-bold text-brand-dark mb-3">你可能还喜欢</div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {items.map((fruit) => (
          <div
            key={fruit.id}
            onClick={() => onClick(fruit.id)}
            className="min-w-[140px] rounded-[20px] bg-brand-card border-[1.5px] border-brand-border overflow-hidden cursor-pointer shrink-0 hover:scale-[1.02] transition-transform"
          >
            <img
              src={fruit.image || '/placeholder-fruit.png'}
              alt={fruit.name}
              className="w-full h-[100px] object-cover"
            />
            <div className="py-2.5 px-3">
              <div className="text-[13px] font-bold text-brand-dark">{fruit.name}</div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[11px] text-brand-primary font-bold">¥</span>
                <span className="text-lg font-extrabold text-brand-primary font-display">
                  {fruit.price}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
