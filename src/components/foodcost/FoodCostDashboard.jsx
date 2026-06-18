import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import VwapBreakdownPanel from './VwapBreakdownPanel';
import { exportSupplierComparisonToXlsx } from '../../utils/foodExport';

function KpiCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function FoodCostDashboard({ articles, priceHistory, suppliers, getVwap, topArticlesBySpend, confirmedOnly, onToggleConfirmed }) {
  const [vwapPanel, setVwapPanel] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const totalSpendYtd = priceHistory
    .filter(h => new Date(h.date).getFullYear() === new Date().getFullYear())
    .reduce((s, h) => s + (h.quantity_normalized ?? 0) * (h.price_per_normalized_unit ?? 0), 0);

  const top = topArticlesBySpend(10);

  const chartData = selectedArticle
    ? (() => {
        const rows = priceHistory
          .filter(h => h.article_id === selectedArticle.id)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        const byMonth = {};
        for (const r of rows) {
          const key = r.date?.slice(0, 7);
          if (!key) continue;
          if (!byMonth[key]) byMonth[key] = {};
          const supName = r.food_suppliers?.name ?? 'Inconnu';
          byMonth[key][supName] = r.price_per_normalized_unit;
        }
        return Object.entries(byMonth).map(([month, vals]) => ({ month, ...vals }));
      })()
    : [];

  const chartSuppliers = selectedArticle
    ? [...new Set(priceHistory.filter(h => h.article_id === selectedArticle.id).map(h => h.food_suppliers?.name ?? 'Inconnu'))]
    : [];

  const COLORS = ['#f97316', '#60a5fa', '#34d399', '#a78bfa', '#fb7185'];

  function handleExportTop() {
    if (!top.length) return;
    const rows = top.map(({ article, spend, vwap }) => ({
      article: article.canonical_name,
      category: article.category,
      unit: article.default_unit,
      vwap_eur: vwap,
      spend_ytd_eur: spend,
    }));
    exportSupplierComparisonToXlsx(rows, 'Top articles par dépense', 'food_top_articles.xlsx');
  }

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleConfirmed}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
              confirmedOnly
                ? 'bg-green-500/20 border-green-500/30 text-green-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${confirmedOnly ? 'bg-green-400' : 'bg-amber-400'}`} />
            {confirmedOnly ? 'Données confirmées uniquement' : 'Toutes les données (incl. non confirmées)'}
          </button>
        </div>
        <button
          onClick={handleExportTop}
          disabled={!top.length}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm rounded-xl transition-colors disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter top articles
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Coût food YTD"
          value={`${totalSpendYtd.toLocaleString('fr-BE', { maximumFractionDigits: 0 })} €`}
          sub={confirmedOnly ? 'Données confirmées' : 'Toutes données'}
          color="text-orange-400"
        />
        <KpiCard
          label="Fournisseurs actifs"
          value={suppliers.length}
          sub="Avec au moins 1 facture"
        />
        <KpiCard
          label="Articles suivis"
          value={articles.length}
          sub="Dans le catalogue"
        />
        <KpiCard
          label="Lignes de prix"
          value={priceHistory.length}
          sub="Dans l'historique"
          color="text-slate-300"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top articles */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4">Top articles par dépense</h3>
          {top.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Aucune donnée — importez des factures pour commencer.</p>
          ) : (
            <div className="space-y-3">
              {top.map(({ article, spend, vwap }, i) => (
                <div
                  key={article.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/30 rounded-xl p-2 -mx-2 transition-colors"
                  onClick={() => setSelectedArticle(article)}
                >
                  <span className="text-slate-600 text-sm font-bold w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-semibold truncate">{article.canonical_name}</p>
                    <p className="text-slate-500 text-xs">{article.category} · {article.default_unit}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white text-sm font-bold">{spend.toLocaleString('fr-BE', { maximumFractionDigits: 0 })} €</p>
                    <button
                      className="flex items-center gap-1 text-orange-400 text-xs hover:text-orange-300"
                      onClick={e => {
                        e.stopPropagation();
                        const rows = priceHistory.filter(h => h.article_id === article.id);
                        setVwapPanel({ article, rows });
                      }}
                    >
                      {vwap?.toFixed(3)} €/{article.default_unit} ⓘ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price history chart */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold">Évolution des prix</h3>
            {selectedArticle && (
              <button onClick={() => setSelectedArticle(null)} className="text-xs text-slate-400 hover:text-slate-200">
                ✕ {selectedArticle.canonical_name}
              </button>
            )}
          </div>
          {!selectedArticle ? (
            <p className="text-slate-500 text-sm text-center py-8">
              Cliquez sur un article pour voir son évolution par fournisseur.
            </p>
          ) : chartData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Pas encore d'historique pour cet article.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" €" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                {chartSuppliers.map((sup, i) => (
                  <Line
                    key={sup}
                    type="monotone"
                    dataKey={sup}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
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

export default FoodCostDashboard;
