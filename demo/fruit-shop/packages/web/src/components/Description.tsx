interface DescriptionProps {
  text?: string;
}

export function Description({ text }: DescriptionProps) {
  if (!text) return null;

  return (
    <div className="px-5 pb-4">
      <div
        className="py-4 px-[18px] rounded-[20px] border-[1.5px]"
        style={{
          background: 'var(--gradient-desc)',
          borderColor: 'color-mix(in srgb, var(--color-brand-peach) 40%, transparent)',
        }}
      >
        <div className="text-sm font-bold text-brand-dark mb-1.5">「水果故事」</div>
        <p className="text-[13.5px] text-brand-muted leading-relaxed m-0">{text}</p>
      </div>
    </div>
  );
}
