import React, { useState } from 'react';
import { supabase } from '../../config/supabase';
import { useCDRData } from './hooks/useCDRData';
import CDRTable from './CDRTable';
import CDRImportModal from './CDRImportModal';
import CDRInvoiceInjector from './CDRInvoiceInjector';
import InvoiceReviewPanel from './InvoiceReviewPanel';
import ClosersDashboard from './closers/ClosersDashboard';

const TABS = [
  { key: 'cdr', label: 'Compte de résultat', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { key: 'closers', label: 'Closers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: 'factures', label: 'Factures', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];

const VIEW_MODES = [
  { key: 'real', label: 'Réel' },
  { key: 'budget', label: 'Budget' },
  { key: 'ecart', label: 'Écart' },
];

export default function CDRPage({ activeCompany, companies, user, isViewerOnly, onBack }) {
  const companyId = companies?.[activeCompany]?.id;
  const [tab, setTab] = useState('cdr');
  const [viewMode, setViewMode] = useState('real');
  const [year, setYear] = useState(new Date().getFullYear());
  const [showImport, setShowImport] = useState(false);
  const [reviewingInvoice, setReviewingInvoice] = useState(null); // invoice row being manually validated

  const { categories, entries, budget, invoices, loading, error, reload, upsertEntry, upsertBudget, updateCategoryStatus } = useCDRData(companyId);

  // Closing records from invoices (validated closer invoices)
  const [closingRecords, setClosingRecords] = useState([]);
  React.useEffect(() => {
    if (!companyId) return;
    supabase.from('closing_records').select('*').eq('company_id', companyId).then(({ data }) => {
      setClosingRecords(data || []);
    });
  }, [companyId, invoices]);

  const invoicesPending = invoices.filter(i => i.status === 'pending').length;

  // Handle CDR import
  const handleImport = async (rows, importType) => {
    if (!companyId) return;
    const promises = rows.map(({ categoryId, month, year: yr, amount }) => {
      if (importType === 'budget') {
        return upsertBudget(companyId, categoryId, month, yr, amount);
      } else {
        return upsertEntry(companyId, categoryId, month, yr, amount);
      }
    });
    await Promise.all(promises);
  };

  const overBudgetCount = React.useMemo(() => {
    if (!entries.length || !budget.length) return 0;
    const entryMap = {};
    entries.filter(e => e.year === year).forEach(e => {
      const key = `${e.category_id}_${e.month}`;
      entryMap[key] = (entryMap[key] || 0) + Number(e.amount);
    });
    return budget.filter(b => {
      if (b.year !== year) return false;
      const real = entryMap[`${b.category_id}_${b.month}`] || 0;
      return real > Number(b.budget_amount);
    }).length;
  }, [entries, budget, year]);

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 gap-3">
        <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm font-medium">Sélectionnez une société pour accéder au CDR</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">CDR & Closers</p>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{activeCompany}</h1>
          {overBudgetCount > 0 && (
            <p className="text-xs text-red-600 font-medium mt-1">
              ⚠ {overBudgetCount} catégorie{overBudgetCount > 1 ? 's dépassent' : ' dépasse'} le budget
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Year selector */}
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-violet-400 bg-white"
          >
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* View mode toggle (CDR only) */}
          {tab === 'cdr' && (
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              {VIEW_MODES.map(m => (
                <button
                  key={m.key}
                  onClick={() => setViewMode(m.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === m.key ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Import */}
          {!isViewerOnly && (
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importer
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === t.key
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
            </svg>
            {t.label}
            {t.key === 'factures' && invoicesPending > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">{invoicesPending}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Chargement du CDR...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Erreur : {error}
          <button onClick={reload} className="ml-3 underline font-medium">Réessayer</button>
        </div>
      ) : (
        <>
          {tab === 'cdr' && (
            <CDRTable
              companyId={companyId}
              categories={categories}
              entries={entries}
              budget={budget}
              viewMode={viewMode}
              year={year}
              onUpsertEntry={upsertEntry}
              onUpsertBudget={upsertBudget}
              onUpdateCategoryStatus={updateCategoryStatus}
              isViewerOnly={isViewerOnly}
            />
          )}

          {tab === 'closers' && (
            <ClosersDashboard
              records={closingRecords}
              invoicesPending={invoicesPending}
            />
          )}

          {tab === 'factures' && (
            <div className="space-y-6">
              {!isViewerOnly && (
                <CDRInvoiceInjector
                  companyId={companyId}
                  categories={categories}
                  onUploadComplete={reload}
                  isViewerOnly={isViewerOnly}
                />
              )}

              {/* Inline review panel for manually validating a pending invoice */}
              {reviewingInvoice && (
                <div className="space-y-2">
                  <button
                    onClick={() => setReviewingInvoice(null)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour à la liste
                  </button>
                  <InvoiceReviewPanel
                    item={{
                      invoiceId: reviewingInvoice.id,
                      file: null,
                      fileName: reviewingInvoice.file_name,
                      fileUrl: reviewingInvoice.file_url,
                      extracted: {
                        supplier_name: reviewingInvoice.supplier_name || '',
                        invoice_date: reviewingInvoice.invoice_date || '',
                        amount_ht: reviewingInvoice.amount_ht ?? '',
                        amount_tva: reviewingInvoice.amount_tva ?? '',
                        amount_ttc: reviewingInvoice.amount_ttc ?? '',
                        is_closer_invoice: reviewingInvoice.is_closer_invoice || false,
                        closer_lines: [],
                      },
                    }}
                    categories={categories}
                    companyId={companyId}
                    onDone={() => { setReviewingInvoice(null); reload(); }}
                  />
                </div>
              )}

              {/* Invoice list */}
              {!reviewingInvoice && invoices.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['Fichier', 'Fournisseur', 'Date', 'Montant TTC', 'Statut', ''].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-violet-50/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <span className="text-xs text-slate-600 max-w-[140px] truncate">{inv.file_name || 'Facture'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{inv.supplier_name || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{inv.invoice_date || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                            {inv.amount_ttc ? `${Number(inv.amount_ttc).toLocaleString('fr-BE', { minimumFractionDigits: 2 })} €` : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                              inv.status === 'validated' ? 'bg-emerald-100 text-emerald-700' :
                              inv.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {inv.status === 'validated' ? 'Validée' : inv.status === 'rejected' ? 'Rejetée' : 'En attente'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3 justify-end">
                              {inv.status === 'pending' && !isViewerOnly && (
                                <button
                                  onClick={() => setReviewingInvoice(inv)}
                                  className="text-xs text-amber-700 font-semibold hover:text-amber-900 transition-colors"
                                >
                                  Valider
                                </button>
                              )}
                              {inv.file_url && (
                                <a href={inv.file_url} target="_blank" rel="noreferrer" className="text-xs text-violet-600 hover:underline font-medium">
                                  Voir
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !reviewingInvoice ? (
                <div className="text-center py-16 text-slate-400">
                  <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-slate-400">Aucune facture uploadée</p>
                  <p className="text-xs text-slate-300 mt-1">Utilisez la zone ci-dessus pour déposer vos factures</p>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      {/* Import modal */}
      {showImport && (
        <CDRImportModal
          onClose={() => setShowImport(false)}
          onImport={handleImport}
          categories={categories}
          year={year}
        />
      )}
    </div>
  );
}
