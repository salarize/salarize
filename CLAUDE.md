# Salarize - Instructions pour Claude

## Regles de developpement critiques

### 1. Verification systematique des interactions UI ↔ Base de donnees

**AVANT chaque modification de code impliquant des boutons, dropdowns, formulaires ou actions utilisateur:**

1. **Identifier le flux complet:**
   - Quel element UI declenche l'action? (bouton, select, input, etc.)
   - Quelle fonction est appelee au clic/changement?
   - Cette fonction fait-elle un appel Supabase? (insert, update, delete, select)
   - Les donnees sont-elles persistees en base ou seulement en memoire React?

2. **Verifier la coherence:**
   - Si une donnee doit etre sauvegardee → elle DOIT aller dans Supabase
   - Si une donnee est lue → elle DOIT venir de Supabase (pas seulement du state local)
   - Les etats locaux (useState) sont temporaires - toujours synchroniser avec la DB

3. **Tester mentalement le flux:**
   - L'utilisateur clique → l'action se declenche → la DB est mise a jour → l'UI reflete le changement
   - Si l'utilisateur rafraichit la page, les donnees persistent-elles?

### 2. Structure de la base de donnees Supabase

**Tables principales:**
- `companies` - Societes (id, user_id, name, logo, brand_color, website)
- `employees` - Employes par periode (id, company_id, name, department, function, period, total_cost)
- `department_mappings` - Mapping employe → departement (id, company_id, employee_name, department)
- `invitations` - Partages de societe (id, company_id, invited_email, role, status, invite_token, display_name, invited_by, accepted_at)

**Tables CDR (module Compte de Résultat):**
- `cdr_categories` - Categories du CDR (id, company_id, name, type, color, parent_id, sort_order, is_recurring, status)
- `cdr_entries` - Valeurs mensuelles par categorie (id, company_id, category_id, month, year, amount, source, invoice_id)
- `cdr_budget` - Budget mensuel par categorie (id, company_id, category_id, month, year, budget_amount)
- `invoices` - Factures uploadees (id, company_id, supplier_name, invoice_date, amount_ht/tva/ttc, category_id, file_url, status, is_closer_invoice)
- `invoice_lines` - Lignes de facture / deals closers (id, invoice_id, description, quantity, unit_price, total, client_name, closing_date, product_sold)
- `closing_records` - Deals closers consolides (id, company_id, invoice_id, closer_name, client_name, closing_date, amount, product_sold)
- `supplier_category_hints` - Memoire categorisation IA (id, company_id, supplier_name_normalized, category_id, times_confirmed)

**Colonnes critiques a verifier:**
- `invite_token` dans invitations - pour les liens d'invitation
- `accepted_at` dans invitations - date d'acceptation
- `display_name` dans invitations - nom personnalise
- `status` dans invoices - 'pending' | 'validated' | 'rejected' (jamais ecrire dans cdr_entries avant validation)
- `is_closer_invoice` dans invoices - si true, alimenter closing_records depuis invoice_lines
- `source` dans cdr_entries - 'manual' | 'invoice' | 'import'

### 3. Points de vigilance frequents

- **Invitations:** Toujours inserer dans `invitations` table, pas seulement en memoire
- **Departements:** Les mappings doivent etre sauvegardes dans `department_mappings`
- **Sessions:** Verifier que le token d'invitation est traite apres OAuth redirect
- **Permissions:** Verifier `isViewerOnly` avant toute action de modification
- **Heures prestees:** Toute logique d'heures doit persister dans `employees.paid_hours` (import, sauvegarde Supabase, restauration backup) pour alimenter les graphiques par periode/departement
- **CDR - extraction IA:** JAMAIS ecrire dans cdr_entries ou closing_records sans validation humaine explicite - l'IA extrait, l'utilisateur confirme
- **CDR - suppression categorie:** Bloquer si des cdr_entries existent - proposer transfert vers autre categorie
- **CDR - seed categories:** Appeler seed_cdr_categories(company_id) au premier chargement du module CDR pour une societe sans categories

### 4. Stack technique

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Deploiement:** GitHub Pages (dist/ folder)
- **Auth:** Supabase Auth (Google OAuth + Email/Password)
- **IA extraction factures:** Claude Vision API (claude-opus-4-6) - a brancher dans useInvoiceExtraction.js
- **Storage factures:** Supabase Storage bucket "invoices" (prive)

### 8. Architecture navigation

- `currentModule` dans App.jsx : `'overview' | 'payroll' | 'suppliers' | 'cdr'`
- `loadCompany()` remet toujours currentModule a 'overview'
- Logout/SIGNED_OUT reset currentModule a 'overview'
- Sidebar recoit: onOverviewClick, onPayrollClick, onSuppliersClick, onCDRClick
- OverviewPage recoit: user, activeCompany, companies, companyOrder, onSelectCompany, onOpenPayroll, onOpenSuppliers, onOpenCDR, onOpenPayrollWithImport, onOpenSuppliersWithImport, onOpenCDRWithImport

### 9. Structure fichiers CDR

```
src/components/cdr/
├── CDRPage.jsx              - page principale avec tabs (CDR | Closers | Factures)
├── CDRTable.jsx             - table P&L editable inline, groupes categories, mode Reel/Budget/Ecart
├── CDRImportModal.jsx       - import CSV + Google Sheets avec mapping colonnes/lignes
├── CDRInvoiceInjector.jsx   - drag & drop upload factures vers Supabase Storage
├── closers/
│   ├── ClosersDashboard.jsx - table tous closers avec KPIs
│   ├── CloserDetail.jsx     - vue individuelle closer avec graphique mensuel
│   ├── CloserDealsTable.jsx - table deals filtrable/exportable CSV
│   └── CloserKPICard.jsx    - carte KPI reutilisable
└── hooks/
    ├── useCDRData.js        - fetch/mutations categories/entries/budget/invoices
    └── useInvoiceExtraction.js - extraction IA (a implementer - etape 8)
```

### 5. Commandes utiles

```bash
npm run build      # Build pour production
npm run dev        # Serveur de dev local
git push           # Deploy sur GitHub Pages
```

### 6. Workflow de deploiement

1. Modifier le code source dans `src/`
2. `npm run build` - genere les fichiers dans `dist/`
3. `git add -A && git commit -m "message"`
4. `git push` - GitHub Pages deploie automatiquement depuis `dist/`

### 7. Regle UI/SEO

- Le contenu SEO (blocs explicatifs, FAQ marketing, texte long SEO) doit etre affiche uniquement sur la landing page publique.
- Ne jamais afficher ces blocs dans les vues applicatives authentifiees (dashboard, pages internes, etats connectes).
