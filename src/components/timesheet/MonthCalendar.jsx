import React from 'react';

function MonthCalendar({ currentDate, entries, onDayClick, workingHoursPerDay = 8 }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Premier jour du mois (0 = Dimanche, 1 = Lundi, ...)
  const firstDay = new Date(year, month, 1);
  // Ajuster pour commencer par Lundi (0 = Lundi dans notre grille)
  let startingDay = firstDay.getDay() - 1;
  if (startingDay < 0) startingDay = 6; // Dimanche devient 6

  // Nombre de jours dans le mois
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Jours de la semaine
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Creer la grille des jours
  const days = [];

  // Jours vides avant le premier jour du mois
  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }

  // Jours du mois
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Obtenir les heures pour un jour
  const getHoursForDay = (day) => {
    if (!day) return 0;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return entries
      .filter(e => e.date === dateStr)
      .reduce((sum, e) => sum + (e.hours || 0), 0);
  };

  // Verifier si c'est aujourd'hui
  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  // Verifier si c'est un weekend
  const isWeekend = (day) => {
    if (!day) return false;
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  // Couleur selon les heures
  const getDayColor = (hours) => {
    if (hours === 0) return '';
    if (hours >= workingHoursPerDay) return 'bg-emerald-500/20 border-emerald-500/50';
    if (hours >= workingHoursPerDay / 2) return 'bg-amber-500/20 border-amber-500/50';
    return 'bg-violet-500/20 border-violet-500/50';
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const date = new Date(year, month, day);
    onDayClick(date);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* Header jours de la semaine */}
      <div className="grid grid-cols-7 bg-slate-800/50">
        {weekDays.map((day, idx) => (
          <div
            key={day}
            className={`py-3 text-center text-sm font-semibold ${
              idx >= 5 ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const hours = getHoursForDay(day);
          const dayColor = getDayColor(hours);
          const weekend = isWeekend(day);
          const today = isToday(day);

          return (
            <button
              key={idx}
              onClick={() => handleDayClick(day)}
              disabled={!day}
              className={`
                relative min-h-[80px] p-2 border-t border-r border-slate-800
                transition-all duration-200
                ${!day ? 'bg-slate-900/50 cursor-default' : 'hover:bg-slate-800/50 cursor-pointer'}
                ${weekend && day ? 'bg-slate-800/30' : ''}
                ${today ? 'ring-2 ring-violet-500 ring-inset' : ''}
                ${idx % 7 === 0 ? 'border-l' : ''}
              `}
            >
              {day && (
                <>
                  {/* Numero du jour */}
                  <span className={`
                    text-sm font-medium
                    ${today ? 'text-violet-400' : weekend ? 'text-slate-500' : 'text-slate-300'}
                  `}>
                    {day}
                  </span>

                  {/* Badge heures */}
                  {hours > 0 && (
                    <div className={`
                      absolute bottom-2 left-2 right-2
                      rounded-lg px-2 py-1 text-center
                      border ${dayColor}
                    `}>
                      <span className="text-sm font-bold text-white">{hours}h</span>
                    </div>
                  )}

                  {/* Indicateur journee complete */}
                  {hours >= workingHoursPerDay && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Legende */}
      <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-800 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500/50"></div>
          <span className="text-slate-400">Journee complete</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500/40 border border-amber-500/50"></div>
          <span className="text-slate-400">Demi-journee</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-violet-500/40 border border-violet-500/50"></div>
          <span className="text-slate-400">Partiel</span>
        </div>
      </div>
    </div>
  );
}

export default MonthCalendar;
