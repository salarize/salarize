export function normalizeSearchToken(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function filterPayrollEmployees(rows, search) {
  if (!Array.isArray(rows)) return [];

  const token = normalizeSearchToken(search);
  if (!token) return rows;

  return rows.filter((row) => {
    const haystack = normalizeSearchToken(
      `${row?.name || ''} ${row?.dept || ''} ${row?.function || ''}`
    );
    return haystack.includes(token);
  });
}
