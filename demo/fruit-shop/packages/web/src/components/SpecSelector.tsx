import { useState } from 'react';

interface Spec {
  name: string;
  values: string[];
}

interface SpecSelectorProps {
  specs: Spec[];
  onChange: (selected: Record<string, string>) => void;
}

export function SpecSelector({ specs, onChange }: SpecSelectorProps) {
  const [selected, setSelected] = useState<Record<string, string>>({});

  const handleSelect = (specName: string, value: string) => {
    const next = { ...selected, [specName]: value };
    setSelected(next);
    onChange(next);
  };

  if (specs.length === 0) return null;

  return (
    <div className="space-y-4">
      {specs.map((spec) => (
        <div key={spec.name}>
          <h4 className="text-sm font-medium text-gray-700 mb-2">{spec.name}</h4>
          <div className="flex flex-wrap gap-2">
            {spec.values.map((value) => {
              const isActive = selected[spec.name] === value;
              return (
                <button
                  key={value}
                  onClick={() => handleSelect(spec.name, value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
