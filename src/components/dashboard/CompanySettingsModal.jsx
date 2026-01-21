import React, { useState } from 'react';

function CompanySettingsModal({ activeCompany, companies, setCompanies, setActiveCompany, getBrandColor, handleBrandColorChange, onClose, saveAll }) {
  const [localWebsite, setLocalWebsite] = useState(companies[activeCompany]?.website || '');
  const [localName, setLocalName] = useState(activeCompany);
  const [saving, setSaving] = useState(false);

  const originalWebsite = companies[activeCompany]?.website || '';
  const hasWebsiteChanged = localWebsite !== originalWebsite;
  const hasNameChanged = localName.trim() !== '' && localName.trim() !== activeCompany;
  const hasChanges = hasWebsiteChanged || hasNameChanged;

  const handleSave = async () => {
    if (!hasChanges) return;

    const newName = localName.trim();

    if (hasNameChanged && companies[newName]) {
      // toast.error would be called here
      return;
    }

    setSaving(true);

    let newCompanies = { ...companies };

    newCompanies[activeCompany] = {
      ...newCompanies[activeCompany],
      website: localWebsite
    };

    if (hasNameChanged) {
      newCompanies[newName] = newCompanies[activeCompany];
      delete newCompanies[activeCompany];
      setActiveCompany(newName);
      localStorage.setItem('salarize_active', newName);
    }

    setCompanies(newCompanies);
    await saveAll(newCompanies, hasNameChanged ? newName : activeCompany);

    setSaving(false);
    onClose();
  };

  const brandColor = getBrandColor();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Parametres de {activeCompany}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nom de la societe</label>
            <input
              type="text"
              id="company-name"
              name="companyName"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-violet-500 outline-none"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Site web</label>
            <input
              type="text"
              id="company-website"
              name="website"
              placeholder="www.example.com"
              value={localWebsite}
              onChange={e => setLocalWebsite(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-violet-500 outline-none"
            />
          </div>

          {/* Brand Color */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Couleur de marque</label>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg border-2 border-slate-200"
                style={{ backgroundColor: `rgb(${brandColor})` }}
              />
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-2">Choisir une couleur predefinie :</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { name: 'Vert', value: '16, 185, 129' },
                    { name: 'Bleu', value: '59, 130, 246' },
                    { name: 'Rouge', value: '239, 68, 68' },
                    { name: 'Orange', value: '249, 115, 22' },
                    { name: 'Violet', value: '139, 92, 246' },
                    { name: 'Rose', value: '236, 72, 153' },
                    { name: 'Cyan', value: '6, 182, 212' },
                    { name: 'Jaune', value: '234, 179, 8' },
                  ].map(c => (
                    <button
                      key={c.value}
                      onClick={() => handleBrandColorChange(c.value)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        brandColor === c.value ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: `rgb(${c.value})` }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              La couleur est automatiquement extraite du logo quand vous en ajoutez un
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: hasChanges ? `rgb(${brandColor})` : '#cbd5e1' }}
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enregistrement...
              </>
            ) : hasChanges ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Enregistrer les modifications
              </>
            ) : (
              'Aucune modification'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompanySettingsModal;
