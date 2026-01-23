import React, { useState } from 'react';

function Sidebar({ companies, activeCompany, onSelectCompany, onImportClick, onAddCompany, onManageData, onManageDepts, debugMsg, setCurrentPage, isOpen, onClose, isViewerOnly, companyOrder, onReorderCompanies, onTimesheetClick, departmentMapping }) {
  const [draggedCompany, setDraggedCompany] = useState(null);
  const [dragOverCompany, setDragOverCompany] = useState(null);

  // Utiliser departmentMapping (prioritaire) OU companies[].mapping pour cohérence avec App.jsx
  const mapping = departmentMapping || companies[activeCompany]?.mapping || {};
  const unassignedCount = activeCompany && companies[activeCompany]
    ? new Set(
        (companies[activeCompany].employees || [])
          .filter(e => {
            const name = e.name?.trim();
            // Même logique que uniqueEmployeesWithDept dans App.jsx
            const dept = mapping[name] || (e.department && e.department.trim()) || null;
            return !dept;
          })
          .map(e => e.name?.trim())
      ).size
    : 0;

  // Trier les sociétés selon l'ordre personnalisé
  const getOrderedCompanies = (companiesList, isShared) => {
    if (!companiesList) return [];
    const filtered = Object.entries(companiesList).filter(([_, c]) => isShared ? c.isShared : !c.isShared);

    if (!companyOrder || companyOrder.length === 0) {
      return filtered;
    }

    return filtered.sort((a, b) => {
      const indexA = companyOrder.indexOf(a[0]);
      const indexB = companyOrder.indexOf(b[0]);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  };

  const handleDragStart = (e, companyName) => {
    setDraggedCompany(companyName);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedCompany(null);
    setDragOverCompany(null);
  };

  const handleDragOver = (e, companyName) => {
    e.preventDefault();
    if (draggedCompany && draggedCompany !== companyName) {
      setDragOverCompany(companyName);
    }
  };

  const handleDragLeave = () => {
    setDragOverCompany(null);
  };

  const handleDrop = (e, targetCompany, isShared) => {
    e.preventDefault();

    if (!draggedCompany || draggedCompany === targetCompany) {
      setDraggedCompany(null);
      setDragOverCompany(null);
      return;
    }

    const orderedList = getOrderedCompanies(companies, isShared).map(([name]) => name);
    const fromIndex = orderedList.indexOf(draggedCompany);
    const toIndex = orderedList.indexOf(targetCompany);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedCompany(null);
      setDragOverCompany(null);
      return;
    }

    const newOrder = [...orderedList];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, draggedCompany);

    if (onReorderCompanies) {
      const otherType = getOrderedCompanies(companies, !isShared).map(([name]) => name);
      const fullOrder = isShared ? [...otherType, ...newOrder] : [...newOrder, ...otherType];
      onReorderCompanies(fullOrder);
    }

    setDraggedCompany(null);
    setDragOverCompany(null);
  };

  const myCompanies = getOrderedCompanies(companies, false);
  const sharedCompanies = getOrderedCompanies(companies, true);
  const hasCompanies = Object.keys(companies).length > 0;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={`w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white fixed top-0 left-0 bottom-0 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>

        {/* Header avec Logo */}
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage && setCurrentPage('home')}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
                <span className="text-white font-black text-lg">S</span>
              </div>
              <span className="text-xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Salarize</span>
            </button>

            {/* Close button mobile */}
            <button
              onClick={onClose}
              className="p-2 lg:hidden hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        {!isViewerOnly && (
          <div className="px-4 py-3 border-b border-slate-800/50">
            <div className="flex items-center gap-2">
              {/* Import - Action principale */}
              <button
                onClick={onImportClick}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 hover:from-violet-500/20 hover:to-fuchsia-500/20 border border-violet-500/20 hover:border-violet-500/40 rounded-xl transition-all group"
                title="Importer des données Excel"
              >
                <svg className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-xs font-medium text-slate-300">Importer Excel</span>
              </button>

              {/* Nouvelle société - Bouton discret (juste icône) */}
              <button
                onClick={onAddCompany}
                className="w-10 h-10 flex items-center justify-center bg-slate-800/30 hover:bg-slate-800 border border-slate-700/30 hover:border-slate-600 rounded-xl transition-all group"
                title="Créer une société vide"
              >
                <svg className="w-4 h-4 text-slate-500 group-hover:text-violet-400 group-hover:scale-110 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Alerte employés non assignés */}
        {unassignedCount > 0 && (
          <div className="px-4 py-2">
            <button
              onClick={onManageDepts}
              className="w-full p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 hover:from-amber-500/20 hover:to-orange-500/20 transition-all group"
            >
              <div className="w-9 h-9 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-amber-400 text-sm font-semibold">{unassignedCount} sans département</p>
                <p className="text-amber-400/60 text-xs">Cliquer pour assigner</p>
              </div>
            </button>
          </div>
        )}

        {/* Liste des sociétés */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* Mes sociétés */}
          {myCompanies.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-1.5 h-5 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full"></div>
                <p className="text-slate-500 text-xs font-semibold tracking-wider uppercase">Mes Sociétés</p>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-800 to-transparent"></div>
              </div>

              <div className="space-y-1">
                {myCompanies.map(([name, company]) => (
                  <div
                    key={name}
                    draggable={!isViewerOnly}
                    onDragStart={(e) => handleDragStart(e, name)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, name)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, name, false)}
                    className={`relative transition-all duration-200 ${
                      dragOverCompany === name ? 'transform translate-y-1' : ''
                    }`}
                  >
                    {/* Indicateur de drop */}
                    {dragOverCompany === name && draggedCompany !== name && (
                      <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full shadow-lg shadow-violet-500/50" />
                    )}

                    <button
                      onClick={() => onSelectCompany(name)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 group ${
                        activeCompany === name
                          ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 shadow-lg shadow-violet-500/10'
                          : 'hover:bg-slate-800/70 border border-transparent'
                      } ${draggedCompany === name ? 'opacity-50' : ''} ${!isViewerOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      {/* Drag handle */}
                      {!isViewerOnly && (
                        <div className="w-4 flex flex-col gap-0.5 opacity-30 group-hover:opacity-60 transition-opacity flex-shrink-0">
                          <div className="w-full h-0.5 bg-current rounded-full"></div>
                          <div className="w-full h-0.5 bg-current rounded-full"></div>
                          <div className="w-full h-0.5 bg-current rounded-full"></div>
                        </div>
                      )}

                      {/* Logo */}
                      {company?.logo ? (
                        <img src={company.logo} alt="" className="w-8 h-8 rounded-lg object-cover ring-2 ring-slate-700/50" />
                      ) : (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          activeCompany === name
                            ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {name.charAt(0)}
                        </div>
                      )}

                      {/* Name */}
                      <span className={`truncate font-medium flex-1 ${
                        activeCompany === name ? 'text-white' : 'text-slate-300'
                      }`}>{name}</span>

                      {/* Owner badge - always visible */}
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        activeCompany === name
                          ? 'bg-violet-500/30 text-violet-300'
                          : 'bg-slate-700/50 text-slate-500'
                      }`}>
                        OWNER
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sociétés partagées */}
          {sharedCompanies.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-1.5 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                <p className="text-slate-500 text-xs font-semibold tracking-wider uppercase">Partagées</p>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-800 to-transparent"></div>
              </div>

              <div className="space-y-1">
                {sharedCompanies.map(([name, company]) => (
                  <div
                    key={name}
                    draggable={!isViewerOnly}
                    onDragStart={(e) => handleDragStart(e, name)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, name)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, name, true)}
                    className={`relative transition-all duration-200 ${
                      dragOverCompany === name ? 'transform translate-y-1' : ''
                    }`}
                  >
                    {dragOverCompany === name && draggedCompany !== name && (
                      <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg shadow-emerald-500/50" />
                    )}

                    <button
                      onClick={() => onSelectCompany(name)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 group ${
                        activeCompany === name
                          ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                          : 'hover:bg-slate-800/70 border border-transparent'
                      } ${draggedCompany === name ? 'opacity-50' : ''} ${!isViewerOnly ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      {!isViewerOnly && (
                        <div className="w-4 flex flex-col gap-0.5 opacity-30 group-hover:opacity-60 transition-opacity flex-shrink-0">
                          <div className="w-full h-0.5 bg-current rounded-full"></div>
                          <div className="w-full h-0.5 bg-current rounded-full"></div>
                          <div className="w-full h-0.5 bg-current rounded-full"></div>
                        </div>
                      )}

                      {company?.logo ? (
                        <img src={company.logo} alt="" className="w-8 h-8 rounded-lg object-cover ring-2 ring-slate-700/50" />
                      ) : (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          activeCompany === name
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {name.charAt(0)}
                        </div>
                      )}

                      <span className={`truncate font-medium flex-1 ${
                        activeCompany === name ? 'text-white' : 'text-slate-300'
                      }`}>{name}</span>

                      {/* Role badge */}
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        company.sharedRole === 'editor'
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {company.sharedRole === 'editor' ? 'EDIT' : 'VIEW'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* État vide */}
          {!hasCompanies && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20">
                <svg className="w-10 h-10 text-violet-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>

              <h3 className="text-white font-semibold mb-2">Bienvenue !</h3>
              <p className="text-slate-500 text-sm mb-6 px-4">
                Commencez par importer vos données salariales
              </p>

              {!isViewerOnly && (
                <div className="space-y-2 px-2">
                  <button
                    onClick={onImportClick}
                    className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 hover:from-violet-500/30 hover:to-fuchsia-500/30 border border-violet-500/30 rounded-xl transition-all text-left group"
                  >
                    <div className="w-10 h-10 bg-violet-500/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Importer Excel</p>
                      <p className="text-slate-500 text-xs">Fichier .xlsx</p>
                    </div>
                  </button>

                  <button
                    onClick={onAddCompany}
                    className="w-full flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all text-left group"
                  >
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-300 text-sm font-medium">Créer une société</p>
                      <p className="text-slate-500 text-xs">Ajouter manuellement</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions contextuelles en bas */}
        {activeCompany && hasCompanies && (
          <div className="p-4 border-t border-slate-800/50 bg-slate-950/50">
            <div className="flex items-center gap-2">
              {/* Équipes/Départements */}
              <button
                onClick={onManageDepts}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800/70 hover:bg-slate-800 rounded-xl transition-all group"
                title="Gérer les équipes et départements"
              >
                <svg className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300">Équipes</span>
              </button>

              {/* Paramètres société */}
              {!isViewerOnly && (
                <button
                  onClick={onManageData}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800/70 hover:bg-slate-800 rounded-xl transition-all group"
                  title="Paramètres de la société"
                >
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:scale-110 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300">Paramètres</span>
                </button>
              )}
            </div>

            {/* Viewer only message */}
            {isViewerOnly && (
              <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-amber-400/80 text-xs flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Mode lecture seule
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default Sidebar;
