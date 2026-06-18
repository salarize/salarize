// Client-side unit normalization — mirrors Edge Function logic
// Used for display, recalculation after inline edits, and ambiguity flagging.

const WEIGHT_TO_KG = {
  mg: 0.000001, g: 0.001, gr: 0.001, gram: 0.001, gramme: 0.001,
  kg: 1, kilo: 1, kilogram: 1, kilogramme: 1,
  tonne: 1000, t: 1000,
  oz: 0.02835, lb: 0.4536, lbs: 0.4536,
};

const VOLUME_TO_L = {
  ml: 0.001, millilitre: 0.001, milliliter: 0.001,
  cl: 0.01, centilitre: 0.01, centiliter: 0.01,
  dl: 0.1, decilitre: 0.1, deciliter: 0.1,
  l: 1, litre: 1, liter: 1, lt: 1,
};

const COUNT_UNITS = new Set([
  'unit', 'units', 'pièce', 'piece', 'pc', 'pcs', 'boite', 'boîte',
  'carton', 'box', 'each', 'ea', 'portion', 'sachet', 'pot',
  'bouteille', 'bottle', 'can', 'barquette', 'colis',
]);

const AMBIGUOUS_UNITS = new Set([
  'box', 'crate', 'case', 'pallet', 'pack', 'colis', 'carton',
  'boite', 'boîte', 'barquette',
]);

/**
 * Parse a number that may use comma or dot as decimal separator.
 * "1.234,56" → 1234.56 / "1,234.56" → 1234.56 / "1.5" → 1.5
 */
export function parseLocaleNumber(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  // If both separators present, determine which is decimal
  if (s.includes(',') && s.includes('.')) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      // comma is decimal: "1.234,56" → remove dots, replace comma
      return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    } else {
      // dot is decimal: "1,234.56" → remove commas
      return parseFloat(s.replace(/,/g, ''));
    }
  }
  // Only comma: treat as decimal separator
  if (s.includes(',')) return parseFloat(s.replace(',', '.'));
  return parseFloat(s);
}

/**
 * Normalize a raw unit string.
 * Returns { unit: 'kg'|'L'|'unit'|null, factor: number, ambiguous: boolean }
 */
export function normalizeUnit(unitRaw, quantity = 1) {
  if (!unitRaw) return { unit: null, factor: 1, ambiguous: true };
  const u = unitRaw.toLowerCase().trim();

  // Composite pack: "12 x 500ml", "6x1kg", "12 × 500 g"
  const composite = u.match(/^(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*([a-zéèêàâ]+)$/);
  if (composite) {
    const count = parseLocaleNumber(composite[1]);
    const qty = parseLocaleNumber(composite[2]);
    const inner = normalizeUnit(composite[3], 1);
    if (inner.unit) return { unit: inner.unit, factor: count * qty * inner.factor, ambiguous: false };
  }

  if (WEIGHT_TO_KG[u]) return { unit: 'kg', factor: WEIGHT_TO_KG[u], ambiguous: false };
  if (VOLUME_TO_L[u]) return { unit: 'L', factor: VOLUME_TO_L[u], ambiguous: false };
  if (COUNT_UNITS.has(u)) return { unit: 'unit', factor: 1, ambiguous: false };

  // Embedded weight: "portion 150g", "pot 200ml"
  const embedded = u.match(/(\d+(?:[.,]\d+)?)\s*([a-z]+)$/);
  if (embedded) {
    const qty = parseLocaleNumber(embedded[1]);
    const sub = embedded[2];
    if (WEIGHT_TO_KG[sub]) return { unit: 'kg', factor: qty * WEIGHT_TO_KG[sub], ambiguous: false };
    if (VOLUME_TO_L[sub]) return { unit: 'L', factor: qty * VOLUME_TO_L[sub], ambiguous: false };
  }

  return { unit: null, factor: 1, ambiguous: true };
}

/**
 * Parse composite pack size from a product description.
 * "Carton 12 x 500ml" → { count: 12, qty: 500, unit: 'ml' }
 */
export function parsePackSize(description) {
  if (!description) return null;
  const match = description.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Zéèêàâ]+)/i);
  if (!match) return null;
  return {
    count: parseLocaleNumber(match[1]),
    qty: parseLocaleNumber(match[2]),
    unit: match[3].toLowerCase(),
  };
}

/**
 * Calculate normalized unit price from a line object.
 * Returns null if data is insufficient.
 */
export function calculateNormalizedUnitPrice(line) {
  const qty = parseLocaleNumber(line.quantity);
  const unitRaw = line.unit_raw ?? line.unit ?? '';
  const totalHt = parseLocaleNumber(line.total_price_ht ?? line.total_ht);
  if (!qty || !totalHt) return null;
  const { unit, factor, ambiguous } = normalizeUnit(unitRaw, qty);
  if (!unit || ambiguous) return null;
  const qtyNorm = qty * factor;
  return { unit, qtyNorm, unitPriceNorm: totalHt / qtyNorm };
}

/**
 * Returns true if the unit requires human review before normalizing.
 */
export function isAmbiguousUnit(unitRaw) {
  if (!unitRaw) return true;
  const u = unitRaw.toLowerCase().trim();
  if (AMBIGUOUS_UNITS.has(u)) return true;
  const { ambiguous } = normalizeUnit(unitRaw);
  return ambiguous;
}

/**
 * Format a normalized price for display.
 * e.g. 1.167 → "1,167 €/kg"
 */
export function formatUnitPrice(price, unit) {
  if (price == null || !unit) return '—';
  return `${price.toLocaleString('fr-BE', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €/${unit}`;
}
