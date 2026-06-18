import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';

function FoodDuplicateResolver({ companyId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    loadDuplicates();
  }, [companyId]);

  async function loadDuplicates() {
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
  }

  async function resolve(groupId, resolution) {
    await supabase.from('food_duplicate_groups').update({ status: resolution }).eq('id', groupId);
    setGroups(prev => prev.filter(g => g.id !== groupId));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!groups.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-white font-bold text-lg">Aucun doublon détecté</h3>
      <p className="text-slate-400 text-sm mt-2">Les imports futurs seront vérifiés automatiquement.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm">{groups.length} groupe{groups.length > 1 ? 's' : ''} de doublons suspects</p>
      {groups.map(group => (
        <div key={group.id} className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800/60 flex items-center justify-between">
            <p className="text-white font-semibold text-sm">Groupe doublon</p>
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
                  <p>Fournisseur: {line.food_invoices?.food_suppliers?.name ?? '—'}</p>
                  <p>Date: {line.food_invoices?.invoice_date ?? '—'}</p>
                  <p>N°: {line.food_invoices?.invoice_number ?? '—'}</p>
                  <p>Qté: {line.quantity_normalized?.toFixed(3) ?? '—'} {line.unit_normalized ?? ''}</p>
                  <p>Prix: {line.unit_price_normalized?.toFixed(4) ?? '—'} €/unité</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default FoodDuplicateResolver;
