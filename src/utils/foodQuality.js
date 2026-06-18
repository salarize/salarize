/**
 * Quality scoring utilities for food invoice lines.
 * Returns scores 0–100 and structured issue lists.
 */

/**
 * Score a single invoice line for data quality (0–100).
 */
export function scoreInvoiceLine(line) {
  let score = 100;
  const issues = [];

  if (!line.raw_description || line.raw_description.trim().length < 2) {
    score -= 25; issues.push('description_missing');
  }
  if (!line.quantity || parseFloat(line.quantity) <= 0) {
    score -= 20; issues.push('quantity_invalid');
  }
  if (!line.unit_normalized) {
    score -= 20; issues.push('unit_ambiguous');
  }
  if (!line.unit_price_normalized && !line.total_price_ht) {
    score -= 20; issues.push('price_missing');
  }
  if (!line.article_id) {
    score -= 10; issues.push('article_unlinked');
  }
  if ((line.confidence ?? 1) < 0.7) {
    score -= 15; issues.push('low_ai_confidence');
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Score an entire import batch (0–100).
 */
export function scoreBatch(lines) {
  if (!lines.length) return { score: 0, issues: [] };
  const scores = lines.map(l => scoreInvoiceLine(l).score);
  return {
    score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    linesWithIssues: lines.filter(l => scoreInvoiceLine(l).score < 80).length,
    total: lines.length,
  };
}

/**
 * Return a label and colour class for a quality score.
 */
export function qualityLabel(score) {
  if (score >= 90) return { label: 'Excellent', color: 'text-green-400' };
  if (score >= 75) return { label: 'Bon', color: 'text-emerald-400' };
  if (score >= 55) return { label: 'Moyen', color: 'text-amber-400' };
  return { label: 'Faible', color: 'text-red-400' };
}

/**
 * Calculate what % of lines are confirmed vs total.
 */
export function confirmationRate(lines) {
  if (!lines.length) return 0;
  return Math.round((lines.filter(l => l.is_confirmed).length / lines.length) * 100);
}
