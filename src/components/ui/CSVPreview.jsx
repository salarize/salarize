import React, { useMemo } from 'react';

export function CSVPreview({ rows, maxRows = 3, maxColumns = 8, title = 'Apercu du fichier' }) {
  const preview = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const safeRows = rows.map((row) => (Array.isArray(row) ? row : [row]));
    const firstRow = safeRows[0] || [];
    const maxDetectedColumns = safeRows.reduce((max, row) => Math.max(max, row.length), 0);
    const totalColumns = Math.max(firstRow.length, maxDetectedColumns);
    const visibleColumns = Math.min(maxColumns, totalColumns);

    const header = Array.from({ length: visibleColumns }, (_, index) => {
      const value = String(firstRow[index] ?? '').trim();
      return value || `Col ${index + 1}`;
    });

    const bodyRows = safeRows.slice(1, 1 + maxRows).map((row) =>
      Array.from({ length: visibleColumns }, (_, index) => String(row[index] ?? '').trim())
    );

    return {
      header,
      bodyRows,
      totalRows: safeRows.length,
      totalColumns,
      hasMoreRows: safeRows.length > 1 + maxRows,
      hasMoreCols: totalColumns > visibleColumns,
    };
  }, [rows, maxRows, maxColumns]);

  if (!preview) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60">
      <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
        <p className="text-[11px] text-slate-500">
          {preview.totalRows} lignes | {preview.totalColumns} colonnes
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white border-b border-slate-200">
              {preview.header.map((cell, index) => (
                <th key={index} className="px-2 py-1.5 text-left font-semibold text-slate-600 whitespace-nowrap">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.bodyRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-slate-100 last:border-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-2 py-1.5 text-slate-700 whitespace-nowrap max-w-[180px] truncate">
                    {cell || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(preview.hasMoreRows || preview.hasMoreCols) && (
        <div className="px-3 py-2 border-t border-slate-200 text-[11px] text-slate-500">
          {preview.hasMoreRows ? `+${preview.totalRows - (1 + maxRows)} lignes` : null}
          {preview.hasMoreRows && preview.hasMoreCols ? ' | ' : null}
          {preview.hasMoreCols ? `+${preview.totalColumns - Math.min(maxColumns, preview.totalColumns)} colonnes` : null}
          {' '}non affichees
        </div>
      )}
    </div>
  );
}
