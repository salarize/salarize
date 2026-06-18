import { useState, useCallback } from 'react';
import { supabase } from '../../../config/supabase';

export function useFoodCorrections(companyId) {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadCorrections = useCallback(async (lineId) => {
    if (!lineId) return;
    setLoading(true);
    const { data } = await supabase
      .from('food_corrections')
      .select('*')
      .eq('line_id', lineId)
      .order('created_at', { ascending: false });
    setCorrections(data ?? []);
    setLoading(false);
  }, []);

  const recordCorrection = useCallback(async ({ lineId, fieldName, oldValue, newValue, editedBy }) => {
    if (!lineId || !fieldName) return;
    await supabase.from('food_corrections').insert({
      company_id: companyId,
      line_id: lineId,
      field_name: fieldName,
      old_value: oldValue != null ? String(oldValue) : null,
      new_value: newValue != null ? String(newValue) : null,
      edited_by: editedBy ?? null,
    });
  }, [companyId]);

  return { corrections, loading, loadCorrections, recordCorrection };
}
