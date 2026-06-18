// Supabase Edge Function — process-invoice
// Triggered by Database Webhook on INSERT into food_import_jobs
// NEVER called from the frontend directly. Claude API key stays server-side only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')!;
const MAX_CONCURRENT = 3;
const MAX_PDF_BYTES = 5 * 1024 * 1024;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Unit normalization ────────────────────────────────────────────────────

const WEIGHT_TO_KG: Record<string, number> = {
  mg: 0.000001, g: 0.001, gr: 0.001, gram: 0.001, gramme: 0.001,
  kg: 1, kilo: 1, kilogram: 1, kilogramme: 1,
  tonne: 1000, t: 1000,
  oz: 0.02835, lb: 0.4536, lbs: 0.4536,
};

const VOLUME_TO_L: Record<string, number> = {
  ml: 0.001, millilitre: 0.001, milliliter: 0.001,
  cl: 0.01, centilitre: 0.01, centiliter: 0.01,
  dl: 0.1, decilitre: 0.1, deciliter: 0.1,
  l: 1, litre: 1, liter: 1, lt: 1,
};

const COUNT_UNITS = new Set([
  'unit', 'units', 'pièce', 'piece', 'pc', 'pcs', 'boite', 'boîte',
  'carton', 'box', 'each', 'ea', 'portion', 'sachet', 'pot', 'bouteille',
  'bottle', 'can', 'boîte', 'barquette',
]);

interface NormalizedUnit {
  unit: 'kg' | 'L' | 'unit' | null;
  factor: number;
}

