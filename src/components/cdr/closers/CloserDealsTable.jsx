import React, { useState } from 'react';

function fmt(val) {
  return Number(val || 0).toLocaleString('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function CloserDealsTable({ records }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('closing_date');
  const [sortDir, setSortDir] = useState('desc');

  const filtered = records
    .filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (r.closer_name || '').toLowerCase().includes(q) || (r.client_name || '').toLowerCase().includes(q) || (r.product_sold || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let va = a[sortCol] || '';
      let vb = b[sortCol] || '';
      if (sortCol === 'amount') { va = Number(va); vb = Number(vb); }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const toggle = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const th = (col, label) => (
    <th
      onClick={() => toggle(col)}
      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-slate-600 transition-colors select-none"
    >
      {label} {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  // Detect recurring clients
  const clientCounts = {};
  records.forEach(r => { if (r.client_name) clientCounts[r.client_name] = (clientCounts[r.client_name] || 0) + 1; });

  const exportCSV = () => {
    const rows = [['Client', 'Closer', 'Date', 'Produit', 'Montant']];
    filtered.forEach(r => rows.push([r.client_name, r.closer_name, r.closing_date, r.product_sold, r.amount]));
    const csv = rows.map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'deals_closers.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher client, closer, produit..."
          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-violet-400"
        />
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {th('client_name', 'Client')}
              {th('closer_name', 'Closer')}
              {th('closing_date', 'Date')}
              {th('product_sold', 'Produit')}
              {th('amount', 'Montant')}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-sm">Aucun deal trouvé</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-violet-50/30 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-800 font-medium">
                  {r.client_name}
                  {clientCounts[r.client_name] > 1 && (
                    <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Client récurrent</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{r.closer_name}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{r.closing_date || '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{r.product_sold || '—'}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800 text-right">{fmt(r.amount)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
