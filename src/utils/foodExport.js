import * as XLSX from 'xlsx';

function download(wb, filename) {
  XLSX.writeFile(wb, filename);
}

/**
 * Export invoice lines to XLSX.
 */
export function exportInvoiceLinesToXlsx(lines, filename = 'food_invoice_lines.xlsx') {
  const rows = lines.map(l => ({
    'Description': l.raw_description ?? '',
    'SKU': l.sku ?? '',
    'Article': l.food_articles?.canonical_name ?? '',
    'Fournisseur': l.food_invoices?.food_suppliers?.name ?? '',
    'Date facture': l.food_invoices?.invoice_date ?? '',
    'N° facture': l.food_invoices?.invoice_number ?? '',
    'Quantité': l.quantity ?? '',
    'Unité brute': l.unit_raw ?? '',
    'Unité normalisée': l.unit_normalized ?? '',
    'Qté normalisée': l.quantity_normalized ?? '',
    'Prix unitaire HT': l.unit_price_raw ?? '',
    'Prix/unité normalisé': l.unit_price_normalized ?? '',
    'Total HT': l.total_price_ht ?? '',
    'TVA %': l.tva_rate != null ? (l.tva_rate * 100).toFixed(1) : '',
    'Total TTC': l.total_price_ttc ?? '',
    'Confiance': l.confidence != null ? `${Math.round(l.confidence * 100)}%` : '',
    'Confirmé': l.is_confirmed ? 'Oui' : 'Non',
    'À vérifier': l.needs_review ? 'Oui' : 'Non',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lignes factures');
  download(wb, filename);
}

/**
 * Export supplier comparison data to XLSX.
 */
export function exportSupplierComparisonToXlsx(rows, articleName, filename) {
  const data = rows.map(r => ({
    'Fournisseur': r.supplier?.name ?? '',
    'VWAP (€/unité)': r.vwap?.toFixed(4) ?? '',
    'Dernière facture': r.lastDate ?? '',
    'Volume total acheté': r.totalQty?.toFixed(3) ?? '',
    'Nombre achats': r.rows?.length ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, articleName ?? 'Comparaison');
  download(wb, filename ?? `comparaison_${articleName ?? 'article'}.xlsx`);
}

/**
 * Export anomalies to XLSX.
 */
export function exportAnomaliesToXlsx(anomalies, filename = 'food_anomalies.xlsx') {
  const rows = anomalies.map(a => ({
    'Type': a.anomaly_type ?? '',
    'Sévérité': a.severity ?? '',
    'Description': a.description ?? '',
    'Article': a.food_articles?.canonical_name ?? '',
    'Fournisseur': a.food_suppliers?.name ?? '',
    'Valeur': a.value ?? '',
    'Seuil': a.threshold ?? '',
    'Statut': a.status ?? '',
    'Date': a.created_at ? new Date(a.created_at).toLocaleDateString('fr-BE') : '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Anomalies');
  download(wb, filename);
}

/**
 * Export import history to XLSX.
 */
export function exportImportHistoryToXlsx(jobs, filename = 'food_import_history.xlsx') {
  const rows = jobs.map(j => ({
    'Fichier': j.file_name ?? '',
    'Statut': j.status ?? '',
    'Lignes extraites': j.lines_extracted ?? 0,
    'Lignes à vérifier': j.lines_needing_review ?? 0,
    'Erreur': j.error_message ?? '',
    'Démarré': j.started_at ? new Date(j.started_at).toLocaleString('fr-BE') : '',
    'Terminé': j.completed_at ? new Date(j.completed_at).toLocaleString('fr-BE') : '',
    'Tentatives': j.retry_count ?? 0,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historique imports');
  download(wb, filename);
}
