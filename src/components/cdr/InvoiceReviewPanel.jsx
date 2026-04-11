import React, { useState } from 'react';
import { supabase } from '../../config/supabase';

function fmt(v) {
  return v != null ? Number(v).toLocaleString('fr-BE', { minimumFractionDigits: 2 }) : '';
}

function CloserLineRow({ line, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-5 gap-2 items-start py-2 border-b border-slate-50 last:border-0">
      <input
        value={line.closer_name || ''}
        onChange={e => onChange({ ...line, closer_name: e.target.value })}
        placeholder="Closer"
        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-violet-400"
      />
      <input
        value={line.client_name || ''}
        onChange={e => onChange({ ...line, client_name: e.target.value })}
        placeholder="Client"
        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-violet-400"
      />
      <input
        type="date"
        value={line.closing_date || ''}
        onChange={e => onChange({ ...line, closing_date: e.target.value })}
        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-violet-400"
      />
      <input
        value={line.product_sold || ''}
        onChange={e => onChange({ ...line, product_sold: e.target.value })}
        placeholder="Produit"
        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-violet-400"
      />
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={line.amount || ''}
          onChange={e => onChange({ ...line, amount: Number(e.target.value) })}
          placeholder="Montant HT"
          className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-violet-400"
        />
        <button
          onClick={onRemove}
          className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
          title="Supprimer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function InvoiceReviewPanel({ item, categories, companyId, onDone }) {
  const { invoiceId, file, extracted } = item;

  const [form, setForm] = useState({
    supplier_name: extracted?.supplier_name || '',
    invoice_date: extracted?.invoice_date || '',
    amount_ht: extracted?.amount_ht ?? '',
    amount_tva: extracted?.amount_tva ?? '',
    amount_ttc: extracted?.amount_ttc ?? '',
    is_closer_invoice: extracted?.is_closer_invoice || false,
    category_id: '',
    closer_lines: extracted?.closer_lines || [],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const leaves = categories.filter(c => !categories.some(p => p.parent_id === c.id));

  const updateLine = (idx, updated) => {
    setForm(f => ({ ...f, closer_lines: f.closer_lines.map((l, i) => i === idx ? updated : l) }));
  };
  const removeLine = (idx) => {
    setForm(f => ({ ...f, closer_lines: f.closer_lines.filter((_, i) => i !== idx) }));
  };
  const addLine = () => {
    setForm(f => ({
      ...f,
      closer_lines: [...f.closer_lines, { closer_name: form.supplier_name, client_name: '', closing_date: form.invoice_date, product_sold: '', amount: '' }],
    }));
  };

  const handleValidate = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Guard: re-fetch invoice status to prevent double-validation
      const { data: current } = await supabase
        .from('invoices').select('status').eq('id', invoiceId).single();
      if (current?.status === 'validated') {
        onDone('validated');
        return;
      }

      const updateData = {
        supplier_name: form.supplier_name || null,
        invoice_date: form.invoice_date || null,
        amount_ht: form.amount_ht !== '' ? Number(form.amount_ht) : null,
        amount_tva: form.amount_tva !== '' ? Number(form.amount_tva) : null,
        amount_ttc: form.amount_ttc !== '' ? Number(form.amount_ttc) : null,
        is_closer_invoice: form.is_closer_invoice,
        category_id: form.is_closer_invoice ? null : (form.category_id || null),
        extracted_by_ai: !!extracted,
        status: 'validated',
      };

      const { error: invErr } = await supabase.from('invoices').update(updateData).eq('id', invoiceId);
      if (invErr) throw invErr;

      if (form.is_closer_invoice && form.closer_lines.length > 0) {
        const validLines = form.closer_lines.filter(l => l.client_name && l.amount);

        if (validLines.length > 0) {
          const { error: linesErr } = await supabase.from('invoice_lines').insert(
            validLines.map(l => ({
              invoice_id: invoiceId,
              description: l.product_sold || null,
              client_name: l.client_name,
              closing_date: l.closing_date || null,
              product_sold: l.product_sold || null,
              total: Number(l.amount),
            }))
          );
          if (linesErr) throw linesErr;

          const { error: crErr } = await supabase.from('closing_records').insert(
            validLines.map(l => ({
              company_id: companyId,
              invoice_id: invoiceId,
              closer_name: l.closer_name || form.supplier_name || 'Inconnu',
              client_name: l.client_name,
              closing_date: l.closing_date || null,
              amount: Number(l.amount),
              product_sold: l.product_sold || null,
            }))
          );
          if (crErr) throw crErr;
        }
      } else if (!form.is_closer_invoice && form.category_id && form.amount_ht !== '') {
        const invoiceDate = form.invoice_date || new Date().toISOString().slice(0, 10);
        const month = parseInt(invoiceDate.slice(5, 7));
        const year = parseInt(invoiceDate.slice(0, 4));

        const { error: entryErr } = await supabase.from('cdr_entries').insert({
          company_id: companyId,
          category_id: form.category_id,
          month,
          year,
          amount: Number(form.amount_ht),
          source: 'invoice',
          invoice_id: invoiceId,
        });
        if (entryErr) throw entryErr;

        // Update supplier category hint — increment times_confirmed
        if (form.supplier_name) {
          const normalized = form.supplier_name.toLowerCase().trim();
          const { data: existing } = await supabase
            .from('supplier_category_hints')
            .select('id, times_confirmed')
            .eq('company_id', companyId)
            .eq('supplier_name_normalized', normalized)
            .maybeSingle();
          if (existing) {
            await supabase
              .from('supplier_category_hints')
              .update({ category_id: form.category_id, times_confirmed: (existing.times_confirmed || 0) + 1 })
              .eq('id', existing.id);
          } else {
            await supabase.from('supplier_category_hints').insert({
              company_id: companyId,
              supplier_name_normalized: normalized,
              category_id: form.category_id,
              times_confirmed: 1,
            });
          }
        }
      }

      onDone('validated');
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase.from('invoices').update({ status: 'rejected' }).eq('id', invoiceId);
      if (error) throw error;
      onDone('rejected');
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-violet-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-violet-50 border-b border-violet-100">
        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{item.fileName || file?.name || 'Facture'}</p>
          <p className="text-[11px] text-violet-600 font-medium">
            {extracted ? '✦ Données extraites par IA — vérifiez et validez' : 'Vérifiez et complétez les informations'}
          </p>
        </div>
        {item.fileUrl && (
          <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-violet-600 hover:underline font-medium flex-shrink-0">
            Voir fichier
          </a>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Basic fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Fournisseur</label>
            <input
              value={form.supplier_name}
              onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400"
              placeholder="Nom du fournisseur"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Date facture</label>
            <input
              type="date"
              value={form.invoice_date}
              onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Montant TTC</label>
            <div className="relative">
              <input
                type="number"
                value={form.amount_ttc}
                onChange={e => setForm(f => ({ ...f, amount_ttc: e.target.value }))}
                className="w-full px-3 py-2 pr-6 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400"
                placeholder="0.00"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Montant HT</label>
            <div className="relative">
              <input
                type="number"
                value={form.amount_ht}
                onChange={e => setForm(f => ({ ...f, amount_ht: e.target.value }))}
                className="w-full px-3 py-2 pr-6 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400"
                placeholder="0.00"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">TVA</label>
            <div className="relative">
              <input
                type="number"
                value={form.amount_tva}
                onChange={e => setForm(f => ({ ...f, amount_tva: e.target.value }))}
                className="w-full px-3 py-2 pr-6 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400"
                placeholder="0.00"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Type de facture</label>
            <div className="flex items-center gap-2 h-[38px]">
              <button
                onClick={() => setForm(f => ({ ...f, is_closer_invoice: !f.is_closer_invoice }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_closer_invoice ? 'bg-violet-600' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.is_closer_invoice ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-slate-600 font-medium">Facture closer</span>
            </div>
          </div>
        </div>

        {/* Category (non-closer) */}
        {!form.is_closer_invoice && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Catégorie CDR</label>
            <select
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-violet-400 bg-white"
            >
              <option value="">— Sélectionner une catégorie —</option>
              {leaves.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!form.category_id && (
              <p className="text-[11px] text-amber-600 mt-1">Sans catégorie, aucune ligne CDR ne sera créée</p>
            )}
          </div>
        )}

        {/* Closer lines */}
        {form.is_closer_invoice && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Deals closés</label>
              <button
                onClick={addLine}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter un deal
              </button>
            </div>
            {form.closer_lines.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Aucun deal extrait. Ajoutez manuellement ou vérifiez l'extraction.</p>
            ) : (
              <div>
                <div className="grid grid-cols-5 gap-2 mb-1">
                  {['Closer', 'Client', 'Date', 'Produit', 'Montant HT'].map(h => (
                    <span key={h} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</span>
                  ))}
                </div>
                {form.closer_lines.map((line, idx) => (
                  <CloserLineRow
                    key={idx}
                    line={line}
                    onChange={updated => updateLine(idx, updated)}
                    onRemove={() => removeLine(idx)}
                  />
                ))}
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  Total: {fmt(form.closer_lines.reduce((s, l) => s + (Number(l.amount) || 0), 0))} €
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            {saveError}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
          <button
            onClick={handleValidate}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            Valider
          </button>
          <button
            onClick={handleReject}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-100 disabled:opacity-60 transition-colors border border-red-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Rejeter
          </button>
        </div>
      </div>
    </div>
  );
}
