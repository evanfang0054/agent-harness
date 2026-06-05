import type { Category } from 'shared';

interface CategoryTabsProps {
  categories: Category[];
  activeId?: number;
  onChange: (categoryId?: number) => void;
}

export function CategoryTabs({ categories, activeId, onChange }: CategoryTabsProps) {
  const allTab = { id: undefined, name: '全部', icon: '🍽️' };

  const tabs = [
    allTab,
    ...categories.map((cat) => ({ id: cat.id, name: cat.name, icon: cat.icon || '🏷️' })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <div
            key={tab.id ?? 'all'}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold cursor-pointer transition-all duration-200 ${
              isActive
                ? 'bg-brand-primary text-white shadow-md'
                : 'bg-white text-brand-dark border border-brand-border'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.name}
          </div>
        );
      })}
    </div>
  );
}
