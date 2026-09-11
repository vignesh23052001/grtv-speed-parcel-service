import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-ink-100 flex items-center justify-center text-ink-400 mb-3">
        {icon}
      </div>
      <p className="font-semibold text-ink-700">{title}</p>
      <p className="text-sm text-ink-400 mt-1 max-w-xs">{desc}</p>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 gap-2 text-ink-400">
      <div className="w-4 h-4 border-2 border-ink-200 border-t-brand-500 rounded-full animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Toast({ show, kind, children }: { show: boolean; kind: 'success' | 'error' | 'info'; children: ReactNode }) {
  if (!show) return null;
  const colors = {
    success: 'bg-success-600',
    error: 'bg-danger-600',
    info: 'bg-brand-600',
  };
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${colors[kind]} text-white px-4 py-3 rounded-xl shadow-card-hover text-sm font-medium animate-slide-up`}>
      {children}
    </div>
  );
}

export interface SelectOption { value: string; label: string; }

/**
 * Fully custom-styled dropdown to replace native <select>. Native selects
 * hand rendering of the open dropdown to the OS/browser on mobile — that
 * popup can't be styled and looks jarringly out of place next to the rest
 * of the app. This renders and positions the option list ourselves so it
 * matches the app's design on every device.
 */
export function Select({
  value, onChange, options, placeholder = 'Select…', className = '', triggerClassName, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  className?: string;
  /** Fully replaces the default trigger button styling (base `.input` look) — use for contexts that need a custom appearance, e.g. a colored banner. */
  triggerClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const normalized: SelectOption[] = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const selected = normalized.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName ?? 'input flex items-center justify-between text-left disabled:opacity-60 disabled:cursor-not-allowed'}
      >
        <span className={`truncate ${selected ? '' : 'text-ink-400'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-ink-400 shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 w-full max-h-64 overflow-y-auto bg-white rounded-xl shadow-elevated border border-ink-100 p-1.5 animate-slide-up">
          {normalized.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${o.value === value ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-700 hover:bg-ink-50'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
