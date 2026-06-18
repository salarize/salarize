import { supabase } from '../config/supabase';

/**
 * Detect price increases above a threshold vs historical average.
 * Returns array of alert objects.
 */
export function detectPriceIncrease(newLines, priceHistory, threshold = 0.15) {
  const alerts = [];
  for (const line of newLines) {
    if (!line.article_id || !line.unit_price_normalized) continue;
    const history = priceHistory.filter(h => h.article_id === line.article_id);
    if (history.length < 2) continue;
    const avgPrice = history.reduce((s, h) => s + (h.price_per_normalized_unit ?? 0), 0) / history.length;
    const pctChange = (line.unit_price_normalized - avgPrice) / avgPrice;
    if (pctChange > threshold) {
      alerts.push({
        anomaly_type: 'price_increase',
        severity: pctChange > 0.3 ? 'high' : 'medium',
        article_id: line.article_id,
        supplier_id: line.food_invoices?.supplier_id ?? null,
        invoice_line_id: line.id,
        description: `Prix ${(pctChange * 100).toFixed(1)}% au-dessus de la moyenne historique`,
        value: line.unit_price_normalized,
        threshold: avgPrice * (1 + threshold),
      });
    }
  }
  return alerts;
}

/**
 * Detect lines with unusual quantities (> 3 std deviations from mean for that article).
 */
export function detectUnusualQuantity(newLines, priceHistory) {
  const alerts = [];
  for (const line of newLines) {
    if (!line.article_id || !line.quantity_normalized) continue;
    const history = priceHistory.filter(h => h.article_id === line.article_id);
    if (history.length < 3) continue;
    const quantities = history.map(h => h.quantity_normalized ?? 0);
    const mean = quantities.reduce((a, b) => a + b, 0) / quantities.length;
    const std = Math.sqrt(quantities.reduce((a, b) => a + (b - mean) ** 2, 0) / quantities.length);
    if (std > 0 && Math.abs(line.quantity_normalized - mean) > 3 * std) {
      alerts.push({
        anomaly_type: 'unusual_quantity',
        severity: 'low',
        article_id: line.article_id,
        invoice_line_id: line.id,
        description: `Quantité inhabituelle: ${line.quantity_normalized?.toFixed(2)} ${line.unit_normalized} (moy: ${mean.toFixed(2)})`,
        value: line.quantity_normalized,
        threshold: mean + 3 * std,
      });
    }
  }
  return alerts;
}

/**
 * Detect lines with unknown/ambiguous units.
 */
export function detectUnknownUnits(lines) {
  return lines
    .filter(l => !l.unit_normalized)
    .map(l => ({
      anomaly_type: 'unknown_unit',
      severity: 'medium',
      invoice_line_id: l.id,
      description: `Unité non reconnue: "${l.unit_raw ?? ''}"`,
      value: null,
      threshold: null,
    }));
}

/**
 * Detect lines without a linked supplier.
 */
export function detectMissingSupplier(invoices) {
  return invoices
    .filter(inv => !inv.supplier_id)
    .map(inv => ({
      anomaly_type: 'missing_supplier',
      severity: 'low',
      description: `Facture ${inv.invoice_number ?? inv.id} sans fournisseur identifié`,
      value: null,
      threshold: null,
    }));
}

/**
 * Persist generated alerts to food_anomalies table.
 * Skips existing open anomalies for the same line+type.
 */
export async function persistAlerts(companyId, alerts) {
  if (!alerts.length) return;
  const rows = alerts.map(a => ({ ...a, company_id: companyId, status: 'open' }));
  await supabase.from('food_anomalies').upsert(rows, { onConflict: 'invoice_line_id,anomaly_type', ignoreDuplicates: true });
}
