import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';

export function useCDRData(companyId) {
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [budget, setBudget] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      // Seed categories if none exist
      await supabase.rpc('seed_cdr_categories', { p_company_id: companyId });

      const [catRes, entRes, budRes, invRes] = await Promise.all([
        supabase.from('cdr_categories').select('*').eq('company_id', companyId).order('sort_order'),
        supabase.from('cdr_entries').select('*').eq('company_id', companyId),
        supabase.from('cdr_budget').select('*').eq('company_id', companyId),
        supabase.from('invoices').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      ]);

      if (catRes.error) throw catRes.error;
      if (entRes.error) throw entRes.error;
      if (budRes.error) throw budRes.error;

      setCategories(catRes.data || []);
      setEntries(entRes.data || []);
      setBudget(budRes.data || []);
      setInvoices(invRes.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  // Upsert a single cell value (month/year/category)
  const upsertEntry = useCallback(async (companyId, categoryId, month, year, amount) => {
    const { error } = await supabase.from('cdr_entries').upsert({
      company_id: companyId,
      category_id: categoryId,
      month,
      year,
      amount,
      source: 'manual',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,category_id,month,year,source' });
    if (!error) {
      setEntries(prev => {
        const idx = prev.findIndex(e =>
          e.company_id === companyId &&
          e.category_id === categoryId &&
          e.month === month &&
          e.year === year &&
          e.source === 'manual'
        );
        const updated = { company_id: companyId, category_id: categoryId, month, year, amount, source: 'manual' };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...updated };
          return next;
        }
        return [...prev, updated];
      });
    }
    return error;
  }, []);

  // Update category status
  const updateCategoryStatus = useCallback(async (categoryId, status) => {
    const { error } = await supabase.from('cdr_categories').update({ status }).eq('id', categoryId);
    if (!error) setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, status } : c));
    return error;
  }, []);

  // Upsert budget
  const upsertBudget = useCallback(async (companyId, categoryId, month, year, budgetAmount) => {
    const { error } = await supabase.from('cdr_budget').upsert({
      company_id: companyId,
      category_id: categoryId,
      month,
      year,
      budget_amount: budgetAmount,
    }, { onConflict: 'company_id,category_id,month,year' });
    if (!error) {
      setBudget(prev => {
        const idx = prev.findIndex(b =>
          b.company_id === companyId && b.category_id === categoryId && b.month === month && b.year === year
        );
        const updated = { company_id: companyId, category_id: categoryId, month, year, budget_amount: budgetAmount };
        if (idx >= 0) {
          const next = [...prev]; next[idx] = { ...next[idx], ...updated }; return next;
        }
        return [...prev, updated];
      });
    }
    return error;
  }, []);

  return { categories, entries, budget, invoices, loading, error, reload: load, upsertEntry, upsertBudget, updateCategoryStatus };
}
