import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { exportImportHistoryToXlsx } from '../../utils/foodExport';

const STATUS_STYLES = {
  done: { label: 'Terminé', color: 'text-green-400 bg-green-500/10' },
  processing: { label: 'En cours', color: 'text-violet-400 bg-violet-500/10' },
  pending: { label: 'En attente', color: 'text-slate-400 bg-slate-700/40' },
  error: { label: 'Erreur', color: 'text-red-400 bg-red-500/10' },
  duplicate_blocked: { label: 'Doublon', color: 'text-amber-400 bg-amber-500/10' },
};

function FoodImportHistory({ companyId, onRetry }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDays, setFilterDays] = useState(30);

  useEffect(() => {
    if (!companyId) return;
    loadJobs();
  }, [companyId, filterStatus, filterDays]);

  async function loadJobs() {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - filterDays);

    let q = supabase
      .from('food_import_jobs')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') q = q.eq('status', filterStatus);

    const { data } = await q;
    setJobs(data ?? []);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_STYLES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2"
          value={filterDays}
          onChange={e => setFilterDays(Number(e.target.value))}
        >
          <option value={7}>7 derniers jours</option>
          <option value={30}>30 derniers jours</option>
          <option value={90}>90 derniers jours</option>
          <option value={365}>12 derniers mois</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => exportImportHistoryToXlsx(jobs)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !jobs.length ? (
        <div className="text-center py-12">
          <p className="text-slate-500 text-sm">Aucun import dans cette période.</p>
        </div>
      ) : (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-slate-700/50">
                <th className="px-4 py-3 font-semibold">Fichier</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Lignes</th>
                <th className="px-4 py-3 font-semibold text-right">À vérifier</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {jobs.map(job => {
                const s = STATUS_STYLES[job.status] ?? STATUS_STYLES.pending;
                return (
                  <tr key={job.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-slate-200 font-medium truncate max-w-[200px]" title={job.file_name}>{job.file_name}</p>
                      {job.error_message && <p className="text-red-400/70 text-xs mt-0.5 truncate max-w-[200px]">{job.error_message}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">{job.lines_extracted ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      {job.lines_needing_review > 0
                        ? <span className="text-amber-400 font-semibold">{job.lines_needing_review}</span>
                        : <span className="text-slate-600">0</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {job.created_at ? new Date(job.created_at).toLocaleDateString('fr-BE') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {job.status === 'error' && (
                        <button
                          onClick={() => onRetry?.(job.id)}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
                        >
                          Réessayer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default FoodImportHistory;
