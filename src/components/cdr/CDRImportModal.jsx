import React, { useEffect, useRef, useState } from 'react';
import { CSVPreview, CSVProgressSteps } from '../ui';

const MONTHS_FR = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

function parseCSV(text) {
  const lines = text.trim().split('\n').map((line) => line.split(/[,;\t]/));
  return lines;
}

function extractGSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function CDRImportModal({ onClose, onImport, categories, year }) {
  const [tab, setTab] = useState('csv'); // 'csv' | 'gsheet'
  const [gsheetUrl, setGsheetUrl] = useState('');
  const [csvData, setCSVData] = useState(null); // 2D array
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [csvStep, setCsvStep] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [importType, setImportType] = useState('real'); // 'real' | 'budget'
  const [mapping, setMapping] = useState({}); // rowIndex -> categoryId
  const [colMapping, setColMapping] = useState({}); // colIndex -> month (1-12) or null
  const fileRef = useRef(null);

  const leaves = categories.filter((c) => !categories.some((p) => p.parent_id === c.id));

  const detectMonthColumns = (rows) => {
    if (!rows?.length) return;
    const header = rows[0] || [];
    const autoCol = {};
    header.forEach((cell, i) => {
      const cleaned = String(cell || '').trim().toLowerCase();
      MONTHS_FR.forEach((month, monthIndex) => {
        if (cleaned.includes(month.toLowerCase().slice(0, 3))) autoCol[i] = monthIndex + 1;
      });
    });
    setColMapping(autoCol);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    try {
      setCsvStep('read');
      const text = typeof file.text === 'function'
        ? await file.text()
        : await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result || '');
            reader.onerror = reject;
            reader.readAsText(file);
          });

      setCsvStep('validate');
      await new Promise((resolve) => setTimeout(resolve, 150));

      const rows = parseCSV(String(text || ''));
      setCSVData(rows);
      detectMonthColumns(rows);
      setShowPreview(true);
    } catch (err) {
      setError(err?.message || 'Impossible de lire le fichier CSV');
    } finally {
      setCsvStep(null);
    }
  };

  const fetchGSheet = async () => {
    const id = extractGSheetId(gsheetUrl);
    if (!id) {
      setError('URL Google Sheets invalide');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Impossible de charger la feuille. Verifiez que le partage est active.');
      }

      const text = await res.text();
      const rows = parseCSV(text);
      setCSVData(rows);
      detectMonthColumns(rows);
      setShowPreview(true);
    } catch (err) {
      setError(err?.message || 'Erreur de chargement Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleImport = async () => {
    if (!csvData) return;

    const results = []; // { categoryId, month, year, amount, source }
    csvData.forEach((row, rowIndex) => {
      const categoryId = mapping[rowIndex];
      if (!categoryId) return;

      Object.entries(colMapping).forEach(([colIndex, month]) => {
        if (!month) return;
        const raw = String(row[colIndex] || '')
          .replace(/[^\d,.-]/g, '')
          .replace(',', '.')
          .trim();
        const amount = parseFloat(raw);

        if (!Number.isNaN(amount) && amount !== 0) {
          results.push({
            categoryId,
            month,
            year,
            amount,
            source: importType === 'budget' ? 'import' : 'manual'
          });
        }
      });
    });

    setCsvStep('import');
    try {
      await onImport(results, importType);
      onClose();
    } finally {
      setCsvStep(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Importer des donnees CDR</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex gap-2 border-b border-slate-100 pb-3">
            {[['csv', 'Fichier CSV'], ['gsheet', 'Google Sheets']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key);
                  setCSVData(null);
                  setError('');
                  setShowPreview(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type d'import :</span>
            {[['real', 'Donnees reelles'], ['budget', 'Budget']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setImportType(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${importType === key ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'csv' && (
            <div>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all"
              >
                <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium text-slate-500">{fileName || 'Cliquer pour choisir un fichier CSV'}</p>
                <p className="text-xs text-slate-400 mt-1">Formats acceptes: .csv, virgule, point-virgule ou tabulation</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
            </div>
          )}

          {tab === 'gsheet' && (
            <div className="flex gap-2">
              <input
                type="url"
                value={gsheetUrl}
                onChange={(e) => setGsheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-violet-400"
              />
              <button
                onClick={fetchGSheet}
                disabled={loading || !gsheetUrl}
                className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '...' : 'Charger'}
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {csvData && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {csvData.length} lignes detectees - Mapper les lignes aux categories CDR
              </p>

              {showPreview && (
                <CSVPreview
                  rows={csvData}
                  title="Preview CSV (3 lignes)"
                />
              )}

              <div>
                <p className="text-xs text-slate-400 mb-2">Colonnes - mois:</p>
                <div className="flex flex-wrap gap-2">
                  {csvData[0]?.map((header, colIndex) => (
                    <div key={colIndex} className="flex items-center gap-1">
                      <span className="text-[11px] bg-slate-100 rounded px-1.5 py-0.5 text-slate-600 max-w-[80px] truncate">
                        {String(header || '').trim() || `Col ${colIndex + 1}`}
                      </span>
                      <select
                        value={colMapping[colIndex] || ''}
                        onChange={(e) => setColMapping((prev) => ({ ...prev, [colIndex]: e.target.value ? Number(e.target.value) : null }))}
                        className="text-[11px] border border-slate-200 rounded px-1 py-0.5 outline-none focus:border-violet-400"
                      >
                        <option value="">-</option>
                        {MONTHS_FR.map((month, monthIndex) => (
                          <option key={month} value={monthIndex + 1}>{month}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Ligne CSV</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Categorie CDR</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-500">Apercu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-600 max-w-[150px] truncate">{String(row[0] || '').trim()}</td>
                        <td className="px-3 py-1.5">
                          <select
                            value={mapping[rowIndex] || ''}
                            onChange={(e) => setMapping((prev) => ({ ...prev, [rowIndex]: e.target.value || null }))}
                            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-violet-400"
                          >
                            <option value="">- Ignorer -</option>
                            {leaves.map((category) => (
                              <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-400">
                          {row.slice(1, 4).filter((value) => String(value || '').trim()).join(' / ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100">
          {csvStep !== null && <CSVProgressSteps currentStep={csvStep} />}
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
              Annuler
            </button>
            <button
              onClick={handleImport}
              disabled={!csvData || Object.values(mapping).every((value) => !value)}
              className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-40 transition-colors"
            >
              Importer {importType === 'budget' ? 'comme budget' : 'donnees reelles'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
