import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabase';
import { hashFile, findDuplicateFile } from '../../../utils/foodDuplicates';

export function useImportQueue(companyId) {
  const [jobs, setJobs] = useState([]);
  const channelRef = useRef(null);

  // Subscribe to realtime updates for this company's jobs
  useEffect(() => {
    if (!companyId) return;

    // Load recent jobs on mount
    supabase
      .from('food_import_jobs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setJobs(data); });

    channelRef.current = supabase
      .channel(`food_import_jobs_${companyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'food_import_jobs',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setJobs(prev => prev.filter(j => j.id !== payload.old?.id));
          return;
        }
        setJobs(prev => {
          const existing = prev.findIndex(j => j.id === payload.new?.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = { ...updated[existing], ...payload.new };
            return updated;
          }
          return payload.new ? [payload.new, ...prev] : prev;
        });
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [companyId]);

  const uploadFiles = useCallback(async (files) => {
    if (!companyId) return;

    for (const file of files) {
      const tempId = `temp_${Date.now()}_${Math.random()}`;

      // Optimistic UI: show as hashing
      setJobs(prev => [{
        id: tempId, file_name: file.name, status: 'uploading', company_id: companyId,
      }, ...prev]);

      try {
        // SHA-256 hash for duplicate detection
        const fileHash = await hashFile(file);

        // Check if this exact file was already imported
        const duplicate = await findDuplicateFile(companyId, fileHash);
        if (duplicate) {
          setJobs(prev => prev.map(j => j.id === tempId ? {
            ...j,
            status: 'duplicate_blocked',
            error_message: `Fichier déjà importé le ${new Date(duplicate.created_at).toLocaleDateString('fr-BE')} (${duplicate.file_name})`,
            file_hash: fileHash,
          } : j));
          continue;
        }

        // Upload to Supabase Storage
        const filePath = `food-invoices/${companyId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(filePath, file, { contentType: 'application/pdf' });

        if (uploadError) throw uploadError;

        // Insert job row — triggers Database Webhook → Edge Function
        const { data: job, error: insertError } = await supabase
          .from('food_import_jobs')
          .insert({
            company_id: companyId,
            file_url: filePath,
            file_name: file.name,
            file_hash: fileHash,
            status: 'pending',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setJobs(prev => prev.map(j => j.id === tempId ? { ...job } : j));
      } catch (err) {
        setJobs(prev => prev.map(j =>
          j.id === tempId ? { ...j, status: 'error', error_message: err.message } : j
        ));
      }
    }
  }, [companyId]);

  const retryJob = useCallback(async (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    await supabase.from('food_import_jobs').update({
      status: 'pending',
      error_message: null,
      completed_at: null,
      started_at: null,
      retry_count: (job.retry_count ?? 0) + 1,
    }).eq('id', jobId);
  }, [jobs]);

  const forceReimport = useCallback(async (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    await supabase.from('food_import_jobs').update({
      status: 'pending',
      force_reimport: true,
      error_message: null,
      completed_at: null,
      retry_count: (job.retry_count ?? 0) + 1,
    }).eq('id', jobId);
  }, [jobs]);

  const ignoreJob = useCallback(async (jobId) => {
    await supabase.from('food_import_jobs').update({ status: 'error', error_message: 'Ignoré manuellement' }).eq('id', jobId);
  }, []);

  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(j => !['done', 'duplicate_blocked', 'error'].includes(j.status)));
  }, []);

  const summary = {
    total: jobs.length,
    done: jobs.filter(j => j.status === 'done').length,
    processing: jobs.filter(j => ['pending', 'processing', 'uploading'].includes(j.status)).length,
    errors: jobs.filter(j => j.status === 'error').length,
    duplicates: jobs.filter(j => j.status === 'duplicate_blocked').length,
    linesExtracted: jobs.reduce((s, j) => s + (j.lines_extracted ?? 0), 0),
    linesNeedingReview: jobs.reduce((s, j) => s + (j.lines_needing_review ?? 0), 0),
  };

  return { jobs, uploadFiles, retryJob, forceReimport, ignoreJob, clearCompleted, summary };
}
