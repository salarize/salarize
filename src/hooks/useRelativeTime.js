import { useEffect, useMemo, useState } from 'react';

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function useRelativeTime(date) {
  const normalizedDate = useMemo(() => toDate(date), [date]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!normalizedDate) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, [normalizedDate]);

  const label = useMemo(() => {
    if (!normalizedDate) return '';
    const diffMs = now - normalizedDate.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "a l'instant";
    if (diffMin === 1) return 'il y a 1 min';
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    return `il y a ${diffH}h`;
  }, [normalizedDate, now]);

  return label;
}
