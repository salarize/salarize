import React, { useState } from 'react';

function DayEntryModal({ date, entries, projects, defaultHourlyRate, onSave, onDelete, onClose }) {
  const [newEntry, setNewEntry] = useState({
    project_id: projects[0]?.id || '',
    hours: 8,
    description: '',
    is_billable: true,
    hourly_rate: defaultHourlyRate
  });
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const monthNames = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
                      'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];

  const formattedDate = `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  const dateStr = date.toISOString().split('T')[0];

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);

  const handleSave = async () => {
    if (!newEntry.hours || newEntry.hours <= 0) return;

    setIsSaving(true);
    const entryToSave = {
      ...newEntry,
      date: dateStr,
      id: editingId || undefined
    };

    const success = await onSave(entryToSave);
    if (success) {
      setNewEntry({
        project_id: projects[0]?.id || '',
        hours: 8,
        description: '',
        is_billable: true,
        hourly_rate: defaultHourlyRate
      });
      setEditingId(null);
    }
    setIsSaving(false);
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setNewEntry({
      project_id: entry.project_id,
      hours: entry.hours,
      description: entry.description || '',
      is_billable: entry.is_billable,
      hourly_rate: entry.hourly_rate
    });
  };

  const handleDelete = async (entryId) => {
    if (window.confirm('Supprimer cette entree ?')) {
      await onDelete(entryId);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewEntry({
      project_id: projects[0]?.id || '',
      hours: 8,
      description: '',
      is_billable: true,
      hourly_rate: defaultHourlyRate
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-slate-700/50 shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
          <div className="relative px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{formattedDate}</h2>
                <p className="text-violet-200 text-sm mt-1">
                  {totalHours > 0 ? `${totalHours}h enregistrees` : 'Aucune heure enregistree'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Entrees existantes */}
          {entries.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Entrees du jour</h3>
              <div className="space-y-2">
                {entries.map(entry => (
                  <div
                    key={entry.id}
                    className={`bg-slate-800/50 rounded-lg p-3 border ${
                      editingId === entry.id ? 'border-violet-500' : 'border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{entry.hours}h</span>
                          <span className="text-slate-400">-</span>
                          <span className="text-slate-300 text-sm">{entry.projects?.name || 'Sans projet'}</span>
                          {entry.is_billable && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded">
                              Facturable
                            </span>
                          )}
                        </div>
                        {entry.description && (
                          <p className="text-slate-500 text-sm mt-1">{entry.description}</p>
                        )}
                        <p className="text-violet-400 text-xs mt-1">
                          {(entry.hours * entry.hourly_rate).toLocaleString('fr-BE')} EUR ({entry.hourly_rate} EUR/h)
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulaire nouvelle entree */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              {editingId ? 'Modifier l\'entree' : 'Nouvelle entree'}
            </h3>

            <div className="space-y-4">
              {/* Projet */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Projet</label>
                <select
                  value={newEntry.project_id}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, project_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="">-- Selectionner un projet --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.client_name})</option>
                  ))}
                </select>
              </div>

              {/* Heures */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Heures</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={newEntry.hours}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Taux horaire</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={newEntry.hourly_rate}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-violet-500 focus:outline-none"
                    />
                    <span className="text-slate-400 text-sm">EUR</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Description (optionnel)</label>
                <textarea
                  value={newEntry.description}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Notes, details du travail..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none resize-none"
                />
              </div>

              {/* Facturable */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newEntry.is_billable}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, is_billable: e.target.checked }))}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500 focus:ring-offset-slate-900"
                />
                <span className="text-slate-300">Heures facturables</span>
              </label>

              {/* Apercu montant */}
              <div className="bg-violet-500/10 rounded-lg p-3 border border-violet-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-violet-300 text-sm">Montant</span>
                  <span className="text-xl font-bold text-white">
                    {(newEntry.hours * newEntry.hourly_rate).toLocaleString('fr-BE', { minimumFractionDigits: 2 })} EUR
                  </span>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-2">
                {editingId && (
                  <button
                    onClick={cancelEdit}
                    className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving || !newEntry.hours}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90 text-white font-medium rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enregistrement...
                    </>
                  ) : editingId ? (
                    'Mettre a jour'
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Ajouter
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DayEntryModal;
