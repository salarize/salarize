import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../config/supabase';
import { calculateNormalizedUnitPrice } from '../../utils/foodUnits';
import { useFoodCorrections } from './hooks/useFoodCorrections';
import FoodCorrectionAuditTrail from './FoodCorrectionAuditTrail';

const EDITABLE_FIELDS = [
  { key: 'raw_description', label: 'Description', type: 'text' },
  { key: 'sku', label: 'SKU', type: 'text' },
  { key: 'quantity', label: 'Quantité', type: 'number' },
  { key: 'unit_raw', label: 'Unité', type: 'text' },
  { key: 'unit_price_raw', label: 'Prix unitaire HT', type: 'number' },
  { key: 'total_price_ht', label: 'Total HT', type: 'number' },
  { key: 'tva_rate', label: 'TVA %', type: 'number' },
];

function FieldRow({ field, value, editing, onChange, onStartEdit, onCancelEdit, onSave, isChanged }) {
  return (
    <tr className={`border-b border-slate-800/60 ${isChanged ? 'bg-amber-500/5' : ''}`}>
      <td className="px-3 py-2 text-slate-400 text-xs font-medium w-36">{field.label}</td>
      <td className="px-3 py-2">
        {editing ? (
          <input
            autoFocus
            type={field.type}
            className="w-full bg-slate-700 border border-orange-500/40 text-white text-sm rounded-lg px-2 py-1 focus:outline-none focus:border-orange-400"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
        ) : (
          <button
            className="text-sm text-slate-200 hover:text-white text-left w-full rounded px-1 hover:bg-slate-700/40 transition-colors"
            onClick={onStartEdit}
          >
            {value != null && value !== '' ? String(value) : <span className="text-slate-600 italic">—</span>}
          </button>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {isChanged && !editing && (
          <span className="text-amber-400 text-[10px] font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-full">MODIFIÉ</span>
        )}
      </td>
    </tr>
  );
}

function FoodInvoiceReviewPanel({ line, companyId, userEmail, onClose, onSaved }) {
  const [draft, setDraft] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const { corrections, loadCorrections, recordCorrection } = useFoodCorrections(companyId);

  // Original values for undo
  const original = line?.original_extracted ?? line ?? {};

  useEffect(() => {
    if (!line) return;
    setDraft({});
    setEditingField(null);
    loadCorrections(line.id);

    // Get signed PDF URL
    if (line.food_invoices?.file_url ?? line.file_url) {
      const path = line.food_invoices?.file_url ?? line.file_url;
      supabase.storage.from('invoices').createSignedUrl(path, 3600).then(({ data }) => {
        if (data?.signedUrl) setPdfUrl(data.signedUrl);
      });
    }
  }, [line?.id]);

  const getValue = (key) => key in draft ? draft[key] : (line?.[key] ?? '');
  const isChanged = (key) => key in draft && String(draft[key]) !== String(line?.[key] ?? '');
  const hasChanges = EDITABLE_FIELDS.some(f => isChanged(f.key));

  const handleSave = useCallback(async () => {
    if (!line || !hasChanges) return;
    setSaving(true);

    // Recalculate normalized values from edits
    const merged = { ...line, ...draft };
    const recalc = calculateNormalizedUnitPrice(merged);

    const updates = {
      ...draft,
      ...(recalc ? {
        unit_normalized: recalc.unit,
        quantity_normalized: recalc.qtyNorm,
        unit_price_normalized: recalc.unitPriceNorm,
      } : {}),
      edited_by: userEmail,
      edited_at: new Date().toISOString(),
    };

    await supabase.from('food_invoice_lines').update(updates).eq('id', line.id);

    // Write corrections for each changed field
    for (const f of EDITABLE_FIELDS) {
      if (isChanged(f.key)) {
        await recordCorrection({
          lineId: line.id,
          fieldName: f.key,
          oldValue: line[f.key],
          newValue: draft[f.key],
          editedBy: userEmail,
        });
      }
    }

    setSaving(false);
    setDraft({});
    loadCorrections(line.id);
    onSaved?.();
  }, [line, draft, hasChanges, userEmail, recordCorrection, loadCorrections, onSaved]);

  const handleUndo = useCallback(async (field) => {
    const originalVal = original[field];
    setDraft(prev => ({ ...prev, [field]: originalVal }));
    // If saving immediately on undo
    await supabase.from('food_invoice_lines').update({ [field]: originalVal, edited_by: userEmail, edited_at: new Date().toISOString() }).eq('id', line.id);
    await recordCorrection({ lineId: line.id, fieldName: field, oldValue: line[field], newValue: originalVal, editedBy: userEmail });
    setDraft(prev => { const n = { ...prev }; delete n[field]; return n; });
    onSaved?.();
  }, [line, original, userEmail, recordCorrection, onSaved]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (!line) return;
      if (e.key === 'Escape') { setEditingField(null); setDraft({}); }
      if (e.key === 'a' && !editingField) { onSaved?.(); onClose?.(); }
      if (e.key === 'i' && !editingField) { onClose?.(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [line, editingField, onClose, onSaved]);

  if (!line) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm">
      {/* PDF preview — left half */}
      <div className="w-1/2 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <p className="text-slate-300 text-sm font-semibold truncate">
            {line.food_invoices?.invoice_number ?? 'Facture'} · {line.food_invoices?.food_suppliers?.name ?? ''}
          </p>
        </div>
        <div className="flex-1 overflow-hidden">
          {pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-full border-0" title="Facture PDF" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-600 text-sm">PDF non disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit panel — right half */}
      <div className="w-1/2 bg-slate-900 flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div>
            <h3 className="text-white font-bold">Révision de ligne</h3>
            <p className="text-slate-500 text-xs mt-0.5 truncate max-w-xs">{line.raw_description}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-slate-600 text-xs">A=approuver · I=ignorer · Esc=annuler</p>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Editable fields table */}
          <table className="w-full">
            <tbody>
              {EDITABLE_FIELDS.map(field => (
                <FieldRow
                  key={field.key}
                  field={field}
                  value={getValue(field.key)}
                  editing={editingField === field.key}
                  isChanged={isChanged(field.key)}
                  onStartEdit={() => setEditingField(field.key)}
                  onCancelEdit={() => { setEditingField(null); setDraft(prev => { const n = { ...prev }; delete n[field.key]; return n; }); }}
                  onChange={v => setDraft(prev => ({ ...prev, [field.key]: v }))}
                  onSave={() => setEditingField(null)}
                />
              ))}
            </tbody>
          </table>

          {/* Normalized values (read-only, recalculated) */}
          <div className="px-3 py-3 border-t border-slate-800/60 bg-slate-800/20">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Valeurs normalisées</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: 'Unité', value: line.unit_normalized },
                { label: 'Qté norm.', value: line.quantity_normalized?.toFixed(4) },
                { label: 'Prix/unité', value: line.unit_price_normalized?.toFixed(4) ? `${line.unit_price_normalized.toFixed(4)} €` : null },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-800/50 rounded-lg p-2">
                  <p className="text-slate-500">{label}</p>
                  <p className="text-slate-200 font-semibold">{value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Audit trail toggle */}
          <div className="px-3 py-2 border-t border-slate-800/60">
            <button
              onClick={() => setShowAudit(!showAudit)}
              className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 transition-colors"
            >
              <svg className={`w-3 h-3 transition-transform ${showAudit ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Historique des modifications ({corrections.length})
            </button>
            {showAudit && <FoodCorrectionAuditTrail corrections={corrections} />}
          </div>
        </div>

        {/* Actions footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center gap-3">
          {hasChanges && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
              </button>
              <button
                onClick={() => setDraft({})}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                Annuler
              </button>
            </>
          )}
          {!hasChanges && (
            <button
              onClick={() => { onSaved?.(); onClose?.(); }}
              className="flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 font-semibold rounded-xl text-sm transition-all"
            >
              Approuver (A)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FoodInvoiceReviewPanel;
