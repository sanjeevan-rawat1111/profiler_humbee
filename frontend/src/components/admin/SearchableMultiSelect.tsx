import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, ChevronDown, Check, Loader2 } from 'lucide-react';

interface SearchableMultiSelectProps {
  label: string;
  placeholder?: string;
  options?: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  loadOptions?: (query: string) => Promise<string[]>;
}

const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  label,
  placeholder = 'Type to search...',
  options = [],
  selected,
  onChange,
  disabled = false,
  loadOptions,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [asyncOptions, setAsyncOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const fetchAsyncOptions = useCallback(async (searchQuery: string) => {
    if (!loadOptions) return;
    const requestId = ++requestIdRef.current;
    setLoadingOptions(true);
    try {
      const results = await loadOptions(searchQuery);
      if (requestId === requestIdRef.current) {
        setAsyncOptions(results);
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setAsyncOptions([]);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingOptions(false);
      }
    }
  }, [loadOptions]);

  useEffect(() => {
    if (!loadOptions || !open) return;
    const timer = window.setTimeout(() => {
      void fetchAsyncOptions(query);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadOptions, open, query, fetchAsyncOptions]);

  const sourceOptions = loadOptions ? asyncOptions : options;

  const filteredOptions = useMemo(() => {
    const available = sourceOptions.filter((opt) => !selected.includes(opt));
    if (loadOptions) return available;
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((opt) => opt.toLowerCase().includes(q));
  }, [sourceOptions, selected, query, loadOptions]);

  const allVisibleSelected = filteredOptions.length > 0
    && filteredOptions.every((opt) => selected.includes(opt));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
    setQuery('');
    inputRef.current?.focus();
  };

  const removeChip = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  const selectAllVisible = () => {
    const merged = [...new Set([...selected, ...filteredOptions])];
    onChange(merged);
    setQuery('');
  };

  const clearAll = () => {
    onChange([]);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative min-w-[220px] flex-1">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
        {label}
      </label>
      <div
        className={`min-h-[42px] flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 bg-white border rounded-xl transition-colors ${
          open ? 'border-humbee-500 ring-2 ring-humbee-100' : 'border-slate-200'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text'}`}
        onClick={() => {
          if (!disabled) {
            setOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        {selected.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-humbee-50 text-humbee-800 border border-humbee-100 rounded-md text-xs font-semibold"
          >
            {item}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeChip(item); }}
              className="hover:text-red-600 transition-colors cursor-pointer"
              aria-label={`Remove ${item}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={selected.length ? '+ Add more' : placeholder}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 min-w-[80px] border-0 outline-none text-xs text-slate-700 bg-transparent py-0.5"
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); inputRef.current?.focus(); }}
          className="ml-auto text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={selectAllVisible}
              disabled={filteredOptions.length === 0 || allVisibleSelected}
              className="text-[11px] font-semibold text-humbee-700 hover:text-humbee-900 disabled:text-slate-300 cursor-pointer disabled:cursor-not-allowed"
            >
              Select All
            </button>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-semibold text-slate-500 hover:text-red-600 cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {loadingOptions ? (
              <li className="px-3 py-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Searching...
              </li>
            ) : filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400">No matches found</li>
            ) : (
              filteredOptions.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => toggleOption(option)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-humbee-50 cursor-pointer"
                  >
                    <span className="font-medium">{option}</span>
                    {selected.includes(option) && <Check className="w-3.5 h-3.5 text-humbee-600" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableMultiSelect;
