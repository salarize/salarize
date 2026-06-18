import React, { useState, useCallback } from 'react';
import FoodInvoiceReviewPanel from './FoodInvoiceReviewPanel';

const CATEGORIES = ['meat', 'fish', 'dairy', 'produce', 'dry', 'beverage', 'other'];
const CATEGORY_LABELS = { meat: 'Viande', fish: 'Poisson', dairy: 'Laitier', produce: 'Fruits/Légumes', dry: 'Épicerie sèche', beverage: 'Boissons', other: 'Autre' };
const UNITS = ['kg', 'L', 'unit'];

const TABS = [
  { key: 'ready', label: 'Prêts à importer' },
  { key: 'review', label: 'À réviser' },
  { key: 'duplicates', label: 'Doublons' },
  { key: 'failed', label: 'Échec extraction' },
];

function ReviewTable({ lines, articles, onValidate, onBulkApprove, onCreateAndLink, onOpenPanel }) {
  const [creating, setCreating] = useState(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [newUnit, setNewUnit] = useState('kg');

  if (!lines.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-slate-500 text-sm">Aucune ligne dans cette catégorie.</p>
      </div>
    );
  }

  const autoApprovable = lines.filter(l => (l.confidence ?? 0) >= 0.85 && l.article_id);

  return (
    <div className="space-y-4">
      {autoApprovable.length > 0 && (
        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          <p className="text-green-300 text-sm">
            <span className="font-bold">{autoApprovable.length}</span> ligne{autoApprovable.length > 1 ? 's' : ''} avec confiance ≥ 85% et article lié
          </p>
          <button
            onClick={onBulkApprove}
            className="px-4 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 font-semibold rounded-lg text-sm transition-all"
          >
            Tout approuver
          </button>
        </div>
      )}

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-slate-700/50">
                <th className="px-4 py-3 font-semibold">Description brute</th>
                <th className="px-4 py-3 font-semibold">Fournisseur</th>
                <th className="px-4 py-3 font-semibold text-right">Qté</th>
                <th className="px-4 py-3 font-semibold text-right">Prix/unité</th>
                <th className="px-4 py-3 font-semibold">Confiance</th>
                <th className="px-4 py-3 font-semibold">Article lié</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {lines.map(line => {
                const linkedArticle = articles.find(a => a.id === line.article_id);
                const conf = line.confidence ?? 0;
                const confColor = conf >= 0.85 ? 'text-green-400' : conf >= 0.7 ? 'text-amber-400' : 'text-red-400';

                return (
                  <React.Fragment key={line.id}>
                    <tr
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => onOpenPanel(line)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-slate-200 font-medium max-w-[200px] truncate" title={line.raw_description}>
                          {line.raw_description ?? '—'}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {line.food_invoices?.invoice_date ?? ''} · {line.food_invoices?.invoice_number ?? ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{line.food_invoices?.food_suppliers?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {line.quantity_normalized != null ? `${line.quantity_normalized.toFixed(3)} ${line.unit_normalized ?? ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {line.unit_price_normalized != null ? `${line.unit_price_normalized.toFixed(4)} €` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-xs ${confColor}`}>{Math.round(conf * 100)}%</span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {linkedArticle ? (
                          <span className="text-orange-300 text-xs font-semibold bg-orange-500/10 px-2 py-0.5 rounded-full">
                            {linkedArticle.canonical_name}
                          </span>
                        ) : (
                          <select
                            className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1 max-w-[140px]"
                            defaultValue=""
                            onChange={e => onValidate(line.id, e.target.value || null)}
                          >
                            <option value="">— Lier un article —</option>
                            {articles.map(a => (
                              <option key={a.id} value={a.id}>{a.canonical_name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenPanel(line)}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-all"
                            title="Ouvrir l'éditeur complet"
                          >
                            Réviser
                          </button>
                          {linkedArticle && (
                            <button
                              onClick={() => onValidate(line.id, line.article_id)}
                              className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-semibold rounded-lg transition-all"
                            >
                              Valider
                            </button>
                          )}
                          <button
                            onClick={() => { setCreating(line.id); setNewName(line.raw_description ?? ''); }}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-all"
                          >
                            Créer
                          </button>
                          <button
                            onClick={() => onValidate(line.id, null)}
                            className="px-3 py-1 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                          >
                            Ignorer
                          </button>
                        </div>
                      </td>
                    </tr>

                    {creating === line.id && (
                      <tr className="bg-slate-800/50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="flex items-end gap-3 flex-wrap">
                            <div className="flex-1 min-w-[180px]">
                              <label className="text-slate-400 text-xs mb-1 block">Nom canonique</label>
                              <input
                                className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-slate-400 text-xs mb-1 block">Catégorie</label>
                              <select className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-slate-400 text-xs mb-1 block">Unité</label>
                              <select className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2" value={newUnit} onChange={e => setNewUnit(e.target.value)}>
                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if (!newName.trim()) return;
                                  await onCreateAndLink(line.id, newName.trim(), newCategory, newUnit);
                                  setCreating(null);
                                }}
                                className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 text-sm font-semibold rounded-lg transition-all"
                              >
                                Créer et lier
                              </button>
                              <button onClick={() => setCreating(null)} className="px-3 py-2 text-slate-400 hover:text-slate-200 text-sm transition-colors">Annuler</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FoodCostReviewQueue({ reviewLines, articles, onValidate, onBulkApprove, onCreateAndLink, onRefetch, companyId, userEmail }) {
  const [activeTab, setActiveTab] = useState('review');
  const [panelLine, setPanelLine] = useState(null);

  const handleApprove = useCallback(async (line) => {
    if (!line?.article_id) return;
    await onValidate(line.id, line.article_id);
    setPanelLine(null);
  }, [onValidate]);

  // Mutually exclusive classification — each line belongs to exactly one tab
  const failed = reviewLines.filter(l => l.extraction_failed === true);
  const duplicates = reviewLines.filter(l => l.duplicate_group_id && !l.extraction_failed);
  const ready = reviewLines.filter(l => !l.extraction_failed && !l.duplicate_group_id && (l.confidence ?? 0) >= 0.85 && l.article_id);
  const needsReview = reviewLines.filter(l => !l.extraction_failed && !l.duplicate_group_id && !((l.confidence ?? 0) >= 0.85 && l.article_id));

  const counts = { ready: ready.length, review: needsReview.length, duplicates: duplicates.length, failed: failed.length };
  const currentLines = { ready, review: needsReview, duplicates, failed }[activeTab] ?? [];

  if (!reviewLines.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-white font-bold text-lg">File vide</h3>
        <p className="text-slate-400 text-sm mt-2">Toutes les lignes ont été vérifiées.</p>
      </div>
    );
  }

  return (
    <>
      {panelLine && (
        <FoodInvoiceReviewPanel
          line={panelLine}
          companyId={companyId}
          userEmail={userEmail}
          onClose={() => setPanelLine(null)}
          onSaved={() => {
            setPanelLine(null);
            onRefetch?.();
          }}
          onApprove={() => handleApprove(panelLine)}
        />
      )}

      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-800/40 rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-700 text-slate-400'
                }`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <ReviewTable
          lines={currentLines}
          articles={articles}
          onValidate={onValidate}
          onBulkApprove={onBulkApprove}
          onCreateAndLink={onCreateAndLink}
          onOpenPanel={setPanelLine}
        />
      </div>
    </>
  );
}

export default FoodCostReviewQueue;
