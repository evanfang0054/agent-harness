interface QualityInfoProps {
  sweetness?: string;
  weight?: string;
}

export function QualityInfo({ sweetness, weight }: QualityInfoProps) {
  const items = [
    { icon: '🍬', label: '甜度', value: sweetness || '暂无' },
    { icon: '⚖️', label: '规格', value: weight || '暂无' },
    { icon: '🚚', label: '配送', value: '顺丰冷链' },
    { icon: '🛡️', label: '保障', value: '坏果包赔' },
  ];

  return (
    <div className="px-5 pb-4">
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((item, i) => (
          <div
            key={i}
            className="py-3 px-3.5 rounded-2xl bg-brand-card border-[1.5px] border-brand-border flex items-center gap-2.5"
          >
            <span className="text-xl">{item.icon}</span>
            <div>
              <div className="text-[11px] text-brand-muted font-medium">{item.label}</div>
              <div className="text-[13px] font-bold text-brand-dark mt-px">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
