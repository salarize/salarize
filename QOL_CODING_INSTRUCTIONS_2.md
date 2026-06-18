# QOL Coding Instructions 2

Plan cible: Features #6 #7 #10 #14 #16

## Nouveaux composants (Phase 1)
- ui/ConfirmDialog.jsx
- ui/SearchInput.jsx
- ui/CSVPreview.jsx
- ui/UnsavedWarningDialog.jsx
- context/DirtyContext.jsx

## Feature #6
- Remplacer les confirmations natives dans DayEntryModal + ProjectsManager
- Ajouter suppression catégorie CDR via ConfirmDialog
- Ajouter deleteCategory dans useCDRData.js

## Feature #7
- Bloquer navigation module/société en cas d’état non sauvegardé (showImportModal, pendingPeriodSelection, showMaterialImportModal)
- Afficher UnsavedWarningDialog
- Intégrer états dirty CDR via DirtyContext

## Feature #10
- Supprimer listener clavier d’OverviewPage
- Centraliser H/F/C/O + Backspace dans App.jsx
- Ajouter raccourcis CDR (1/2/3, Alt+?/?, I)
- Ajouter Échap dans CDRImportModal + DayEntryModal

## Feature #14
- Ajouter recherche payroll dans App.jsx (state + filteredEmployees)
- Reset recherche au changement de société
- Empty state si aucun résultat

## Feature #16
- Ajouter preview CSV dans CDRImportModal (3 lignes, max 8 colonnes)
- Ajouter preview CSV dans modal matière première (App.jsx)

## Ordre
Phase 1 (composants) -> #6 -> #14 -> #16 -> #10 -> #7
