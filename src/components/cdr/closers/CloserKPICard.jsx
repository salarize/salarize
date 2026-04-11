import React from 'react';

export default function CloserKPICard({ label, value, sub, accent = 'violet' }) {
  const colors = {
    violet: 'bg-violet-50 border-violet-100 text-violet-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    slate: 'bg-slate-50 border-slate-100 text-slate-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}
