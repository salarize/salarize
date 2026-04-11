import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartErrorBoundary } from '../layout';

const parseLocaleNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/\s/g, '').replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    return parseFloat(cleaned.replace(/,/g, '')) || 0;
  }
  if (hasComma) return parseFloat(cleaned.replace(',', '.')) || 0;
  return parseFloat(cleaned) || 0;
};

const normalizeToken = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const formatPeriod = (period) => {
  if (!period || period === 'Unknown') return period || 'Inconnue';
  const [year, month] = String(period).split('-');
  const months = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
  const idx = Number(month) - 1;
  if (idx >= 0 && idx < months.length) return `${months[idx]} ${year}`;
  return period;
};

function SuppliersDashboardPage({
  activeCompany,
  materialCosts = [],
  isViewerOnly,
  onBack,
  onBackToPayroll = onBack,
  onInvite,
  onImportFile
}) {
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  const normalizedRows = useMemo(() => {
    const source = Array.isArray(materialCosts) ? materialCosts : [];
    return source
      .filter((row) => row && typeof row === 'object')
      .map((row) => ({
        ...row,
        period: row.period || '',
        supplier: row.supplier || 'Non renseigne',
        article: row.article || '',
        sku: row.sku || '',
        barcode: row.barcode || '',
        category: row.category || '',
        quantity: parseLocaleNumber(row.quantity),
        totalCost: parseLocaleNumber(row.totalCost)
      }));
  }, [materialCosts]);

  const periods = useMemo(
    () => [...new Set(normalizedRows.map((row) => row.period).filter(Boolean))].sort(),
    [normalizedRows]
  );

  const suppliers = useMemo(
    () => [...new Set(normalizedRows.map((row) => row.supplier))].sort((a, b) => a.localeCompare(b)),
    [normalizedRows]
  );

  const filteredRows = useMemo(() => {
    const q = normalizeToken(search);
    return normalizedRows.filter((row) => {
      if (periodFilter !== 'all' && row.period !== periodFilter) return false;
      if (supplierFilter !== 'all' && row.supplier !== supplierFilter) return false;
      if (!q) return true;
      const text = normalizeToken(`${row.article} ${row.sku} ${row.barcode} ${row.supplier} ${row.category}`);
      return text.includes(q);
    });
  }, [normalizedRows, periodFilter, supplierFilter, search]);

  const kpis = useMemo(() => {
    const totalCost = filteredRows.reduce((sum, row) => sum + row.totalCost, 0);
    const totalQty = filteredRows.reduce((sum, row) => sum + row.quantity, 0);
    const articleCount = new Set(filteredRows.map((row) => row.sku || row.barcode || row.article).filter(Boolean)).size;
    const supplierCount = new Set(filteredRows.map((row) => row.supplier)).size;
    return {
      totalCost,
      totalQty,
      articleCount,
      supplierCount,
      unitCost: totalQty > 0 ? totalCost / totalQty : 0
    };
  }, [filteredRows]);

  const bySupplier = useMemo(() => {
    const grouped = {};
    filteredRows.forEach((row) => {
      const supplier = row.supplier;
      if (!grouped[supplier]) {
        grouped[supplier] = { supplier, totalCost: 0, totalQty: 0, articles: new Set() };
      }
      grouped[supplier].totalCost += row.totalCost;
      grouped[supplier].totalQty += row.quantity;
      grouped[supplier].articles.add(row.sku || row.barcode || row.article);
    });
    return Object.values(grouped)
      .map((entry) => ({
        supplier: entry.supplier,
        totalCost: Math.round(entry.totalCost * 100) / 100,
        totalQty: Math.round(entry.totalQty * 1000) / 1000,
        articleCount: entry.articles.size
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredRows]);

  const byArticle = useMemo(() => {
    const grouped = {};
    filteredRows.forEach((row) => {
      const key = row.sku || row.barcode || row.article || 'Article inconnu';
      if (!grouped[key]) {
        grouped[key] = {
          key,
          article: row.article || key,
          sku: row.sku,
          barcode: row.barcode,
          totalCost: 0,
          totalQty: 0,
          suppliers: new Set()
        };
      }
      grouped[key].totalCost += row.totalCost;
      grouped[key].totalQty += row.quantity;
      grouped[key].suppliers.add(row.supplier);
    });
    return Object.values(grouped)
      .map((entry) => ({
        ...entry,
        supplierCount: entry.suppliers.size,
        avgUnitCost: entry.totalQty > 0 ? entry.totalCost / entry.totalQty : 0
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredRows]);

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Suite Interne</p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Module Achats Fournisseurs</h1>
            <p className="text-sm text-slate-600 mt-1">
              Vue Odoo-style: pilotage des achats matiere premiere par fournisseur et par article.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                {activeCompany || 'Societe'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                {filteredRows.length} lignes analysees
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onBackToPayroll}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Retour module salaires
            </button>
            <label className={`px-3 py-2 text-sm font-medium rounded-lg ${isViewerOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'} transition-colors`}>
              Importer achats
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onImportFile}
                disabled={isViewerOnly}
                className="hidden"
              />
            </label>
            {!isViewerOnly && (
              <button
                onClick={onInvite}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Inviter au dashboard
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Cout total achats</p>
          <p className="text-lg font-bold text-slate-900">EUR {kpis.totalCost.toLocaleString('fr-BE', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Articles</p>
          <p className="text-lg font-bold text-slate-900">{kpis.articleCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Fournisseurs</p>
          <p className="text-lg font-bold text-slate-900">{kpis.supplierCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Cout unitaire moyen</p>
          <p className="text-lg font-bold text-slate-900">EUR {kpis.unitCost.toLocaleString('fr-BE', { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher article / SKU / fournisseur"
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="all">Toutes les periodes</option>
            {periods.map((period) => (
              <option key={period} value={period}>{formatPeriod(period)}</option>
            ))}
          </select>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="all">Tous les fournisseurs</option>
            {suppliers.map((supplier) => (
              <option key={supplier} value={supplier}>{supplier}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Aucune ligne fournisseur pour les filtres actuels.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Top fournisseurs par cout</h3>
            <div className="h-72">
              <ChartErrorBoundary>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bySupplier.slice(0, 10)} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `EUR ${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="supplier" width={140} tick={{ fontSize: 11, fill: '#334155' }} />
                    <Tooltip formatter={(v) => `EUR ${Number(v).toLocaleString('fr-BE', { minimumFractionDigits: 2 })}`} />
                    <Bar dataKey="totalCost" isAnimationActive={false} fill="#16a34a" radius={[4, 4, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Top articles (SKU / code-barres)</h3>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {byArticle.slice(0, 14).map((row) => (
                <div key={row.key} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{row.article}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {row.sku ? `SKU: ${row.sku}` : row.barcode ? `Code-barres: ${row.barcode}` : 'Sans SKU'}
                    </p>
                    <p className="text-xs text-slate-400">{row.supplierCount} fournisseur(s)</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-900">EUR {row.totalCost.toLocaleString('fr-BE', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-slate-500">{row.totalQty.toLocaleString('fr-BE', { maximumFractionDigits: 2 })} unites</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuppliersDashboardPage;
