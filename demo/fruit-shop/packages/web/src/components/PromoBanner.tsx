export function PromoBanner() {
  return (
    <div className="px-4 py-3">
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #FF6B35 0%, #FF7675 50%, #F7C948 100%)',
        }}
      >
        <div className="px-6 py-5 relative z-10">
          <div className="text-white/80 text-xs font-semibold tracking-wider mb-1">
            限时特惠
          </div>
          <div className="text-white text-xl font-black leading-tight">
            新人首单立减 ¥10
          </div>
          <div className="text-white/70 text-xs mt-1">满 49 元可用 · 今日有效</div>
          <div className="mt-3 inline-block px-4 py-1.5 bg-white rounded-full text-brand-primary text-xs font-bold cursor-pointer">
            立即领取 →
          </div>
        </div>
        {/* 装饰圆 */}
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute right-8 -bottom-6 w-20 h-20 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
