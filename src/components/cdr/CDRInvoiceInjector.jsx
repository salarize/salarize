import React, { useState, useRef } from 'react';
import { supabase } from '../../config/supabase';

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.heic,.webp';

function FileRow({ file, status, progress }) {
  const icon = status === 'done' ? '✓' : status === 'error' ? '✗' : '⟳';
  const color = status === 'done' ? 'text-emerald-600' : status === 'error' ? 'text-red-500' : 'text-violet-500';
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
      <span className={`text-sm font-bold w-4 ${color}`}>{icon}</span>
      <span className="text-xs text-slate-600 flex-1 truncate">{file.name}</span>
      <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} Ko</span>
      {status === 'uploading' && (
        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 transition-all rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

export default function CDRInvoiceInjector({ companyId, categories, onUploadComplete, isViewerOnly }) {
  const [files, setFiles] = useState([]); // { file, status, progress, url }
  const [dragging, setDragging] = useState(false);
  const [manualForm, setManualForm] = useState(null); // invoice being manually filled
  const inputRef = useRef(null);
  const leaves = categories.filter(c => !categories.some(p => p.parent_id === c.id));

  const addFiles = (newFiles) => {
    const list = Array.from(newFiles).map(f => ({ file: f, status: 'pending', progress: 0, url: null, id: Math.random() }));
    setFiles(prev => [...prev, ...list]);
    uploadAll(list);
  };

  const uploadAll = async (list) => {
    const CONCURRENCY = 5;
    let idx = 0;
    const next = async () => {
      if (idx >= list.length) return;
      const item = list[idx++];
      await uploadOne(item);
      await next();
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, () => next()));
    onUploadComplete?.();
  };

  const uploadOne = async (item) => {
    setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 10 } : f));
    try {
      const path = `${companyId}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Date.now()}_${item.file.name}`;
      const { data, error } = await supabase.storage.from('invoices').upload(path, item.file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(path);

      // Create invoice record
      const { error: dbErr } = await supabase.from('invoices').insert({
        company_id: companyId,
        file_url: publicUrl,
        file_name: item.file.name,
        status: 'pending',
        extracted_by_ai: false,
      });
      if (dbErr) throw dbErr;

      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', progress: 100, url: publicUrl } : f));
    } catch (e) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' } : f));
    }
  };

  if (isViewerOnly) return null;

  const done = files.filter(f => f.status === 'done').length;
  const total = files.length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragging ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/30'}`}
      >
        <input ref={inputRef} type="file" accept={ACCEPTED} multiple onChange={e => addFiles(e.target.files)} className="hidden" />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Glisser-déposer vos factures ici</p>
            <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG, HEIC — jusqu'à 50 fichiers simultanément</p>
          </div>
          <span className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-xl hover:bg-violet-700 transition-colors">
            Choisir des fichiers
          </span>
        </div>
      </div>

      {/* Progress list */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-600">
              {done < total ? `Traitement : ${done}/${total} factures` : `${total} facture${total > 1 ? 's' : ''} uploadée${total > 1 ? 's' : ''}`}
            </p>
            {done > 0 && done < total && (
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 transition-all rounded-full" style={{ width: `${(done / total) * 100}%` }} />
              </div>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto">
            {files.map(item => (
              <FileRow key={item.id} file={item.file} status={item.status} progress={item.progress} />
            ))}
          </div>
          {done === total && total > 0 && (
            <p className="mt-3 text-xs text-emerald-600 font-medium text-center">
              ✓ Toutes les factures ont été uploadées. Rendez-vous dans l'onglet "Factures" pour les valider.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
