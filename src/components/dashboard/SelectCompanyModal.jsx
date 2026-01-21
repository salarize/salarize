import React from 'react';

function SelectCompanyModal({ companies, newName, setNewName, onSelect, onCancel }) {
  const companyNames = Object.keys(companies);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Importer vers quelle societe ?</h2>

        {companyNames.length > 0 && (
          <>
            <p className="text-slate-500 text-sm mb-3">Societe existante :</p>
            <div className="space-y-2 mb-4">
              {companyNames.map(name => (
                <button
                  key={name}
                  onClick={() => onSelect(name)}
                  className="w-full text-left px-4 py-3 border-2 border-slate-200 rounded-xl hover:border-violet-500 hover:bg-violet-50 transition-all"
                >
                  <span className="font-semibold">{name}</span>
                  <span className="text-slate-400 text-sm ml-2">({companies[name]?.employees?.length || 0} entrees)</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-slate-400 text-sm">ou</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </>
        )}

        <p className="text-slate-500 text-sm mb-2">Nouvelle societe :</p>
        <input
          type="text"
          id="new-company-name"
          name="newCompanyName"
          placeholder="Nom (ex: Mamy Home, Fresheo...)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && newName.trim()) {
              onSelect(newName.trim());
            }
          }}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl mb-4 focus:border-violet-500 outline-none"
          autoFocus
        />

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            onClick={() => newName.trim() && onSelect(newName.trim())}
            disabled={!newName.trim()}
            className="flex-1 py-2 bg-violet-500 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-violet-600"
          >
            Creer & Importer
          </button>
        </div>
      </div>
    </div>
  );
}

export default SelectCompanyModal;
