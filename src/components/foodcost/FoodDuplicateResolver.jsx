import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../config/supabase';
import { detectDuplicateLines } from '../../utils/foodDuplicates';

function FoodDuplicateResolver({ companyId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState(null);

  const loadDuplicates = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data: dupGroups } = await supabase
      .from('food_duplicate_groups')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!dupGroups?.length) { setGroups([]); setLoading(false); return; }

    const groupsWithLines = await Promise.all(dupGroups.map(async (g) => {
      const { data: lines } = await supabase
        .from('food_invoice_lines')
        .select('*, food_invoices(invoice_number, invoice_date, food_suppliers(name))')
        .eq('duplicate_group_id', g.id);
      return { ...g, lines: lines ?? [] };
    }));

    setGroups(groupsWithLines.filter(g => g.lines.length > 1));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { loadDuplicates(); }, [loadDuplicates]);

  // Client-side scan: fetch all unconfirmed ungrouped lines, run detectDuplicateLines,
  // create food_duplicate_groups records and link lines via duplicate_group_id
  const runDetection = useCallback(async () => {
    if (!companyId) return;
    setDetecting(true);
    setDetectResult(null);

    const { data: lines } = await supabase
      .from('food_invoice_lines')
      .select('id, raw_description, quantity_normalized, unit_price_normalized, food_invoices(invoice_number, invoice_date, food_suppliers(name))')
      .eq('company_id', companyId)
      .eq('is_confirmed', false)
      .is('duplicate_group_id', null);

    if (!lines?.length) {
      setDetectResult({ created: 0 });
      setDetecting(false);
      return;
    }

    const dupMap = detectDuplicateLines(lines);
    let created = 0;

    for (const [key, dupLines] of dupMap.entries()) {
      const { data: group } = await supabase
        .from('food_duplicate_groups')
        .insert({ company_id: companyId, status: 'pending', duplicate_key: key })
        .select()
        .single();

      if (!group) continue;
      created++;

      await supabase
        .from('food_invoice_lines')
        .update({ duplicate_group_id: group.id })
        .in('id', dupLines.map(l => l.id));
    }

    setDetectResult({ created });
    setDetecting(false);
    await loadDuplicates();
  }, [companyId, loadDuplicates]);

  async function resolve(groupId, resolution) {
    await supabase.from('food_duplicate_groups').update({ status: resolution }).eq('id', groupId);
    if (resolution === 'resolved_keep_both') {
      await supabase.from('food_invoice_lines').update({ duplicate_group_id: null }).eq('duplicate_group_id', groupId);
    }
    setGroups(prev => prev.filter(g => g.id !== groupId));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Detection control bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">
            {groups.length > 0
              ? `${groups.length} groupe${groups.length > 1 ? 's' : ''} de doublons suspects`
              : 'Aucun doublon en attente.'}
          </p>
          {detectResult && (
            <p className="text-slate-500 text-xs mt-1">
              Analyse terminée — {detectResult.created} nouveau{detectResult.created !== 1 ? 'x' : ''} groupe{detectResult.created !== 1 ? 's' : ''} créé{detectResult.created !== 1 ? 's' : ''}.
            </p>
          )}
        </div>
        <button
          onClick={runDetection}
          disabled={detecting}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 font-semibold rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {detecting ? (
            <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin inline-block" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          {detecting ? 'Analyse...' : 'Détecter les doublons'}
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-lg">Aucun doublon</h3>
          <p className="text-slate-400 text-sm mt-2">Cliquez "Détecter les doublons" pour analyser les lignes non confirmées.</p>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.id} className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800/60 flex items-center justify-between">
              <p className="text-white font-semibold text-sm">Doublon suspect</p>
              <div className="flex items-center gap-2">
                <button onClick={() => resolve(group.id, 'resolved_keep_both')} className="px-3 py-1 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Garder les deux</button>
                <button onClick={() => resolve(group.id, 'resolved_ignore')} className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">Ignorer</button>
                <button onClick={() => resolve(group.id, 'resolved_merge')} className="px-3 py-1 text-xs text-orange-300 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg transition-colors">Fusionner</button>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-800/60">
              {group.lines.slice(0, 2).map((line, i) => (
                <div key={line.id} className="p-4">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Entrée {i + 1}</p>
                  <p className="text-slate-200 text-sm font-medium">{line.raw_description ?? '—'}</p>
                  <div className="mt-2 space-y-1 text-xs text-slate-400">
                    <p>Fournisseur : {line.food_invoices?.food_suppliers?.name ?? '—'}</p>
                    <p>Date : {line.food_invoices?.invoice_date ?? '—'}</p>
                    <p>N° : {line.food_invoices?.invoice_number ?? '—'}</p>
                    <p>Qté : {line.quantity_normalized?.toFixed(3) ?? '—'} {line.unit_normalized ?? ''}</p>
                    <p>Prix : {line.unit_price_normalized?.toFixed(4) ?? '—'} €/unité</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default FoodDuplicateResolver;
