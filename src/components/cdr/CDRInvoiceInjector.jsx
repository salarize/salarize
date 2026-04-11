import React, { useState, useRef } from 'react';
import { supabase } from '../../config/supabase';
import { useInvoiceExtraction } from './hooks/useInvoiceExtraction';
import InvoiceReviewPanel from './InvoiceReviewPanel';

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.heic,.webp';

function FileRow({ file, status, progress, extracting }) {
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
      {extracting && (
        <div className="flex items-center gap-1 text-[10px] text-violet-500 font-medium">
          <div className="w-2.5 h-2.5 border border-violet-400 border-t-transparent rounded-full animate-spin" />
          IA...
        </div>
      )}
    </div>
  );
}

export default function CDRInvoiceInjector({ companyId, categories, onUploadComplete, isViewerOnly }) {
  const [files, setFiles] = useState([]); // { file, status, progress, url, id, invoiceId, extracting }
  const [pendingReview, setPendingReview] = useState([]); // { invoiceId, file, extracted }
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const { extract, canExtract } = useInvoiceExtraction();

  const addFiles = (newFiles) => {
    const list = Array.from(newFiles).map(f => ({ file: f, status: 'pending', progress: 0, url: null, id: Math.random(), invoiceId: null, extracting: false }));
    setFiles(prev => [...prev, ...list]);
    uploadAll(list);
  };

  const uploadAll = async (list) => {
    const CONCURRENCY = 3;
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
      const safeName = item.file.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/[^a-zA-Z0-9._-]/g, '_')                // replace unsafe chars
        .replace(/_+/g, '_');                             // collapse consecutive underscores
      const path = `${companyId}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Date.now()}_${safeName}`;
      const { error: storageErr } = await supabase.storage.from('invoices').upload(path, item.file);
      if (storageErr) throw storageErr;

      const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(path);

      const { data: inv, error: dbErr } = await supabase.from('invoices').insert({
        company_id: companyId,
        file_url: publicUrl,
        file_name: item.file.name,
        status: 'pending',
        extracted_by_ai: false,
      }).select('id').single();
      if (dbErr) throw dbErr;

      const invoiceId = inv.id;
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', progress: 100, url: publicUrl, invoiceId } : f));

      // AI extraction (file still in memory)
      if (canExtract) {
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, extracting: true } : f));
        try {
          const extracted = await extract(item.file);
          setPendingReview(prev => [...prev, { invoiceId, file: item.file, extracted }]);
        } catch {
          // Extraction failed — still queue for manual review
          setPendingReview(prev => [...prev, { invoiceId, file: item.file, extracted: null }]);
        } finally {
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, extracting: false } : f));
        }
      } else {
        // No API key — queue for manual entry
        setPendingReview(prev => [...prev, { invoiceId, file: item.file, extracted: null }]);
      }
    } catch (e) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' } : f));
    }
  };

  const handleReviewDone = (invoiceId) => {
    setPendingReview(prev => prev.filter(r => r.invoiceId !== invoiceId));
    onUploadComplete?.();
  };

  if (isViewerOnly) return null;

  const done = files.filter(f => f.status === 'done').length;
  const total = files.length;
  const anyExtracting = files.some(f => f.extracting);

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
            {canExtract && (
              <p className="text-xs text-violet-500 font-medium mt-1">✦ Extraction automatique par IA activée</p>
            )}
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
              {done < total
                ? `Traitement : ${done}/${total} factures`
                : anyExtracting
                  ? `${total} facture${total > 1 ? 's' : ''} uploadée${total > 1 ? 's' : ''} — extraction IA en cours...`
                  : `${total} facture${total > 1 ? 's' : ''} uploadée${total > 1 ? 's' : ''}`}
            </p>
            {done > 0 && done < total && (
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 transition-all rounded-full" style={{ width: `${(done / total) * 100}%` }} />
              </div>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto">
            {files.map(item => (
              <FileRow key={item.id} file={item.file} status={item.status} progress={item.progress} extracting={item.extracting} />
            ))}
          </div>
        </div>
      )}

      {/* Review panels */}
      {pendingReview.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-100" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {pendingReview.length} facture{pendingReview.length > 1 ? 's' : ''} à valider
            </p>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          {pendingReview.map(item => (
            <InvoiceReviewPanel
              key={item.invoiceId}
              item={item}
              categories={categories}
              companyId={companyId}
              onDone={() => handleReviewDone(item.invoiceId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
