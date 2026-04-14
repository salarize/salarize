import React, { useMemo, useState } from 'react';
import { SvgHBarChart } from '../layout/SvgBarChart';
import { LastUpdatedBadge, SuppliersSkeleton } from '../ui';

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

function SuppliersDashboardPage({
  activeCompany,
  materialCosts = [],
  isLoading = false,
  lastFetchedAt = null,
  isViewerOnly,
  onBack,
  setupIssue = null,
  onInvite,
  onOpenImportModal,
  onImportBlocked = () => {},
  onRetrySetup = () => {}
}) {
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const triggerImport = () => {
    if (isViewerOnly) {
      onImportBlocked();
      return;
    }
    if (typeof onOpenImportModal === 'function') {
      onOpenImportModal();
      return;
    }
  };

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

  if (isLoading) return <SuppliersSkeleton />;

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Suite Interne</p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Module Achats Fournisseurs</h1>
            <LastUpdatedBadge date={lastFetchedAt} className="mt-1" />
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
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onBack}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={triggerImport}
              className={`px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 ${isViewerOnly ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'} transition-colors`}
              title={isViewerOnly ? 'Mode lecture seule: import indisponible sur cette société partagée.' : 'Importer un ou plusieurs fichiers achats'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {isViewerOnly ? 'Importer indisponible (lecture seule)' : 'Importer achats (multi-fichiers)'}
            </button>
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
            <SvgHBarChart
              data={bySupplier.slice(0, 10)}
              labelKey="supplier"
              valueKey="totalCost"
              height={288}
              color="#16a34a"
              formatValue={(v) => `EUR ${Number(v).toLocaleString('fr-BE', { maximumFractionDigits: 0 })}`}
            />
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
