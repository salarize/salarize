# Structure du Projet Salarize

Ce document explique l'organisation du code pour faciliter les modifications.

## Vue d'ensemble

```
src/
├── config/              # Configuration des services externes
├── constants/           # Données statiques et constantes
├── utils/               # Fonctions utilitaires
├── hooks/               # Hooks React personnalisés
├── context/             # Contexts React (providers)
├── components/          # Composants réutilisables
│   ├── ui/              # Composants UI de base
│   ├── layout/          # Composants de mise en page
│   ├── landing/         # Composants de la landing page
│   └── dashboard/       # Composants du dashboard
├── pages/               # Pages de l'application
├── styles/              # Fichiers CSS
└── App.jsx              # Composant principal (logique métier)
```

---

## Guide de modification

### Configuration & Services externes

| Modifier | Fichier | Contenu |
|----------|---------|---------|
| Connexion Supabase | `config/supabase.js` | URL, clé API, client Supabase |
| EmailJS | `config/emailjs.js` | Service ID, Template ID, Public Key |
| Stockage session | `config/storage.js` | sessionOnlyStorage, sync entre onglets |

### Constantes & Données

| Modifier | Fichier | Contenu |
|----------|---------|---------|
| Données de démo | `constants/demo.js` | DEMO_COMPANY, DEMO_EMPLOYEES, DEMO_MAPPING |
| Plans tarifaires | `constants/pricing.js` | PRICING_PLANS (Starter, Pro, Business) |
| Départements | `constants/defaults.js` | DEFAULT_DEPARTMENTS, ONBOARDING_MESSAGES |
| Couleurs/Design | `constants/design.js` | DESIGN (couleurs, ombres), CHART_COLORS |

### Utilitaires

| Modifier | Fichier | Contenu |
|----------|---------|---------|
| Format monétaire | `utils/formatting.js` | formatCurrency (ex: €1.234,56) |
| Format pourcentage | `utils/formatting.js` | formatPercent (ex: +12,5%) |
| Format nombre | `utils/formatting.js` | formatNumber (locale fr-BE) |

### Hooks personnalisés

| Modifier | Fichier | Contenu |
|----------|---------|---------|
| Debounce valeur | `hooks/useDebounce.js` | Retarde les mises à jour |
| Debounce callback | `hooks/useDebouncedCallback.js` | Retarde l'exécution de fonctions |

### Context (Providers)

| Modifier | Fichier | Contenu |
|----------|---------|---------|
| Notifications toast | `context/ToastContext.jsx` | ToastProvider, useToast |

### Composants UI (`components/ui/`)

| Modifier | Fichier | Contenu |
|----------|---------|---------|
| Boutons | `ui/Button.jsx` | Variantes: primary, secondary, danger, ghost |
| Modales | `ui/Modal.jsx` | Tailles: sm, md, lg, xl, full |
| États vides | `ui/EmptyState.jsx` | Icône, titre, description, action |
| Spinner | `ui/LoadingSpinner.jsx` | Logo "S" animé, tailles sm/md/lg |
| Squelettes | `ui/Skeleton.jsx` | Skeleton, CardSkeleton, ChartSkeleton, etc. |

### Composants Layout (`components/layout/`)

| Modifier | Fichier | Contenu |
|----------|---------|---------|
| Pied de page | `layout/Footer.jsx` | Liens, contact, légal |
| Transitions | `layout/PageTransition.jsx` | Animation d'entrée des pages |
| Page d'erreur | `layout/ErrorBoundary.jsx` | Affichage en cas de crash |

### Composants Landing (`components/landing/`)

| Modifier | Fichier | Contenu |
|----------|---------|---------|
| Header/Nav | `landing/LandingHeader.jsx` | Logo, navigation, menu utilisateur |

### Composants Dashboard (`components/dashboard/`)

