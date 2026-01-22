import React, { useState } from 'react';
import { supabase } from '../../config/supabase';

function ProjectsManager({ userId, projects, onClose, onRefresh }) {
  const [newProject, setNewProject] = useState({
    name: '',
    client_name: '',
    hourly_rate: 85
  });
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newProject.name.trim() || !newProject.client_name.trim()) return;

    setIsSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('projects')
          .update({
            name: newProject.name,
            client_name: newProject.client_name,
            hourly_rate: newProject.hourly_rate
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            name: newProject.name,
            client_name: newProject.client_name,
            hourly_rate: newProject.hourly_rate,
            is_active: true
          });

        if (error) throw error;
      }

      setNewProject({ name: '', client_name: '', hourly_rate: 85 });
      setEditingId(null);
      onRefresh();
    } catch (error) {
      console.error('Erreur sauvegarde projet:', error);
    }
    setIsSaving(false);
  };

  const handleEdit = (project) => {
    setEditingId(project.id);
    setNewProject({
      name: project.name,
      client_name: project.client_name,
      hourly_rate: project.hourly_rate
    });
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Supprimer ce projet ? Les entrees de timesheet associees ne seront pas supprimees.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_active: false })
        .eq('id', projectId);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Erreur suppression projet:', error);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewProject({ name: '', client_name: '', hourly_rate: 85 });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-700/50 shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />
          <div className="relative px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Gestion des Projets</h2>
                  <p className="text-violet-200 text-sm">{projects.length} projet(s) actif(s)</p>
                </div>
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
          {/* Liste des projets */}
          {projects.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Projets existants</h3>
              <div className="space-y-2">
                {projects.map(project => (
                  <div
                    key={project.id}
                    className={`bg-slate-800/50 rounded-lg p-4 border ${
                      editingId === project.id ? 'border-violet-500' : 'border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-white font-medium">{project.name}</h4>
                        <p className="text-slate-400 text-sm">{project.client_name}</p>
                        <p className="text-violet-400 text-xs mt-1">{project.hourly_rate} EUR/h</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(project)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
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

          {/* Formulaire nouveau projet */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              {editingId ? 'Modifier le projet' : 'Nouveau projet'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nom du projet</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Developpement App Mobile"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Client</label>
                  <input
                    type="text"
                    value={newProject.client_name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, client_name: e.target.value }))}
                    placeholder="Ex: Entreprise ABC"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Taux horaire par defaut</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newProject.hourly_rate}
                    onChange={(e) => setNewProject(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                    className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-violet-500 focus:outline-none"
                  />
                  <span className="text-slate-400">EUR/heure</span>
                </div>
              </div>

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
                  disabled={isSaving || !newProject.name.trim() || !newProject.client_name.trim()}
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
                      Creer le projet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Info */}
          {projects.length === 0 && (
            <div className="mt-6 text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-violet-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Aucun projet</h3>
              <p className="text-slate-400 text-sm">Creez votre premier projet pour commencer a enregistrer vos heures.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectsManager;
