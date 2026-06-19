import { useState, useEffect, useRef } from 'react';
import { productApi } from '@/api/product';

interface SearchBarProps {
  onSearch: (keyword: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export function SearchBar({
  onSearch,
  placeholder = '搜索水果、产地...',
  initialValue = '',
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const hideDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
      if (hideDebounceRef.current) clearTimeout(hideDebounceRef.current);
    };
  }, []);

  const fetchSuggestions = (text: string) => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    suggestDebounceRef.current = setTimeout(async () => {
      const trimmed = text.trim();
      if (!trimmed) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await productApi.suggest(trimmed, 10);
        setSuggestions(res.data.data?.list || []);
        setShowSuggest(true);
      } catch {
        // 静默
      }
    }, 300);
  };

  const handleChange = (text: string) => {
    setValue(text);
    fetchSuggestions(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(text);
    }, 400);
  };

  const handleFocus = () => {
    if (value.trim() && suggestions.length > 0) {
      setShowSuggest(true);
    }
  };

  const handleBlur = () => {
    hideDebounceRef.current = setTimeout(() => setShowSuggest(false), 200);
  };

  const pickSuggestion = (name: string) => {
    if (hideDebounceRef.current) clearTimeout(hideDebounceRef.current);
    setValue(name);
    setShowSuggest(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearch(name);
  };

  return (
    <div className="px-4 py-2 relative">
      <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 border border-brand-border">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-brand-muted"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-brand-dark placeholder-brand-muted outline-none"
        />
      </div>

      {showSuggest && suggestions.length > 0 && (
        <div className="absolute left-4 right-4 mt-1 bg-white rounded-2xl border border-brand-border overflow-hidden shadow-sm z-50">
          {suggestions.map((name, i) => (
            <button
              key={`${name}-${i}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pickSuggestion(name);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-brand-dark hover:bg-brand-bg transition-colors border-b border-brand-border/50 last:border-b-0"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
