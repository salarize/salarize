import React from 'react';

function VwapBreakdownPanel({ article, rows, onClose }) {
  if (!article || !rows?.length) return null;

  const totalQty = rows.reduce((s, r) => s + (r.quantity_normalized ?? 0), 0);
  const totalCost = rows.reduce((s, r) => s + (r.quantity_normalized ?? 0) * (r.price_per_normalized_unit ?? 0), 0);
  const vwap = totalQty > 0 ? totalCost / totalQty : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="text-white font-bold text-base">{article.canonical_name}</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Prix pondéré par volume — {rows.length} achat{rows.length > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="pb-2 font-semibold">Fournisseur</th>
                <th className="pb-2 font-semibold text-right">Date</th>
                <th className="pb-2 font-semibold text-right">Qté ({article.default_unit})</th>
                <th className="pb-2 font-semibold text-right">Prix/{article.default_unit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((r, i) => (
                <tr key={i} className="text-slate-300">
                  <td className="py-2">{r.food_suppliers?.name ?? '—'}</td>
                  <td className="py-2 text-right text-slate-400 text-xs">
                    {r.date ? new Date(r.date).toLocaleDateString('fr-BE', { month: 'short', year: '2-digit' }) : '—'}
                  </td>
                  <td className="py-2 text-right">{r.quantity_normalized?.toFixed(2) ?? '—'}</td>
                  <td className="py-2 text-right">{r.price_per_normalized_unit?.toFixed(3) ?? '—'} €</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-600 text-white font-bold">
                <td className="pt-3" colSpan={2}>Moyenne pondérée</td>
                <td className="pt-3 text-right">{totalQty.toFixed(2)}</td>
                <td className="pt-3 text-right text-orange-400">{vwap?.toFixed(3) ?? '—'} €</td>
              </tr>
            </tfoot>
          </table>

          <p className="mt-4 text-slate-500 text-xs leading-relaxed">
            La moyenne pondérée donne plus de poids aux achats en grande quantité. Un achat de 5 kg influence davantage le prix moyen qu'un achat de 1 kg.
          </p>
        </div>
      </div>
    </div>
  );
}

export default VwapBreakdownPanel;
