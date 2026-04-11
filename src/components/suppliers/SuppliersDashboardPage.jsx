import React, { useMemo, useState } from 'react';
import { SvgHBarChart } from '../layout/SvgBarChart';
import { HeatmapMatrix, ParetoChart, Sparkline } from '../layout/PowerCharts';

const MATERIAL_SETUP_SQL = `CREATE TABLE IF NOT EXISTS material_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period TEXT,
  sku TEXT,
  barcode TEXT,
  article_name TEXT,
  supplier TEXT,
  category TEXT,
  unit TEXT,
  quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;

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

const toSafeText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const parsePeriodDate = (period) => {
  if (!period || typeof period !== 'string') return null;
  const [year, month] = period.split('-');
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return new Date(y, m - 1, 1);
};

function SuppliersDashboardPage({
  activeCompany,
  materialCosts = [],
  isViewerOnly,
  onBack,
  setupIssue = null,
  onInvite,
  onImportFile,
  onRetrySetup = () => {},
  monthlyBudget = null,
}) {
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [selectedSupplierFocus, setSelectedSupplierFocus] = useState(null);
  const [selectedHeatCell, setSelectedHeatCell] = useState(null);

  const normalizedRows = useMemo(() => {
    const source = Array.isArray(materialCosts) ? materialCosts : [];
    return source
      .filter((row) => row && typeof row === 'object')
      .map((row) => ({
        ...row,
        period: toSafeText(row.period, ''),
        supplier: toSafeText(row.supplier, 'Non renseigne'),
        article: toSafeText(row.article, ''),
        sku: toSafeText(row.sku, ''),
        barcode: toSafeText(row.barcode, ''),
        category: toSafeText(row.category, ''),
        quantity: parseLocaleNumber(row.quantity),
        totalCost: parseLocaleNumber(row.totalCost)
      }));
  }, [materialCosts]);

  const periods = useMemo(
    () => [...new Set(normalizedRows.map((row) => row.period).filter(Boolean))].sort(),
    [normalizedRows]
  );

  const suppliers = useMemo(
    () => [...new Set(normalizedRows.map((row) => row.supplier))].sort((a, b) => String(a).localeCompare(String(b), 'fr', { sensitivity: 'base' })),
    [normalizedRows]
  );

  const filteredRows = useMemo(() => {
    const q = normalizeToken(search);
    return normalizedRows.filter((row) => {
      if (periodFilter !== 'all' && row.period !== periodFilter) return false;
      if (supplierFilter !== 'all' && row.supplier !== supplierFilter) return false;
      if (selectedSupplierFocus && row.supplier !== selectedSupplierFocus) return false;
      if (!q) return true;
      const text = normalizeToken(`${row.article} ${row.sku} ${row.barcode} ${row.supplier} ${row.category}`);
      return text.includes(q);
    });
  }, [normalizedRows, periodFilter, supplierFilter, selectedSupplierFocus, search]);

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

  const periodSeries = useMemo(() => {
    const grouped = {};
    normalizedRows.forEach((row) => {
      if (!row.period) return;
      grouped[row.period] = (grouped[row.period] || 0) + row.totalCost;
    });
    return Object.entries(grouped)
      .map(([period, total]) => ({ period, total }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [normalizedRows]);

  const latestPoint = periodSeries[periodSeries.length - 1] || null;
  const previousPoint = periodSeries.length > 1 ? periodSeries[periodSeries.length - 2] : null;
  const deltaVsPrev = latestPoint && previousPoint ? latestPoint.total - previousPoint.total : null;
  const deltaVsPrevPct = latestPoint && previousPoint && previousPoint.total > 0
    ? ((latestPoint.total - previousPoint.total) / previousPoint.total) * 100
    : null;

  const budgetDelta = latestPoint && monthlyBudget
    ? latestPoint.total - Number(monthlyBudget)
    : null;
  const budgetDeltaPct = latestPoint && monthlyBudget && Number(monthlyBudget) > 0
    ? ((latestPoint.total - Number(monthlyBudget)) / Number(monthlyBudget)) * 100
    : null;

  const freshnessDays = useMemo(() => {
    if (!latestPoint?.period) return null;
    const latestDate = parsePeriodDate(latestPoint.period);
    if (!latestDate) return null;
    const now = new Date();
    const diffMs = now.getTime() - latestDate.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }, [latestPoint]);

  const duplicateCount = useMemo(() => {
    const seen = new Set();
    let duplicates = 0;
    normalizedRows.forEach((row) => {
      const key = [row.period, row.supplier, row.sku, row.barcode, row.article, row.totalCost.toFixed(2)].join('|');
      if (seen.has(key)) duplicates += 1;
      else seen.add(key);
    });
    return duplicates;
  }, [normalizedRows]);

  const invalidCount = useMemo(
    () => normalizedRows.filter((row) => row.totalCost <= 0 || row.quantity < 0).length,
    [normalizedRows]
  );

  const paretoData = useMemo(
    () => bySupplier.slice(0, 12).map((row) => ({ key: row.supplier, label: row.supplier, value: row.totalCost })),
    [bySupplier]
  );

  const heatmapPeriods = useMemo(
    () => periodSeries.slice(-8).map((item) => item.period),
    [periodSeries]
  );

  const heatmapSuppliers = useMemo(
    () => bySupplier.slice(0, 8).map((item) => item.supplier),
    [bySupplier]
  );

  const heatmapValues = useMemo(() => {
    const map = {};
    heatmapSuppliers.forEach((supplier) => {
      map[supplier] = {};
      heatmapPeriods.forEach((period) => {
        map[supplier][period] = 0;
      });
    });
    normalizedRows.forEach((row) => {
      if (!map[row.supplier] || !Object.prototype.hasOwnProperty.call(map[row.supplier], row.period)) return;
      map[row.supplier][row.period] += row.totalCost;
    });
    return map;
  }, [normalizedRows, heatmapPeriods, heatmapSuppliers]);

  const hasActiveFilters = Boolean(
    search || periodFilter !== 'all' || supplierFilter !== 'all' || selectedSupplierFocus || selectedHeatCell
  );

  const resetFilters = () => {
    setSearch('');
    setPeriodFilter('all');
    setSupplierFilter('all');
    setSelectedSupplierFocus(null);
    setSelectedHeatCell(null);
  };

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Suite Interne</p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Module Achats Fournisseurs</h1>
            <p className="text-sm text-slate-600 mt-1">
              Pilotage des achats matiere premiere par fournisseur et par article.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                {activeCompany || 'Societe'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                {filteredRows.length} lignes analysees
              </span>
              {latestPoint?.period && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Derniere periode: {formatPeriod(latestPoint.period)}
                </span>
              )}
              {freshnessDays !== null && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${freshnessDays > 62 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  Fraicheur: {freshnessDays}j
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onBack}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Retour
            </button>
            <label className={`px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 ${isViewerOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'} transition-colors`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Importer achats (multi-fichiers)
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                multiple
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
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Reset filtres
              </button>
            )}
          </div>
        </div>
      </div>

      {setupIssue?.isMissingSchema && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Setup requis</p>
              <h2 className="text-base sm:text-lg font-bold text-amber-900 mt-1">{setupIssue.title || 'Configuration module fournisseurs requise'}</h2>
              <p className="text-sm text-amber-800 mt-1">
                {setupIssue.description || 'La table `material_costs` est absente sur Supabase. Executez la migration SQL ci-dessous puis reessayez.'}
              </p>
              {(setupIssue.code || setupIssue.hint) && (
                <p className="text-xs text-amber-700 mt-2">
                  {setupIssue.code ? `Code: ${setupIssue.code}` : ''}{setupIssue.code && setupIssue.hint ? ' - ' : ''}{setupIssue.hint || ''}
                </p>
              )}
            </div>
            <button
              onClick={onRetrySetup}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              Reessayer
            </button>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-amber-900">Afficher SQL de configuration</summary>
            <pre className="mt-2 text-[11px] leading-5 bg-amber-100/60 border border-amber-200 rounded-lg p-3 overflow-x-auto text-amber-900">
{setupIssue.sql || MATERIAL_SETUP_SQL}
            </pre>
          </details>
        </div>
      )}

      {(duplicateCount > 0 || invalidCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {duplicateCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">Doublons detectes</p>
              <p className="mt-1">{duplicateCount} ligne(s) dupliquee(s) trouvee(s). Pensez a nettoyer avant reporting final.</p>
            </div>
          )}
          {invalidCount > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold">Lignes potentiellement invalides</p>
              <p className="mt-1">{invalidCount} ligne(s) avec cout {'<='} 0 ou quantite negative.</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Cout periode courante</p>
          <p className="text-lg font-bold text-slate-900">
            EUR {latestPoint ? latestPoint.total.toLocaleString('fr-BE', { maximumFractionDigits: 0 }) : kpis.totalCost.toLocaleString('fr-BE', { maximumFractionDigits: 0 })}
          </p>
          {deltaVsPrev !== null ? (
            <p className={`text-xs mt-1 font-semibold ${deltaVsPrev >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {deltaVsPrev >= 0 ? '+' : '-'}EUR {Math.abs(deltaVsPrev).toLocaleString('fr-BE', { maximumFractionDigits: 0 })}
              {deltaVsPrevPct !== null ? ` (${deltaVsPrevPct >= 0 ? '+' : '-'}${Math.abs(deltaVsPrevPct).toFixed(1)}%)` : ''}
            </p>
          ) : (
            <p className="text-xs mt-1 text-slate-400">Pas assez d'historique</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Vs budget achats</p>
          <p className="text-lg font-bold text-slate-900">
            {monthlyBudget ? `EUR ${Number(monthlyBudget).toLocaleString('fr-BE', { maximumFractionDigits: 0 })}` : 'Non defini'}
          </p>
          {budgetDelta !== null ? (
            <p className={`text-xs mt-1 font-semibold ${budgetDelta >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {budgetDelta >= 0 ? 'Depassement' : 'Sous budget'} {Math.abs(budgetDeltaPct || 0).toFixed(1)}%
            </p>
          ) : (
            <p className="text-xs mt-1 text-slate-400">Definir un budget pour suivi</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Trend achats</p>
          <div className="mt-1">
            <Sparkline
              data={periodSeries}
              valueKey="total"
              width={120}
              height={32}
              color="#16a34a"
            />
          </div>
          <p className="text-xs mt-1 text-slate-500">{periodSeries.length} periode(s)</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">KPI volume</p>
          <p className="text-lg font-bold text-slate-900">{kpis.articleCount} articles</p>
          <p className="text-xs text-slate-500 mt-1">{kpis.supplierCount} fournisseurs - Cout unitaire EUR {kpis.unitCost.toLocaleString('fr-BE', { maximumFractionDigits: 2 })}</p>
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
        {selectedSupplierFocus && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
            Focus fournisseur: <span className="font-semibold">{selectedSupplierFocus}</span>
            <button onClick={() => setSelectedSupplierFocus(null)} className="font-semibold underline">
              Retirer
            </button>
          </div>
        )}
      </div>

      {filteredRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Aucune ligne fournisseur pour les filtres actuels.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Pareto fournisseurs (80/20)</h3>
                <span className="text-xs text-slate-400">Click barre = filtre</span>
              </div>
              <ParetoChart
                data={paretoData}
                labelKey="label"
                valueKey="value"
                height={300}
                color="#16a34a"
                lineColor="#334155"
                selectedKey={selectedSupplierFocus}
                onBarClick={(row) => {
                  setSelectedSupplierFocus(row.label);
                  setSelectedHeatCell(null);
                }}
                formatValue={(v) => `EUR ${Number(v).toLocaleString('fr-BE', { maximumFractionDigits: 0 })}`}
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Top fournisseurs par cout</h3>
              <SvgHBarChart
                data={bySupplier.slice(0, 10)}
                labelKey="supplier"
                valueKey="totalCost"
                height={288}
                color="#16a34a"
                formatValue={(v) => `EUR ${Number(v).toLocaleString('fr-BE', { maximumFractionDigits: 0 })}`}
              />
            </div>
          </div>

          {heatmapSuppliers.length > 0 && heatmapPeriods.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Heatmap depenses (Fournisseur x Periode)</h3>
                <span className="text-xs text-slate-400">Click cellule = drill-through</span>
              </div>
              <HeatmapMatrix
                rows={heatmapSuppliers}
                cols={heatmapPeriods.map((period) => formatPeriod(period))}
                values={Object.fromEntries(
                  heatmapSuppliers.map((supplier) => [
                    supplier,
                    Object.fromEntries(heatmapPeriods.map((period) => [formatPeriod(period), heatmapValues?.[supplier]?.[period] || 0])),
                  ])
                )}
                height={320}
                selectedCell={selectedHeatCell}
                onCellClick={(cell) => {
                  const sourcePeriod = heatmapPeriods.find((period) => formatPeriod(period) === cell.col);
                  if (!sourcePeriod) return;
                  setSelectedSupplierFocus(cell.row);
                  setSupplierFilter('all');
                  setPeriodFilter(sourcePeriod);
                  setSelectedHeatCell({ row: cell.row, col: cell.col });
                }}
                formatValue={(v) => `EUR ${Math.round(v / 1000)}k`}
              />
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800">Drill-through lignes achat</h3>
                <span className="text-xs text-slate-400">{filteredRows.length} ligne(s)</span>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-100">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-slate-500">
                      <th className="px-2 py-2 text-left font-semibold">Periode</th>
                      <th className="px-2 py-2 text-left font-semibold">Fournisseur</th>
                      <th className="px-2 py-2 text-left font-semibold">Article</th>
                      <th className="px-2 py-2 text-right font-semibold">Cout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.slice(0, 120).map((row, idx) => (
                      <tr key={`${row.period}-${row.supplier}-${row.article}-${idx}`} className="border-t border-slate-100">
                        <td className="px-2 py-2 text-slate-600">{formatPeriod(row.period)}</td>
                        <td className="px-2 py-2 text-slate-700">{row.supplier}</td>
                        <td className="px-2 py-2 text-slate-700">{row.article || row.sku || row.barcode || 'N/A'}</td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-800">
                          EUR {Number(row.totalCost).toLocaleString('fr-BE', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuppliersDashboardPage;