| Modifier | Fichier | Contenu |
|----------|---------|---------|
| Authentification | `dashboard/AuthModal.jsx` | Login/signup avec Google OAuth |
| Header mobile | `dashboard/DashboardHeader.jsx` | Navigation mobile du dashboard |
| Sidebar | `dashboard/Sidebar.jsx` | Menu latéral avec navigation |
| Sélection société | `dashboard/SelectCompanyModal.jsx` | Créer/sélectionner une société |
| Paramètres société | `dashboard/CompanySettingsModal.jsx` | Logo, couleur, paramètres |

### Pages (`pages/`)

| Page | Fichier | Description |
|------|---------|-------------|
| Accueil | `pages/LandingPage.jsx` | Hero, features preview, CTA |
| Fonctionnalités | `pages/FeaturesPage.jsx` | Liste des fonctionnalités |
| Tarifs | `pages/PricingPage.jsx` | Plans et pricing |
| Démo | `pages/DemoPage.jsx` | Démo interactive avec graphiques |
| Profil | `pages/ProfilePage.jsx` | Paramètres utilisateur |
| Mentions légales | `pages/LegalPage.jsx` | Informations légales |
| Confidentialité | `pages/PrivacyPage.jsx` | Politique RGPD |
| CGU | `pages/TermsPage.jsx` | Conditions d'utilisation |
| Cookies | `pages/CookiesPage.jsx` | Politique cookies |

### Styles

| Modifier | Fichier | Contenu |
|----------|---------|---------|
| Animations | `styles/animations.css` | fadeIn, slideIn, slideOut, stagger |

### App.jsx (Fichier principal)

**Contient uniquement la logique métier principale :**

- `AppContent` : État global, import Excel, sync Supabase, routing
- `App` : Wrapper avec ErrorBoundary et ToastProvider

---

## Comment importer

```javascript
// Config
import { supabase, getValidSession } from './config/supabase';
import { emailjs, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID } from './config/emailjs';

// Constants
import { DEMO_COMPANY, DEMO_EMPLOYEES, DEMO_MAPPING } from './constants/demo';
import { PRICING_PLANS } from './constants/pricing';
import { DEFAULT_DEPARTMENTS, ONBOARDING_MESSAGES } from './constants/defaults';
import { DESIGN, CHART_COLORS } from './constants/design';

// Utils
import { formatCurrency, formatPercent, formatNumber } from './utils';

// Hooks
import { useDebounce, useDebouncedCallback } from './hooks';

// Context
import { ToastProvider, useToast } from './context/ToastContext';

// Components - UI
import { Button, Modal, LoadingSpinner, EmptyState } from './components/ui';
import { Skeleton, CardSkeleton, ChartSkeleton } from './components/ui';

// Components - Layout
import { Footer, PageTransition, ErrorBoundary } from './components/layout';

// Components - Landing
import { LandingHeader } from './components/landing';

// Components - Dashboard
import { AuthModal, DashboardHeader, Sidebar } from './components/dashboard';
import { SelectCompanyModal, CompanySettingsModal } from './components/dashboard';

// Pages
import { LandingPage, FeaturesPage, PricingPage, DemoPage } from './pages';
import { ProfilePage, LegalPage, PrivacyPage, TermsPage, CookiesPage } from './pages';
```

---

## Technologies utilisées

- **React** - Framework UI
- **Vite** - Build tool
- **Tailwind CSS** - Styles
- **Supabase** - Backend (auth + database)
- **EmailJS** - Envoi d'emails
- **Recharts** - Graphiques
- **XLSX** - Import/export Excel

---

## Notes pour Claude

1. **Pour modifier l'UI d'un composant réutilisable** → Chercher dans `components/ui/`
2. **Pour modifier une page** → Chercher dans `pages/`
3. **Pour modifier le dashboard** → Chercher dans `components/dashboard/`
4. **Pour modifier des données statiques** → Chercher dans `constants/`
5. **Pour modifier la connexion à un service** → Chercher dans `config/`
6. **Pour modifier la logique métier globale** → Aller dans `App.jsx`
7. **Les imports se font via les fichiers `index.js`** de chaque dossier
