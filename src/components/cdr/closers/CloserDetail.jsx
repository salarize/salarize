import React from 'react';
import CloserDealsTable from './CloserDealsTable';

function fmt(val) {
  return Number(val || 0).toLocaleString('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function CloserDetail({ closer, records, onBack }) {
  const myRecords = records.filter(r => r.closer_name === closer);
  const total = myRecords.reduce((s, r) => s + Number(r.amount || 0), 0);
  const avg = myRecords.length ? (total / myRecords.length) : 0;

  // Monthly breakdown
  const byMonth = {};
  myRecords.forEach(r => {
    const m = r.closing_date?.slice(0, 7) || 'Inconnu';
    if (!byMonth[m]) byMonth[m] = { closings: 0, amount: 0 };
    byMonth[m].closings++;
    byMonth[m].amount += Number(r.amount || 0);
  });

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour aux closers
      </button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-bold">
          {(closer || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{closer}</h2>
          <p className="text-sm text-slate-500">{myRecords.length} deals closés</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total closings', value: myRecords.length },
          { label: 'Total facturé', value: `${fmt(total)} €` },
          { label: 'Prix moyen', value: `${fmt(avg)} €` },
          { label: 'Dernier closing', value: myRecords.map(r => r.closing_date).filter(Boolean).sort().reverse()[0] || '—' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{kpi.label}</p>
            <p className="text-xl font-bold text-slate-800">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly breakdown */}
      {Object.keys(byMonth).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Activité mensuelle</h3>
          <div className="space-y-2">
            {Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)).map(([month, data]) => (
              <div key={month} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-20 flex-shrink-0">{month}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (data.closings / Math.max(...Object.values(byMonth).map(d => d.closings))) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700 w-12 text-right">{data.closings} deals</span>
                <span className="text-xs text-slate-500 w-24 text-right">{fmt(data.amount)} €</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deals */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Liste des clients closés</h3>
        <CloserDealsTable records={myRecords} />
      </div>
    </div>
  );
}
