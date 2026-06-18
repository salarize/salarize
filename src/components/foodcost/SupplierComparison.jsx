import React, { useState } from 'react';
import VwapBreakdownPanel from './VwapBreakdownPanel';

function SupplierComparison({ articles, priceHistory, suppliers, getVwap }) {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [vwapPanel, setVwapPanel] = useState(null);
  const [search, setSearch] = useState('');

  const filteredArticles = articles.filter(a =>
    a.canonical_name.toLowerCase().includes(search.toLowerCase())
  );

  const rows = selectedArticle
    ? suppliers
        .map(sup => {
          const supRows = priceHistory.filter(h => h.article_id === selectedArticle.id && h.supplier_id === sup.id);
          if (!supRows.length) return null;
          const vwap = getVwap(selectedArticle.id, sup.id);
          const lastDate = supRows.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date;
          const totalQty = supRows.reduce((s, r) => s + (r.quantity_normalized ?? 0), 0);
          return { supplier: sup, vwap, lastDate, totalQty, rows: supRows };
        })
        .filter(Boolean)
        .sort((a, b) => (a.vwap ?? Infinity) - (b.vwap ?? Infinity))
    : [];

  const cheapest = rows[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Article selector */}
        <div className="lg:col-span-1 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Choisir un article</p>
          <input
            className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 mb-3 placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {filteredArticles.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedArticle(a)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                  selectedArticle?.id === a.id
                    ? 'bg-orange-500/20 border border-orange-500/30 text-orange-200'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {a.canonical_name}
                <span className="text-slate-500 text-xs ml-2">/{a.default_unit}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Comparison table */}
        <div className="lg:col-span-2 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4">
          {!selectedArticle ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="text-slate-500 text-sm">Sélectionnez un article pour comparer les fournisseurs.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="text-slate-500 text-sm">Aucune donnée pour cet article.</p>
            </div>
          ) : (
            <>
              <h3 className="text-white font-bold mb-4">
                {selectedArticle.canonical_name}
                <span className="text-slate-400 font-normal text-sm ml-2">— comparaison par {selectedArticle.default_unit}</span>
              </h3>
              <div className="space-y-3">
                {rows.map(({ supplier, vwap, lastDate, totalQty, rows: supRows }, i) => {
                  const isCheapest = i === 0;
                  return (
                    <div
                      key={supplier.id}
                      className={`flex items-center gap-4 p-3 rounded-xl border ${
                        isCheapest
                          ? 'border-green-500/30 bg-green-500/5'
                          : 'border-slate-700/50 bg-slate-800/20'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-slate-200 font-semibold text-sm">{supplier.name}</p>
                          {isCheapest && (
                            <span className="text-[10px] font-bold text-green-400 bg-green-500/15 px-1.5 py-0.5 rounded-full">MOINS CHER</span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                          Dernière facture: {lastDate ? new Date(lastDate).toLocaleDateString('fr-BE') : '—'}
                          {' · '}{totalQty.toFixed(2)} {selectedArticle.default_unit} acheté(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <button
                          className="flex items-center gap-1 font-bold text-base hover:opacity-80 transition-opacity"
                          style={{ color: isCheapest ? '#4ade80' : '#e2e8f0' }}
                          onClick={() => setVwapPanel({ article: selectedArticle, rows: supRows })}
                        >
                          {vwap?.toFixed(3) ?? '—'} €/{selectedArticle.default_unit}
                          <span className="text-slate-400 text-xs font-normal">ⓘ</span>
                        </button>
                        {i > 0 && cheapest?.vwap && vwap && (
                          <p className="text-red-400 text-xs mt-0.5">
                            +{(((vwap - cheapest.vwap) / cheapest.vwap) * 100).toFixed(1)}% vs {cheapest.supplier.name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {vwapPanel && (
        <VwapBreakdownPanel
          article={vwapPanel.article}
          rows={vwapPanel.rows}
          onClose={() => setVwapPanel(null)}
        />
      )}
    </div>
  );
}

export default SupplierComparison;
