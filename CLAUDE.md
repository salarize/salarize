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

**Colonnes critiques a verifier:**
- `invite_token` dans invitations - pour les liens d'invitation
- `accepted_at` dans invitations - date d'acceptation
- `display_name` dans invitations - nom personnalise

### 3. Points de vigilance frequents

- **Invitations:** Toujours inserer dans `invitations` table, pas seulement en memoire
- **Departements:** Les mappings doivent etre sauvegardes dans `department_mappings`
- **Sessions:** Verifier que le token d'invitation est traite apres OAuth redirect
- **Permissions:** Verifier `isViewerOnly` avant toute action de modification

### 4. Stack technique

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Deploiement:** GitHub Pages (dist/ folder)
- **Auth:** Supabase Auth (Google OAuth + Email/Password)

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
