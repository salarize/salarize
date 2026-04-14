import { useRelativeTime } from '../../hooks/useRelativeTime';

export function LastUpdatedBadge({ date, className = '' }) {
  const label = useRelativeTime(date);
  if (!label) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] text-slate-400 ${className}`}>
      <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth="2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
      </svg>
      Donnees {label}
    </span>
  );
}

