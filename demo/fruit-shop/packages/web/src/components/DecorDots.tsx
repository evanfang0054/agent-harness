export function DecorDots() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-[60px] -right-[40px] w-40 h-40 rounded-full bg-brand-peach/30" />
      <div className="absolute top-[200px] -left-5 w-20 h-20 rounded-full bg-brand-secondary/25" />
      <div className="animate-spin-slow absolute bottom-[300px] -right-[15px] w-[60px] h-[60px]">
        <div className="absolute top-0 left-[25px] w-2.5 h-2.5 rounded-full bg-brand-coral/40" />
        <div className="absolute bottom-0 left-2.5 w-2 h-2 rounded-full bg-brand-green/40" />
        <div className="absolute bottom-[5px] right-[5px] w-1.5 h-1.5 rounded-full bg-brand-accent/40" />
      </div>
    </div>
  );
}
