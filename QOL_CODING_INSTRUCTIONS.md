# Instructions de coding — 5 features QoL Salarize

## Contexte
Tu vas implementer 5 ameliorations QoL dans l'application Salarize (React + Vite + Tailwind + Supabase).
Lis chaque fichier mentionne AVANT de le modifier. Implemente les phases dans l'ordre.
Apres chaque phase, marque-la comme completee dans ta todo list.

---

## Phase 1 — Creer les briques UI et hooks

### 1A. Creer `src/hooks/useRelativeTime.js`

```js
import { useState, useEffect } from 'react';

export function useRelativeTime(date) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!date) { setLabel(''); return; }

    const update = () => {
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) setLabel("à l'instant");
      else if (diffMin === 1) setLabel('il y a 1 min');
      else if (diffMin < 60) setLabel(`il y a ${diffMin} min`);
      else {
        const diffH = Math.floor(diffMin / 60);
        setLabel(`il y a ${diffH}h`);
      }
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [date]);

  return label;
}
```

Verifier si un barrel export `src/hooks/index.js` existe — si oui, y ajouter `export { useRelativeTime } from './useRelativeTime';`.

---

### 1B. Creer `src/components/ui/LastUpdatedBadge.jsx`

```jsx
import { useRelativeTime } from '../../hooks/useRelativeTime';

export function LastUpdatedBadge({ date, className = '' }) {
  const label = useRelativeTime(date);
  if (!label) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] text-slate-400 ${className}`}>
      <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth="2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2" />
      </svg>
      Données {label}
    </span>
  );
}
```

---

### 1C. Creer `src/components/ui/CloudSaveIndicator.jsx`

```jsx
// status: 'idle' | 'saving' | 'saved' | 'error'
export function CloudSaveIndicator({ status }) {
  if (status === 'idle') return null;

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium transition-all duration-300
      ${status === 'saving' ? 'text-slate-400' :
        status === 'saved' ? 'text-emerald-500' :
        'text-red-400'}`}>
      {status === 'saving' && (
        <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      )}
      {status === 'saved' && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4" />
        </svg>
      )}
      {status === 'error' && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span>
        {status === 'saving' ? 'Sauvegarde...' :
         status === 'saved' ? 'Sauvegardé' :
         'Erreur de sauvegarde'}
      </span>
    </div>
  );
}
```

---

### 1D. Creer `src/components/ui/CSVProgressSteps.jsx`

```jsx
const STEPS = [
  { key: 'read',     label: 'Lecture' },
  { key: 'validate', label: 'Validation' },
  { key: 'import',   label: 'Import' },
];

export function CSVProgressSteps({ currentStep }) {
  if (!currentStep) return null;
  const currentIdx = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center gap-2 py-2 px-1">
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-200
              ${isDone ? 'text-emerald-600' : isActive ? 'text-violet-600' : 'text-slate-300'}`}>
              {isDone ? (
                <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : isActive ? (
                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-4 h-4 border-2 border-slate-200 rounded-full" />
              )}
              <span>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 transition-colors duration-200 ${isDone ? 'bg-emerald-300' : 'bg-slate-100'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

### 1E. Ajouter les skeletons dans `src/components/ui/Skeleton.jsx`

Lire le fichier existant pour voir la structure. Ajouter a la fin (avant le dernier export si existant) :

```jsx
export const CDRTableSkeleton = () => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm animate-pulse mt-4">
    {/* Header mois */}
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
      <div className="h-3 bg-slate-200 rounded w-20" />
      <div className="h-3 bg-slate-100 rounded w-32" />
      <div className="ml-auto h-7 bg-slate-200 rounded w-24" />
      <div className="h-7 bg-slate-200 rounded w-24" />
    </div>
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-slate-900">
          <th className="w-[200px] px-3 py-3 text-left">
            <div className="h-3 bg-slate-700 rounded w-20" />
          </th>
          {Array(12).fill(0).map((_, i) => (
            <th key={i} className="px-2 py-3">
              <div className="h-3 bg-slate-700 rounded w-6 ml-auto" />
            </th>
          ))}
          <th className="px-3 py-3">
            <div className="h-3 bg-slate-700 rounded w-10 ml-auto" />
          </th>
        </tr>
      </thead>
      <tbody>
        {[32, 24, 24, 32, 24, 24, 24, 32].map((w, i) => (
          <tr key={i} className={`border-b border-slate-100 ${i % 3 === 0 ? 'bg-slate-50' : ''}`}>
            <td className="px-3 py-2">
              <div className={`h-3 bg-slate-200 rounded`} style={{ width: `${w * 3}px` }} />
            </td>
            {Array(12).fill(0).map((_, j) => (
              <td key={j} className="px-2 py-2">
                <div className="h-3 bg-slate-100 rounded w-10 ml-auto" />
              </td>
            ))}
            <td className="px-3 py-2 bg-slate-50/50">
              <div className="h-3 bg-slate-200 rounded w-12 ml-auto" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const SuppliersSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    {/* Header */}
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="h-3 bg-slate-200 rounded w-36 mb-3" />
      <div className="h-6 bg-slate-200 rounded w-64 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-48" />
    </div>
    {/* 4 KPI cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="h-3 bg-slate-100 rounded w-20 mb-3" />
          <div className="h-6 bg-slate-200 rounded w-24 mb-1" />
          <div className="h-2.5 bg-slate-100 rounded w-16" />
        </div>
      ))}
    </div>
    {/* 2 charts */}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {Array(2).fill(0).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="h-3 bg-slate-200 rounded w-32 mb-4" />
          <div className="h-48 bg-slate-100 rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);
```

---

## Phase 2 — Feature 1 : Skeleton loaders

### Modifier `src/components/cdr/CDRPage.jsx`

1. Lire le fichier complet
2. Importer `CDRTableSkeleton` depuis `'../ui/Skeleton'`
3. Trouver le bloc `{loading ? ( <div ... spinner ... /> ) : ...}` (vers ligne 197)
4. Remplacer le contenu du `loading` par `<CDRTableSkeleton />`

Resultat attendu :
```jsx
{loading ? (
  <CDRTableSkeleton />
) : (
  // ... reste du contenu existant
)}
```

### Modifier `src/components/suppliers/SuppliersDashboardPage.jsx`

1. Lire le fichier
2. Importer `SuppliersSkeleton` depuis `'../ui/Skeleton'`
3. Ajouter `isLoading = false` dans les props du composant
4. Au debut du return, avant tout le contenu, ajouter :
```jsx
if (isLoading) return <SuppliersSkeleton />;
```

### Modifier `src/App.jsx`

1. Chercher `SuppliersDashboardPage` dans le JSX (le composant est rendu conditionnellement)
2. Y ajouter la prop `isLoading={isLoadingData}`
3. Chercher le bloc `{currentModule === 'payroll' && ...}` (ou equivalent)
4. Importer `DashboardSkeleton` depuis `'./components/ui/Skeleton'` si pas deja importe
5. Wrapper le rendu payroll :
```jsx
{currentModule === 'payroll' && (
  isLoadingData ? <DashboardSkeleton /> : <...composant payroll existant...>
)}
```

---

## Phase 3 — Feature 2 : Progress steps CSV

### Modifier `src/components/cdr/CDRImportModal.jsx`

1. Lire le fichier complet
2. Importer `CSVProgressSteps` depuis `'../ui/CSVProgressSteps'`
3. Ajouter le state : `const [csvStep, setCSVStep] = useState(null)`
4. Trouver la fonction `handleFile` (ou `handleFileChange`) qui lit le fichier CSV
5. La transformer pour setter les steps. Pattern exact :

```js
const handleFile = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  // ... setFileName si existe ...
  
  setCSVStep('read');
  const text = await file.text(); // si l'ancienne version utilise FileReader, adapter
  
  setCSVStep('validate');
  await new Promise(r => setTimeout(r, 150)); // pause UX visible
  
  // ... logique de parsing existante (parseCSV, setCSVData, etc.) ...
  
  setCSVStep(null);
};
```

**ATTENTION**: Si `handleFile` utilise `FileReader` (callback-based), wrapper en Promise :
```js
const readFileAsText = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = e => resolve(e.target.result);
  reader.onerror = reject;
  reader.readAsText(file);
});
// puis: const text = await readFileAsText(file);
```

6. Trouver le bouton "Importer" et sa fonction handler. Wrapper :
```js
const handleImport = async () => {
  setCSVStep('import');
  try {
    await onImport(/* args existants */);
  } finally {
    setCSVStep(null);
  }
  // onClose() si present
};
```

7. Dans le JSX, trouver l'endroit juste au-dessus du bouton d'action principal et ajouter :
```jsx
<CSVProgressSteps currentStep={csvStep} />
```

---

## Phase 4 — Feature 3 : Last updated

### Modifier `src/components/cdr/hooks/useCDRData.js`

1. Lire le fichier complet
2. Ajouter le state : `const [lastFetchedAt, setLastFetchedAt] = useState(null)`
3. Trouver la fonction `load` (ou `fetchData`). A la fin du bloc `try`, juste avant `finally` ou a la fin du try :
```js
setLastFetchedAt(new Date());
```
4. Ajouter `lastFetchedAt` dans l'objet retourne par le hook

### Modifier `src/components/cdr/CDRPage.jsx`

1. Destructurer `lastFetchedAt` depuis `useCDRData()`
2. Importer `LastUpdatedBadge` depuis `'../ui/LastUpdatedBadge'`
3. Trouver le header de la page (h1 ou zone titre du module CDR)
4. Ajouter a cote du titre :
```jsx
<LastUpdatedBadge date={lastFetchedAt} className="ml-2" />
```

### Modifier `src/App.jsx`

1. Chercher `setMaterialCosts` dans App.jsx (grep interne)
2. Ajouter pres des autres useState : `const [materialCostsLastFetched, setMaterialCostsLastFetched] = useState(null)`
3. Juste apres chaque `setMaterialCosts(data)` ou `setMaterialCosts(rows)`, ajouter :
```js
setMaterialCostsLastFetched(new Date());
```
4. Passer la prop a `SuppliersDashboardPage` :
```jsx
<SuppliersDashboardPage
  lastFetchedAt={materialCostsLastFetched}
  // ... autres props existantes ...
/>
```

### Modifier `src/components/suppliers/SuppliersDashboardPage.jsx`

1. Ajouter `lastFetchedAt` dans les props
2. Importer `LastUpdatedBadge`
3. Trouver le header du composant et ajouter :
```jsx
<LastUpdatedBadge date={lastFetchedAt} className="ml-2" />
```

---

## Phase 5 — Feature 4 : Auto-save Timesheet

### Modifier `src/components/timesheet/TimesheetPage.jsx`

1. Lire le fichier complet
2. Verifier comment `useDebouncedCallback` est importe (chercher dans src/hooks/)
3. Importer :
```js
import { CloudSaveIndicator } from '../ui/CloudSaveIndicator';
// et le hook debounce, adapter le chemin selon ce qui existe :
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
// OU si le hook n'est pas compatible, utiliser useCallback + useRef + setTimeout
```
4. Ajouter le state : `const [saveStatus, setSaveStatus] = useState('idle')`

5. Creer la fonction auto-save debouncee. La placer APRES la declaration de `supabase` et `user` :
```js
const persistSettings = useDebouncedCallback(async (settings) => {
  setSaveStatus('saving');
  try {
    const { error } = await supabase
      .from('consultant_settings')
      .upsert(
        {
          user_id: user.id,
          default_hourly_rate: settings.default_hourly_rate,
          working_hours_per_day: settings.working_hours_per_day,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2500);
  } catch (err) {
    console.error('Auto-save error:', err);
    setSaveStatus('error');
    setTimeout(() => setSaveStatus('idle'), 3000);
  }
}, 800);
```

**Si `useDebouncedCallback` n'existe pas ou n'est pas compatible :**
```js
const persistSettingsRef = useRef(null);
const persistSettings = useCallback((settings) => {
  clearTimeout(persistSettingsRef.current);
  persistSettingsRef.current = setTimeout(async () => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('consultant_settings')
        .upsert({ user_id: user.id, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, 800);
}, [supabase, user]);
```

6. Trouver les deux inputs `default_hourly_rate` et `working_hours_per_day` dans le JSX
7. Modifier leur `onChange` pour appeler `persistSettings` :
```jsx
onChange={(e) => {
  const newSettings = { ...consultantSettings, default_hourly_rate: parseFloat(e.target.value) || 0 };
  setConsultantSettings(newSettings);
  persistSettings(newSettings);
}}
// idem pour working_hours_per_day
```

8. Trouver le header de la section "Configuration" (h3 ou label au-dessus des inputs)
9. Ajouter `<CloudSaveIndicator status={saveStatus} />` a cote du titre de section :
```jsx
<div className="flex items-center gap-3">
  <h3 className="...">Configuration</h3>
  <CloudSaveIndicator status={saveStatus} />
</div>
```

---

## Phase 6 — Feature 5 : Badge non sauvegarde CDR

### Modifier `src/components/cdr/CDRTable.jsx`

1. Lire le fichier complet
2. Trouver le composant `Cell` (ou equivalent pour les cellules editables inline)
3. Dans le mode `editing` du composant Cell (la branche qui rend un `<input>`), trouver la `<td>` racine
4. Ajouter `const isDirty = draft !== String(value ?? '')` juste avant le return du mode editing
5. Modifier la `<td>` pour avoir `position: relative` (ajouter `relative` dans className)
6. Ajouter le point amber conditionnel a l'interieur de la `<td>`, apres l'`<input>` :
```jsx
{isDirty && (
  <span
    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white z-10 pointer-events-none"
    title="Modification non confirmée — Entrée pour valider, Échap pour annuler"
  />
)}
```

Le point disparait automatiquement quand :
- `onBlur` → `confirm()` → `setEditing(false)` → le composant revient au mode display
- `Escape` → `setEditing(false)` → idem

**Verifier** que le handler `Escape` existe bien dans `onKeyDown`. Si absent, l'ajouter :
```jsx
onKeyDown={(e) => {
  if (e.key === 'Enter') confirm();
  if (e.key === 'Escape') setEditing(false); // annule sans sauvegarder
}}
```

---

## Verification finale

Apres chaque phase :
1. `npm run dev` — verifier qu'aucune erreur de compilation
2. Tester manuellement le flux concerne
3. `npm run build` — verifier que le build de prod passe

Points critiques a tester :
- **Skeleton** : forcer un chargement lent (throttle reseau dans DevTools) pour voir les skeletons
- **CSV steps** : importer un vrai fichier CSV dans CDR pour voir les 3 steps
- **Last updated** : verifier que le badge se rafraichit sans recharger la page
- **Auto-save** : modifier un input timesheet, attendre 800ms, verifier en DB Supabase que la valeur est persistee
- **CDR badge** : cliquer une cellule CDR, modifier la valeur, verifier le point amber, puis Enter pour confirmer
