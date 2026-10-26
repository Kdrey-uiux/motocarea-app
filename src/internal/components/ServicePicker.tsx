import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Wrench } from '../../components/icons';
import { SERVICE_CATEGORIES, type UnifiedServicePackage } from '../../utils/serviceCatalog';

interface ServicePickerProps {
  id: string;
  services: UnifiedServicePackage[];
  /** The selected service title ('' = none) */
  value: string;
  onChange: (title: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
}

const serviceTitle = (s: UnifiedServicePackage) => s.title || s.name;

/**
 * Service field for staff forms: a button that opens an inline list (inside the form, so it
 * is never cut off on phones) with search and category headings.
 */
export default function ServicePicker({ id, services, value, onChange, onBlur, invalid, describedBy }: ServicePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = services.find((s) => serviceTitle(s) === value);

  // Category headings in the same order as the booking screen
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = services.filter(
      (s) => !q || serviceTitle(s).toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
    );
    return SERVICE_CATEGORIES.filter((c) => c.id !== 'all')
      .map((c) => ({ label: c.label, items: matches.filter((s) => s.category === c.id) }))
      .concat([{ label: 'Other', items: matches.filter((s) => !SERVICE_CATEGORIES.some((c) => c.id === s.category)) }])
      .filter((g) => g.items.length > 0);
  }, [services, query]);

  // Close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onBlur]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const choose = (title: string) => {
    onChange(title);
    setOpen(false);
    setQuery('');
    onBlur?.();
    document.getElementById(id)?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.preventDefault();
            setOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`w-full flex items-center gap-3 bg-white border rounded-xl pl-3 pr-3 py-2.5 text-left transition cursor-pointer focus:outline-none focus:ring-4 ${
          invalid
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
            : open
              ? 'border-orange-500 ring-4 ring-orange-500/10'
              : 'border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-orange-500/10'
        }`}
      >
        <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
          <Wrench className="w-4 h-4" />
        </span>
        <span className="min-w-0 flex-1">
          {selected ? (
            <span className="block text-sm font-semibold text-slate-900 leading-snug line-clamp-2">{serviceTitle(selected)}</span>
          ) : (
            <span className="block text-sm text-slate-400">Choose a service</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="mt-2 bg-white border border-slate-200/80 rounded-2xl card-elevated overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
              document.getElementById(id)?.focus();
            }
          }}
        >
          <div className="p-2 border-b border-slate-100">
            <span className="relative block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services"
                autoComplete="off"
                className="w-full bg-slate-50 border border-transparent rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition"
              />
            </span>
          </div>

          <div role="listbox" aria-label="Services" className="max-h-72 overflow-y-auto overscroll-contain py-1">
            {groups.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No service matches “{query.trim()}”.</p>
            )}
            {groups.map((group) => (
              <div key={group.label} className="py-1">
                <p className="px-4 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                {group.items.map((s) => {
                  const title = serviceTitle(s);
                  const isSelected = title === value;
                  return (
                    <button
                      key={s.id || title}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => choose(title)}
                      className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition cursor-pointer ${
                        isSelected ? 'bg-orange-50' : 'hover:bg-slate-50 focus:bg-slate-50 focus:outline-none'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm leading-snug ${isSelected ? 'font-semibold text-orange-700' : 'font-medium text-slate-800'}`}>
                          {title}
                        </span>
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
