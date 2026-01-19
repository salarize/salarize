# Salarize

Dashboard d'analyse des coûts salariaux pour entreprises belges.

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
