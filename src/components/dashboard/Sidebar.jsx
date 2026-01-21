import React, { useState } from 'react';

function Sidebar({ companies, activeCompany, onSelectCompany, onImportClick, onAddCompany, onManageData, onManageDepts, debugMsg, setCurrentPage, isOpen, onClose }) {
  const [showActions, setShowActions] = useState(false);

  const unassignedCount = activeCompany && companies[activeCompany]
    ? new Set(
        (companies[activeCompany].employees || [])
          .filter(e => !e.department && !companies[activeCompany].mapping?.[e.name])
          .map(e => e.name)
      ).size
    : 0;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={`w-64 bg-slate-900 text-white fixed top-0 left-0 bottom-0 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-700">
          <button
            onClick={() => setCurrentPage && setCurrentPage('home')}
            className="flex-1 p-5 flex items-center gap-3 hover:bg-slate-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-white font-black text-lg">S</span>
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Salarize</span>
          </button>

          {/* Close button mobile */}
          <button
            onClick={onClose}
            className="p-5 lg:hidden hover:bg-slate-800 transition-colors"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions Button */}
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-center py-3 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
            >
              <svg className={`w-5 h-5 transition-transform ${showActions ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Actions
            </button>

            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden z-20">
                  <button
                    onClick={() => { onImportClick(); setShowActions(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-fuchsia-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">Importer des donnees</p>
                      <p className="text-slate-400 text-xs">Fichier Excel (.xlsx)</p>
                    </div>
                  </button>

                  {activeCompany && (
                    <button
                      onClick={() => { onManageDepts(); setShowActions(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">Departements</p>
                        <p className="text-slate-400 text-xs">Reassigner, renommer, fusionner</p>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => { onAddCompany(); setShowActions(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">Nouvelle societe</p>
                      <p className="text-slate-400 text-xs">Creer une societe vide</p>
                    </div>
                  </button>

                  {activeCompany && (
                    <button
                      onClick={() => { onManageData(); setShowActions(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left border-t border-slate-700"
                    >
                      <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">Gerer {activeCompany}</p>
                        <p className="text-slate-400 text-xs">Periodes, donnees, supprimer</p>
                      </div>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Alerte employes non assignes */}
        {unassignedCount > 0 && (
          <button
            onClick={onManageDepts}
            className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 hover:bg-amber-500/20 transition-colors"
          >
            <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-amber-400 text-xs font-semibold">{unassignedCount} sans departement</p>
              <p className="text-amber-400/60 text-[10px]">Cliquer pour assigner</p>
            </div>
          </button>
        )}

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full"></div>
            <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Mes Societes</p>
          </div>
          {Object.keys(companies).length === 0 ? (
            <p className="text-slate-600 text-sm">Aucune societe</p>
          ) : (
            Object.keys(companies).map(name => (
              <button
                key={name}
                onClick={() => onSelectCompany(name)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors flex items-center gap-2 ${
                  activeCompany === name ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                {companies[name]?.logo ? (
                  <img src={companies[name].logo} alt="" className="w-6 h-6 rounded object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs font-bold">
                    {name.charAt(0)}
                  </div>
                )}
                <span className="truncate">{name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default Sidebar;
