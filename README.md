# Salarize

Dashboard d'analyse des coûts salariaux pour entreprises belges.

## Design System - Couleurs

### Palette principale Salarize
- **Primary**: Violet `#8B5CF6` (violet-500) → Fuchsia `#D946EF` (fuchsia-500)
- **Gradient principal**: `bg-gradient-to-r from-violet-500 to-fuchsia-500`
- **Gradient header/accents**: `bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600`

### Couleurs de fond (Dark theme)
- **Background principal**: `bg-slate-950` (#020617)
- **Cards/Modals**: `bg-slate-900` (#0f172a)
- **Sections secondaires**: `bg-slate-800` (#1e293b)
- **Inputs/Selects**: `bg-slate-700` (#334155)

### Couleurs de texte
- **Texte principal**: `text-white`
- **Texte secondaire**: `text-slate-300`
- **Texte tertiaire/labels**: `text-slate-400`
- **Texte muted**: `text-slate-500`

### Bordures
- **Bordure principale**: `border-slate-700`
- **Bordure subtile**: `border-slate-700/50`
- **Bordure accent**: `border-violet-500/30`

### Couleurs sémantiques
- **Success**: `from-emerald-500 to-teal-500` (gradients) ou `emerald-500` (solid)
- **Warning/Non assigné**: `amber-400`, `amber-500/20` (background)
- **Info**: `blue-500`, `blue-500/10` (background)
- **Error**: `red-500`, `red-500/10` (background)

### Composants récurrents
```jsx
// Bouton principal
className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-semibold hover:opacity-90 shadow-lg shadow-violet-500/25"

// Bouton secondaire
className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded-xl"

// Input
className="bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-violet-500"

// Card avec accent
className="bg-violet-500/10 border border-violet-500/30 rounded-xl"

// Avatar assigné
className="bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-300 border border-violet-500/20"

// Avatar non assigné
className="bg-amber-500/20 text-amber-300 border border-amber-500/30"
```

## Installation

```bash
npm install
```

## Configuration Google OAuth

1. Va sur [Google Cloud Console](https://console.cloud.google.com/)
2. Crée un projet
3. Active "Google+ API" 
4. Va dans "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Type: Web application
6. Authorized JavaScript origins: `http://localhost:5173`
7. Copie le Client ID dans `src/main.jsx`

## Lancer en développement

```bash
npm run dev
```

Le site sera disponible sur http://localhost:5173

## Build pour production

```bash
npm run build
```

Les fichiers seront dans le dossier `dist/`

## Déploiement

Tu peux déployer sur:
- **Vercel**: `npx vercel`
- **Netlify**: drag & drop le dossier `dist/`
- **Railway**: connecte ton repo GitHub