function normalizeUnit(rawUnit: string): NormalizedUnit {
  const u = rawUnit.toLowerCase().trim();

  // Composite: "12 x 500ml", "6x1kg", "12 × 500 g"
  const composite = u.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*([a-zéèêàâ]+)$/);
  if (composite) {
    const count = parseFloat(composite[1]);
    const qty = parseFloat(composite[2]);
    const unit = composite[3];
    const inner = normalizeUnit(unit);
    if (inner.unit) return { unit: inner.unit, factor: count * qty * inner.factor };
  }

  if (WEIGHT_TO_KG[u]) return { unit: 'kg', factor: WEIGHT_TO_KG[u] };
  if (VOLUME_TO_L[u]) return { unit: 'L', factor: VOLUME_TO_L[u] };
  if (COUNT_UNITS.has(u)) return { unit: 'unit', factor: 1 };

  // Embedded weight: "portion 150g"
  const embedded = u.match(/(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (embedded) {
    const qty = parseFloat(embedded[1]);
    const unit = embedded[2];
    if (WEIGHT_TO_KG[unit]) return { unit: 'kg', factor: qty * WEIGHT_TO_KG[unit] };
    if (VOLUME_TO_L[unit]) return { unit: 'L', factor: qty * VOLUME_TO_L[unit] };
  }

  return { unit: null, factor: 1 };
}

// Strip packaging weight suffix for article name matching
// "Tomates cerise 250g" → "Tomates cerise"
function stripWeightSuffix(name: string): string {
  return name.replace(/\s+\d+(?:\.\d+)?\s*(?:mg|g|gr|kg|ml|cl|dl|l|oz|lb|lbs|tonne)\s*$/i, '').trim();
}

// Simple fuzzy match (Levenshtein distance / character similarity)
function similarity(a: string, b: string): number {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  let matches = 0;
  for (const ch of shorter) if (longer.includes(ch)) matches++;
  return matches / longer.length;
}

// ─── Claude Vision extraction ──────────────────────────────────────────────

async function extractInvoiceWithClaude(pdfBase64: string): Promise<any> {
  const prompt = `Extract all invoice data from this PDF document. Return ONLY valid JSON with this exact structure:
{
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "supplier_name": "string or null",
  "supplier_address": "string or null",
  "total_ht": number or null,
  "total_tva": number or null,
  "total_ttc": number or null,
  "ht_ttc_ambiguous": boolean,
  "overall_confidence": number between 0 and 1,
  "line_items": [
    {
      "description": "string",
      "quantity": number or null,
      "unit": "string or null",
      "unit_price_ht": number or null,
      "unit_price_ttc": number or null,
      "total_ht": number or null,
      "total_ttc": number or null,
      "tva_rate": number or null,
      "confidence": number between 0 and 1
    }
  ]
}
Rules:
- Separate HT (excl. tax) from TTC (incl. tax) amounts. If you cannot tell which is which, set ht_ttc_ambiguous to true.
- All amounts in EUR as plain numbers (no currency symbols).
- Dates in YYYY-MM-DD format.
- confidence is your certainty per line (0=uncertain, 1=certain).
- overall_confidence is the average confidence across the document.
- Return ONLY the JSON object, no markdown, no explanation.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [{
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
        }, {
          type: 'text',
          text: prompt,
        }],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  return JSON.parse(cleaned);
}

// ─── Main handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Supabase Webhook payload has the new row under body.record
  const job = body.record ?? body;
  const jobId: string = job.id;
  const companyId: string = job.company_id;
  const fileUrl: string = job.file_url;
  const forceReimport: boolean = job.force_reimport ?? false;

  if (!jobId || !companyId || !fileUrl) {
    return new Response('Missing required fields', { status: 400 });
  }

  // Check concurrency — don't process if already at MAX_CONCURRENT
  const { count } = await supabase
    .from('food_import_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'processing');

  if ((count ?? 0) >= MAX_CONCURRENT) {
    // Re-queue: leave as pending, another invocation will pick it up
    return new Response('Queue full, will retry', { status: 202 });
  }

  // Mark as processing
  await supabase.from('food_import_jobs').update({
    status: 'processing',
    started_at: new Date().toISOString(),
  }).eq('id', jobId);

  try {
    // ── 1. Download PDF from Supabase Storage ──────────────────────────────
    // fileUrl is the storage path (e.g. "food-invoices/company_id/filename.pdf")
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoices')
      .download(fileUrl);

    if (downloadError || !fileData) {
      throw new Error(`Storage download failed: ${downloadError?.message}`);
    }

    const pdfBuffer = await fileData.arrayBuffer();

    if (pdfBuffer.byteLength > MAX_PDF_BYTES) {
      throw new Error(
        `PDF trop volumineux: ${(pdfBuffer.byteLength / 1024 / 1024).toFixed(1)} MB. Limite: 5 MB.`
      );
    }

    const pdfBase64 = arrayBufferToBase64(pdfBuffer);

    // ── 2. Extract with Claude ─────────────────────────────────────────────
    const extracted = await extractInvoiceWithClaude(pdfBase64);

    // ── 3. Duplicate invoice detection ────────────────────────────────────
    if (!forceReimport && extracted.invoice_number && extracted.invoice_date) {
      // Find or create supplier first (needed for duplicate check)
      let supplierId: string | null = null;
      if (extracted.supplier_name) {
        const { data: existingSupplier } = await supabase
          .from('food_suppliers')
          .select('id')
          .eq('company_id', companyId)
          .ilike('name', extracted.supplier_name.trim())
          .single();

        if (existingSupplier) {
          supplierId = existingSupplier.id;

          const { data: dupInvoice } = await supabase
            .from('food_invoices')
            .select('id, created_at')
            .eq('company_id', companyId)
            .eq('supplier_id', supplierId)
            .eq('invoice_number', extracted.invoice_number)
            .eq('invoice_date', extracted.invoice_date)
            .single();

          if (dupInvoice) {
            await supabase.from('food_import_jobs').update({
              status: 'duplicate_blocked',
              error_message: `Duplicate of invoice imported on ${new Date(dupInvoice.created_at).toLocaleDateString('fr-BE')}`,
              completed_at: new Date().toISOString(),
            }).eq('id', jobId);
            return new Response('Duplicate blocked', { status: 200 });
          }
        }
      }

      // ── 4. Upsert supplier ──────────────────────────────────────────────
      if (extracted.supplier_name && !supplierId) {
        const { data: newSupplier } = await supabase
          .from('food_suppliers')
          .insert({
            company_id: companyId,
            name: extracted.supplier_name.trim(),
            address: extracted.supplier_address ?? null,
          })
          .select('id')
          .single();
        supplierId = newSupplier?.id ?? null;
      }

      // ── 5. Create food_invoice record ───────────────────────────────────
      const { data: invoice, error: invoiceError } = await supabase
        .from('food_invoices')
        .insert({
          company_id: companyId,
          supplier_id: supplierId,
          invoice_number: extracted.invoice_number,
          invoice_date: extracted.invoice_date,
          file_url: fileUrl,
          total_ht: extracted.total_ht,
          total_tva: extracted.total_tva,
          total_ttc: extracted.total_ttc,
          status: 'pending',
          extraction_confidence: extracted.overall_confidence,
        })
        .select('id')
        .single();

      if (invoiceError || !invoice) throw new Error(`Invoice insert failed: ${invoiceError?.message}`);
      const invoiceId = invoice.id;

      // ── 6. Load all aliases for article matching ────────────────────────
      const { data: allAliases } = await supabase
        .from('food_article_aliases')
        .select('id, article_id, alias_text')
        .in('article_id', (
          await supabase.from('food_articles').select('id').eq('company_id', companyId)
        ).data?.map((a: any) => a.id) ?? []);

      // ── 7. Process each line item ───────────────────────────────────────
      const lines = extracted.line_items ?? [];
      let linesNeedingReview = 0;

      for (const item of lines) {
        const rawUnit = item.unit ?? '';
        const normalized = normalizeUnit(rawUnit);
        const qty = item.quantity ?? null;
        const qtyNorm = qty !== null && normalized.unit ? qty * normalized.factor : null;
        const totalHt = item.total_ht ?? null;
        const unitPriceNorm = qtyNorm && totalHt ? totalHt / qtyNorm : null;

        // Fuzzy article matching
        const cleanName = stripWeightSuffix(item.description ?? '');
        let bestArticleId: string | null = null;
        let bestScore = 0;

        for (const alias of allAliases ?? []) {
          const score = similarity(cleanName, alias.alias_text);
          if (score > bestScore) { bestScore = score; bestArticleId = alias.article_id; }
        }

        const autoLinked = bestScore >= 0.85;
        const suggested = bestScore >= 0.6 && bestScore < 0.85;

        const needsReview =
          (item.confidence ?? 1) < 0.7 ||
          normalized.unit === null ||
          (!autoLinked) ||
          (extracted.ht_ttc_ambiguous ?? false);

        if (needsReview) linesNeedingReview++;

        await supabase.from('food_invoice_lines').insert({
          invoice_id: invoiceId,
          company_id: companyId,
          raw_description: item.description,
          article_id: autoLinked ? bestArticleId : null,
          quantity: qty,
          unit_raw: rawUnit,
          unit_normalized: normalized.unit,
          quantity_normalized: qtyNorm,
          unit_price_raw: item.unit_price_ht ?? item.unit_price_ttc ?? null,
          unit_price_normalized: unitPriceNorm,
          total_price_ht: totalHt,
          tva_rate: item.tva_rate ?? null,
          total_price_ttc: item.total_ttc ?? null,
          confidence: item.confidence ?? extracted.overall_confidence,
          needs_review: needsReview,
        });
      }

      // ── 8. Mark job done ────────────────────────────────────────────────
      await supabase.from('food_import_jobs').update({
        status: 'done',
        lines_extracted: lines.length,
        lines_needing_review: linesNeedingReview,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);

      return new Response(JSON.stringify({ ok: true, lines: lines.length }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Fallback if no invoice_number or date — still process lines
    // (rare: some delivery notes don't have invoice numbers)
    await supabase.from('food_import_jobs').update({
      status: 'done',
      lines_extracted: (extracted.line_items ?? []).length,
      lines_needing_review: (extracted.line_items ?? []).length,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    return new Response('Processed without duplicate check', { status: 200 });

  } catch (err: any) {
    await supabase.from('food_import_jobs').update({
      status: 'error',
      error_message: err.message ?? 'Unknown error',
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});
