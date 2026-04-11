import React, { useState } from 'react';
import CloserKPICard from './CloserKPICard';
import CloserDetail from './CloserDetail';
import CloserDealsTable from './CloserDealsTable';

function fmt(val) {
  return Number(val || 0).toLocaleString('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function groupByCloser(records) {
  const map = {};
  records.forEach(r => {
    const name = r.closer_name || 'Inconnu';
    if (!map[name]) map[name] = { name, closings: 0, total: 0, records: [] };
    map[name].closings++;
    map[name].total += Number(r.amount || 0);
    map[name].records.push(r);
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

export default function ClosersDashboard({ records, invoicesPending }) {
  const [selected, setSelected] = useState(null); // closer name
  const [activeTab, setActiveTab] = useState('closers'); // 'closers' | 'deals'
  const [search, setSearch] = useState('');

  const closers = groupByCloser(records);
  const totalClosings = records.length;
  const totalAmount = records.reduce((s, r) => s + Number(r.amount || 0), 0);
  const avgAmount = totalClosings ? (totalAmount / totalClosings) : 0;
  const topCloser = closers[0]?.name || '—';

  if (selected) {
    return (
      <CloserDetail
        closer={selected}
        records={records}
        onBack={() => setSelected(null)}
      />
    );
  }

  const filtered = closers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <CloserKPICard label="Closings totaux" value={totalClosings} accent="violet" />
        <CloserKPICard label="Facturé total" value={`${fmt(totalAmount)} €`} accent="emerald" />
        <CloserKPICard label="Prix moyen / closing" value={`${fmt(avgAmount)} €`} accent="amber" />
        <CloserKPICard label="Top closer" value={topCloser} sub={closers[0] ? `${closers[0].closings} deals` : ''} accent="slate" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-1">
        {[['closers', 'Vue par closer'], ['deals', 'Tous les deals']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'deals' ? (
        <CloserDealsTable records={records} />
      ) : (
        <>
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un closer..."
            className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-violet-400"
          />

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Closer</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Closings</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Total facturé</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Prix moyen</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-sm font-medium text-slate-400">Aucun closer pour le moment</p>
                        <p className="text-xs text-slate-300">Injectez des factures closers pour voir leur performance ici</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((c, i) => {
                  const avg = c.closings ? (c.total / c.closings) : 0;
                  const lastRecord = c.records.map(r => r.closing_date).filter(Boolean).sort().reverse()[0];
                  const daysSinceLast = lastRecord ? Math.floor((Date.now() - new Date(lastRecord)) / 86400000) : null;
                  const isInactive = daysSinceLast !== null && daysSinceLast > 60;
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-violet-50/30 transition-colors cursor-pointer" onClick={() => setSelected(c.name)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">{c.closings}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">{fmt(c.total)} €</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-500">{fmt(avg)} €</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${isInactive ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-700'}`}>
                          {isInactive ? 'Inactif' : 'Actif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pending invoices warning */}
      {invoicesPending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-700 font-medium">
            {invoicesPending} facture{invoicesPending > 1 ? 's' : ''} en attente de validation — les données closers peuvent être incomplètes
          </p>
        </div>
      )}
    </div>
  );
}
