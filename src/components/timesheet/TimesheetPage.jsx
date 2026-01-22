import React, { useState, useEffect } from 'react';
import MonthCalendar from './MonthCalendar';
import DayEntryModal from './DayEntryModal';
import ProjectsManager from './ProjectsManager';
import { supabase } from '../../config/supabase';

function TimesheetPage({ user, onBack }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showProjectsManager, setShowProjectsManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [consultantSettings, setConsultantSettings] = useState({
    default_hourly_rate: 85,
    working_hours_per_day: 8
  });

  // Charger les donnees au montage
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, currentDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Charger les projets
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (projectsData) {
        setProjects(projectsData);
      }

      // Charger les entrees du mois
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data: entriesData } = await supabase
        .from('timesheet_entries')
        .select('*, projects(name, client_name)')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      if (entriesData) {
        setEntries(entriesData);
      }

      // Charger les settings consultant
      const { data: settingsData } = await supabase
        .from('consultant_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsData) {
        setConsultantSettings(settingsData);
      }
    } catch (error) {
      console.error('Erreur chargement timesheet:', error);
    }
    setIsLoading(false);
  };

  // Navigation mois
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calculs resume
  const monthStats = React.useMemo(() => {
    const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const billableHours = entries.filter(e => e.is_billable).reduce((sum, e) => sum + (e.hours || 0), 0);
    const totalAmount = entries.reduce((sum, e) => sum + ((e.hours || 0) * (e.hourly_rate || consultantSettings.default_hourly_rate)), 0);
    const workingDays = new Set(entries.map(e => e.date)).size;

    // Repartition par projet
    const byProject = {};
    entries.forEach(e => {
      const projectName = e.projects?.name || 'Sans projet';
      if (!byProject[projectName]) {
        byProject[projectName] = { hours: 0, amount: 0 };
      }
      byProject[projectName].hours += e.hours || 0;
      byProject[projectName].amount += (e.hours || 0) * (e.hourly_rate || consultantSettings.default_hourly_rate);
    });

    return { totalHours, billableHours, totalAmount, workingDays, byProject };
  }, [entries, consultantSettings]);

  // Sauvegarder une entree
  const saveEntry = async (entry) => {
    try {
      if (entry.id) {
        // Update
        const { error } = await supabase
          .from('timesheet_entries')
          .update({
            project_id: entry.project_id,
            hours: entry.hours,
            description: entry.description,
            is_billable: entry.is_billable,
            hourly_rate: entry.hourly_rate,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('timesheet_entries')
          .insert({
            user_id: user.id,
            project_id: entry.project_id,
            date: entry.date,
            hours: entry.hours,
            description: entry.description,
            is_billable: entry.is_billable !== false,
            hourly_rate: entry.hourly_rate || consultantSettings.default_hourly_rate
          });

        if (error) throw error;
      }

      await loadData();
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      return false;
    }
  };

  // Supprimer une entree
  const deleteEntry = async (entryId) => {
    try {
      const { error } = await supabase
        .from('timesheet_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      await loadData();
      return true;
    } catch (error) {
      console.error('Erreur suppression:', error);
      return false;
    }
  };

  // Obtenir les entrees d'un jour
  const getEntriesForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return entries.filter(e => e.date === dateStr);
  };

  const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
                      'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Timesheet</h1>
                <p className="text-sm text-slate-400">Suivi des heures et facturation</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowProjectsManager(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Projets
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendrier - 3 colonnes */}
          <div className="lg:col-span-3">
            {/* Navigation mois */}
            <div className="bg-slate-900 rounded-xl p-4 mb-4 border border-slate-800">
              <div className="flex items-center justify-between">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="text-center">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-sm bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 rounded-lg transition-colors"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Calendrier */}
            {isLoading ? (
              <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent"></div>
              </div>
            ) : (
              <MonthCalendar
                currentDate={currentDate}
                entries={entries}
                onDayClick={setSelectedDay}
                workingHoursPerDay={consultantSettings.working_hours_per_day}
              />
            )}
          </div>

          {/* Resume - 1 colonne */}
          <div className="space-y-4">
            {/* Stats du mois */}
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Resume du mois</h3>

              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">Heures totales</p>
                  <p className="text-2xl font-bold text-white">{monthStats.totalHours.toFixed(1)}h</p>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">Heures facturables</p>
                  <p className="text-2xl font-bold text-emerald-400">{monthStats.billableHours.toFixed(1)}h</p>
                </div>

                <div className="bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-lg p-3 border border-violet-500/30">
                  <p className="text-violet-300 text-xs mb-1">Montant total</p>
                  <p className="text-2xl font-bold text-white">{monthStats.totalAmount.toLocaleString('fr-BE', { minimumFractionDigits: 2 })} EUR</p>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">Jours travailles</p>
                  <p className="text-xl font-bold text-white">{monthStats.workingDays}</p>
                </div>
              </div>
            </div>

            {/* Repartition par projet */}
            {Object.keys(monthStats.byProject).length > 0 && (
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Par projet</h3>
                <div className="space-y-2">
                  {Object.entries(monthStats.byProject).map(([name, data]) => (
                    <div key={name} className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-white text-sm font-medium truncate">{name}</p>
                      <div className="flex justify-between mt-1">
                        <span className="text-slate-400 text-xs">{data.hours.toFixed(1)}h</span>
                        <span className="text-violet-400 text-xs font-medium">{data.amount.toLocaleString('fr-BE')} EUR</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Taux horaire */}
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Configuration</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs">Taux horaire par defaut</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={consultantSettings.default_hourly_rate}
                      onChange={(e) => setConsultantSettings(prev => ({ ...prev, default_hourly_rate: parseFloat(e.target.value) || 0 }))}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-violet-500 focus:outline-none"
                    />
                    <span className="text-slate-400 text-sm">EUR/h</span>
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 text-xs">Heures/jour standard</label>
                  <input
                    type="number"
                    value={consultantSettings.working_hours_per_day}
                    onChange={(e) => setConsultantSettings(prev => ({ ...prev, working_hours_per_day: parseFloat(e.target.value) || 8 }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-violet-500 focus:outline-none mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal saisie jour */}
      {selectedDay && (
        <DayEntryModal
          date={selectedDay}
          entries={getEntriesForDay(selectedDay)}
          projects={projects}
          defaultHourlyRate={consultantSettings.default_hourly_rate}
          onSave={saveEntry}
          onDelete={deleteEntry}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Modal gestion projets */}
      {showProjectsManager && (
        <ProjectsManager
          userId={user?.id}
          projects={projects}
          onClose={() => setShowProjectsManager(false)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}

export default TimesheetPage;
