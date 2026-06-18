import { supabase } from '../config/supabase';

/**
 * Compute SHA-256 hash of a File object.
 * Uses browser's built-in crypto.subtle — no extra dependency.
 */
export async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a file with this hash was already uploaded for this company.
 * Returns the existing job row, or null.
 */
export async function findDuplicateFile(companyId, fileHash) {
  const { data } = await supabase
    .from('food_import_jobs')
    .select('id, file_name, created_at, status')
    .eq('company_id', companyId)
    .eq('file_hash', fileHash)
    .not('status', 'eq', 'error')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data ?? null;
}

/**
 * Build a string key that identifies an invoice uniquely.
 * Used for detecting duplicate invoices (same supplier + number + date).
 */
export function buildInvoiceDuplicateKey(invoice) {
  const supplier = (invoice.supplier_name ?? invoice.supplier_id ?? '').toString().toLowerCase().trim();
  const number = (invoice.invoice_number ?? '').toString().toLowerCase().trim();
  const date = (invoice.invoice_date ?? '').toString().slice(0, 10);
  return `${supplier}::${number}::${date}`;
}

/**
 * Build a string key for an invoice line.
 * Includes supplier + date so repeated legitimate purchases on different days
 * are NOT flagged as duplicates. Only same-supplier same-day exact matches are.
 */
export function buildLineDuplicateKey(line) {
  const desc = (line.raw_description ?? '').toLowerCase().trim();
  const qty = parseFloat(line.quantity_normalized ?? line.quantity ?? 0).toFixed(4);
  const price = parseFloat(line.unit_price_normalized ?? line.unit_price_raw ?? 0).toFixed(4);
  const supplier = (line.food_invoices?.supplier_id ?? line.supplier_id ?? '').toString();
  const date = (line.food_invoices?.invoice_date ?? '').toString().slice(0, 10);
  return `${desc}::${qty}::${price}::${supplier}::${date}`;
}

/**
 * Given a list of invoice lines, find groups of suspected duplicates.
 * Returns Map<key, line[]> where each value has 2+ entries.
 */
export function detectDuplicateLines(lines) {
  const groups = new Map();
  for (const line of lines) {
    const key = buildLineDuplicateKey(line);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(line);
  }
  // Return only groups with duplicates
  return new Map([...groups.entries()].filter(([, v]) => v.length > 1));
}

/**
 * Given a list of invoices, return those that share a duplicate key.
 */
export function detectDuplicateInvoices(invoices) {
  const seen = new Map();
  const duplicates = [];
  for (const inv of invoices) {
    const key = buildInvoiceDuplicateKey(inv);
    if (seen.has(key)) {
      duplicates.push({ original: seen.get(key), duplicate: inv });
    } else {
      seen.set(key, inv);
    }
  }
  return duplicates;
}
