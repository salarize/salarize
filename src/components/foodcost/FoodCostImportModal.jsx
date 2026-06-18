import React, { useCallback, useState } from 'react';

const STATUS_LABELS = {
  uploading: { label: 'Upload...', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  pending: { label: 'En attente', color: 'text-slate-400', bg: 'bg-slate-700/40' },
  processing: { label: 'Extraction IA...', color: 'text-violet-400', bg: 'bg-violet-500/20' },
  done: { label: 'Terminé', color: 'text-green-400', bg: 'bg-green-500/20' },
  error: { label: 'Erreur', color: 'text-red-400', bg: 'bg-red-500/20' },
  duplicate_blocked: { label: 'Doublon bloqué', color: 'text-amber-400', bg: 'bg-amber-500/20' },
};

function JobRow({ job, onForceReimport }) {
  const s = STATUS_LABELS[job.status] ?? STATUS_LABELS.pending;
  const isActive = ['uploading', 'pending', 'processing'].includes(job.status);

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-800/60 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 font-medium truncate">{job.file_name}</p>
        {job.status === 'done' && (
          <p className="text-xs text-slate-500 mt-0.5">
            {job.lines_extracted ?? 0} lignes extraites
            {job.lines_needing_review > 0 && ` · ${job.lines_needing_review} à vérifier`}
          </p>
        )}
        {job.status === 'duplicate_blocked' && (
          <p className="text-xs text-amber-500/80 mt-0.5">{job.error_message}</p>
        )}
        {job.status === 'error' && (
          <p className="text-xs text-red-400/80 mt-0.5 truncate">{job.error_message}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isActive && (
          <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        )}
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color} ${s.bg}`}>
          {s.label}
        </span>
        {job.status === 'duplicate_blocked' && (
          <button
            onClick={() => onForceReimport(job.id)}
            className="text-xs text-slate-400 hover:text-white underline"
          >
            Forcer
          </button>
        )}
      </div>
    </div>
  );
}

function FoodCostImportModal({ jobs, summary, onUpload, onForceReimport, onClearCompleted, onClose }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback((files) => {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfs.length) onUpload(pdfs);
  }, [onUpload]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const hasJobs = jobs.length > 0;
  const allDone = hasJobs && summary.processing === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-white font-bold text-lg">Importer des factures</h2>
            <p className="text-slate-400 text-xs mt-0.5">PDF uniquement · Traitement serveur sécurisé</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drop zone */}
        <div className="p-5">
          <label
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
              isDragging
                ? 'border-orange-400 bg-orange-500/10'
                : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/40'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDragging ? 'bg-orange-500/20' : 'bg-slate-800'}`}>
              <svg className={`w-6 h-6 ${isDragging ? 'text-orange-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Déposer vos factures ici</p>
              <p className="text-slate-400 text-sm mt-1">ou cliquer pour sélectionner des fichiers PDF</p>
            </div>
            <input type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </label>
        </div>

        {/* Jobs list */}
        {hasJobs && (
          <>
            <div className="flex items-center justify-between px-5 pb-2">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                {jobs.length} fichier{jobs.length > 1 ? 's' : ''}
              </p>
              {allDone && (
                <button onClick={onClearCompleted} className="text-xs text-slate-500 hover:text-slate-300 underline">
                  Effacer la liste
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-5">
              {jobs.map(job => (
                <JobRow key={job.id} job={job} onForceReimport={onForceReimport} />
              ))}
            </div>
          </>
        )}

        {/* Summary when all done */}
        {allDone && (
          <div className="p-5 border-t border-slate-800 bg-slate-950/50 rounded-b-2xl">
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { label: 'Traités', value: summary.done, color: 'text-green-400' },
                { label: 'Lignes', value: summary.linesExtracted, color: 'text-white' },
                { label: 'À vérifier', value: summary.linesNeedingReview, color: 'text-amber-400' },
                { label: 'Doublons', value: summary.duplicates, color: 'text-slate-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800/50 rounded-xl p-3">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {summary.linesNeedingReview > 0 && (
              <button
                onClick={onClose}
                className="mt-3 w-full py-2.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 font-semibold rounded-xl text-sm transition-all"
              >
                Aller à la file de révision ({summary.linesNeedingReview} lignes)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FoodCostImportModal;
