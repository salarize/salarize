import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';

export function useFoodCostData(companyId, { confirmedOnly = true } = {}) {
  const [suppliers, setSuppliers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [reviewLines, setReviewLines] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    let priceQuery = supabase
      .from('food_price_history')
      .select('*, food_articles(canonical_name, default_unit), food_suppliers(name)')
      .eq('company_id', companyId)
      .order('date', { ascending: false });

    let linesQuery = supabase
      .from('food_invoice_lines')
      .select('*, food_invoices(invoice_number, invoice_date, supplier_id, food_suppliers(name)), food_articles(canonical_name)')
      .eq('company_id', companyId);

    // If confirmedOnly, only show confirmed lines in price history
    if (confirmedOnly) {
      // Join through invoice_lines to filter confirmed
    }

    const [
      { data: sup },
      { data: art },
      { data: inv },
      { data: hist },
      { data: review },
      { data: anom },
    ] = await Promise.all([
      supabase.from('food_suppliers').select('*').eq('company_id', companyId).order('name'),
      supabase.from('food_articles').select('*, food_article_aliases(*)').eq('company_id', companyId).order('canonical_name'),
      supabase.from('food_invoices').select('*, food_suppliers(name)').eq('company_id', companyId).order('invoice_date', { ascending: false }),
      priceQuery,
      linesQuery.eq('needs_review', true).order('created_at', { ascending: false }),
      supabase.from('food_anomalies').select('*, food_articles(canonical_name), food_suppliers(name)').eq('company_id', companyId).eq('status', 'open').order('created_at', { ascending: false }),
    ]);

    setSuppliers(sup ?? []);
    setArticles(art ?? []);
    setInvoices(inv ?? []);
    setPriceHistory(hist ?? []);
    setReviewLines(review ?? []);
    setAnomalies(anom ?? []);
    setLoading(false);
  }, [companyId, confirmedOnly]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // VWAP calculation for an article (optionally filtered by supplier)
  const getVwap = useCallback((articleId, supplierId = null) => {
    const rows = priceHistory.filter(h =>
      h.article_id === articleId && (!supplierId || h.supplier_id === supplierId)
    );
    if (!rows.length) return null;
    const totalQty = rows.reduce((s, r) => s + (r.quantity_normalized ?? 0), 0);
    const totalCost = rows.reduce((s, r) => s + (r.quantity_normalized ?? 0) * (r.price_per_normalized_unit ?? 0), 0);
    return totalQty > 0 ? totalCost / totalQty : null;
  }, [priceHistory]);

  // Top articles by total spend
  const topArticlesBySpend = useCallback((limit = 10) => {
    const spending = {};
    for (const h of priceHistory) {
      if (!h.article_id) continue;
      spending[h.article_id] = (spending[h.article_id] ?? 0) + (h.quantity_normalized ?? 0) * (h.price_per_normalized_unit ?? 0);
    }
    return Object.entries(spending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, spend]) => ({
        article: articles.find(a => a.id === id),
        spend,
        vwap: getVwap(id),
      }))
      .filter(x => x.article);
  }, [priceHistory, articles, getVwap]);

  // Validate a review line → write to price_history and mark confirmed
  const validateLine = useCallback(async (lineId, articleId) => {
    const line = reviewLines.find(l => l.id === lineId);
    if (!line) return;

    await supabase.from('food_invoice_lines').update({
      needs_review: false,
      is_confirmed: true,
      article_id: articleId,
    }).eq('id', lineId);

    if (articleId && line.quantity_normalized && line.unit_price_normalized) {
      await supabase.from('food_price_history').insert({
        company_id: companyId,
        article_id: articleId,
        supplier_id: line.food_invoices?.supplier_id ?? null,
        invoice_line_id: lineId,
        date: line.food_invoices?.invoice_date ?? new Date().toISOString().slice(0, 10),
        quantity_normalized: line.quantity_normalized,
        price_per_normalized_unit: line.unit_price_normalized,
      });

      // Upsert alias if not already known
      if (line.raw_description) {
        await supabase.from('food_article_aliases').upsert({
          article_id: articleId,
          alias_text: line.raw_description.trim(),
          times_seen: 1,
        }, { onConflict: 'article_id,alias_text' });
      }
    }

    await fetchAll();
  }, [reviewLines, companyId, fetchAll]);

  // Bulk approve all high-confidence lines with an article linked
  const bulkApprove = useCallback(async () => {
    const approvable = reviewLines.filter(l => (l.confidence ?? 0) >= 0.85 && l.article_id);
    for (const line of approvable) {
      await validateLine(line.id, line.article_id);
    }
  }, [reviewLines, validateLine]);

  // Create a new article and link it to a review line
  const createArticleAndLink = useCallback(async (lineId, canonicalName, category, defaultUnit) => {
    const { data: article } = await supabase.from('food_articles').insert({
      company_id: companyId,
      canonical_name: canonicalName,
      category,
      default_unit: defaultUnit,
    }).select().single();

    if (!article) return;

    const line = reviewLines.find(l => l.id === lineId);
    if (line?.raw_description) {
      await supabase.from('food_article_aliases').insert({
        article_id: article.id,
        alias_text: line.raw_description.trim(),
        times_seen: 1,
      });
    }

    await validateLine(lineId, article.id);
  }, [companyId, reviewLines, validateLine]);

  // Update anomaly status
  const resolveAnomaly = useCallback(async (anomalyId, status) => {
    await supabase.from('food_anomalies').update({ status }).eq('id', anomalyId);
    setAnomalies(prev => prev.filter(a => a.id !== anomalyId));
  }, []);

  return {
    suppliers, articles, invoices, priceHistory, reviewLines, anomalies,
    loading, refetch: fetchAll,
    getVwap, topArticlesBySpend,
    validateLine, bulkApprove, createArticleAndLink,
    resolveAnomaly,
  };
}
