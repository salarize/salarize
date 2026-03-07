# Salarize - Documentation Base de DonnÃ©es

## Structure des Tables

### 1. `companies`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID (PK) | Identifiant unique |
| user_id | UUID (FK â†’ auth.users) | PropriÃ©taire de la sociÃ©tÃ© |
| name | TEXT | Nom de la sociÃ©tÃ© |
| created_at | TIMESTAMP | Date de crÃ©ation |

### 2. `employees`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID (PK) | Identifiant unique |
| company_id | UUID (FK â†’ companies) | SociÃ©tÃ© de l'employÃ© |
| name | TEXT | Nom complet |
| gross_salary | NUMERIC | Salaire brut |
| net_salary | NUMERIC | Salaire net |
| employer_cost | NUMERIC | CoÃ»t employeur |
| paid_hours | NUMERIC | Heures prestÃ©es |
| contract_type | TEXT | Type de contrat (CDI, CDD, etc.) |
| created_at | TIMESTAMP | Date de crÃ©ation |

### 3. `department_mappings`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID (PK) | Identifiant unique |
| company_id | UUID (FK â†’ companies) | SociÃ©tÃ© |
| employee_id | UUID (FK â†’ employees) | EmployÃ© |
| department | TEXT | Nom du dÃ©partement |
| created_at | TIMESTAMP | Date de crÃ©ation |

### 4. `invitations`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID (PK) | Identifiant unique |
| company_id | UUID (FK â†’ companies) | SociÃ©tÃ© partagÃ©e |
| company_name | TEXT | Nom de la sociÃ©tÃ© (snapshot) |
| invited_email | TEXT | Email de l'invitÃ© |
| invited_by | UUID (FK â†’ auth.users) | Utilisateur qui invite |
| role | TEXT | 'viewer' ou 'editor' |
| status | TEXT | 'pending' ou 'accepted' |
| **token** | UUID | Token unique pour le lien d'invitation |
| accepted_at | TIMESTAMP | Date d'acceptation |
| created_at | TIMESTAMP | Date de crÃ©ation |

> **IMPORTANT**: La colonne s'appelle `token` (PAS `invite_token`)

---

## Politiques RLS Actuelles

Toutes les tables utilisent des politiques **permissives** pour les utilisateurs authentifiÃ©s :

```sql
-- COMPANIES
CREATE POLICY "companies_all" ON companies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EMPLOYEES
CREATE POLICY "employees_all" ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DEPARTMENT_MAPPINGS
CREATE POLICY "dept_mappings_all" ON department_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- INVITATIONS
CREATE POLICY "invitations_all" ON invitations FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## Scripts de VÃ©rification

### Migration requise (heures prestÃ©es)

```sql
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS paid_hours NUMERIC DEFAULT 0;

UPDATE employees
SET paid_hours = 0
WHERE paid_hours IS NULL;
```


### VÃ©rification complÃ¨te de la BDD

```sql
-- 1. Structure des tables
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('companies', 'employees', 'department_mappings', 'invitations')
ORDER BY table_name, ordinal_position;

-- 2. Politiques RLS
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';

-- 3. RLS activÃ© ?
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('companies', 'employees', 'department_mappings', 'invitations');

-- 4. Comptages
SELECT
  (SELECT COUNT(*) FROM companies) as companies_count,
  (SELECT COUNT(*) FROM employees) as employees_count,
  (SELECT COUNT(*) FROM department_mappings) as mappings_count,
  (SELECT COUNT(*) FROM invitations) as invitations_count;

-- 5. SociÃ©tÃ©s et propriÃ©taires
SELECT c.id, c.name, c.user_id, u.email as owner_email
FROM companies c
LEFT JOIN auth.users u ON c.user_id = u.id;

-- 6. Invitations
SELECT id, company_name, invited_email, role, status, token, created_at
FROM invitations
ORDER BY created_at DESC;

-- 7. EmployÃ©s par sociÃ©tÃ©
SELECT c.name as company, COUNT(e.id) as employee_count
FROM companies c
LEFT JOIN employees e ON e.company_id = c.id
GROUP BY c.id, c.name;
```

### Reset des politiques RLS (si problÃ¨me)

```sql
-- Supprimer toutes les politiques
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- RÃ©activer RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RecrÃ©er les politiques permissives
CREATE POLICY "companies_all" ON companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "employees_all" ON employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "dept_mappings_all" ON department_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "invitations_all" ON invitations FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## Checklist avant modification BDD

- [ ] ExÃ©cuter le script de vÃ©rification complÃ¨te
- [ ] Noter l'Ã©tat actuel (comptages, politiques)
- [ ] Faire la modification
- [ ] Re-exÃ©cuter le script de vÃ©rification
- [ ] Comparer avant/aprÃ¨s
- [ ] Tester l'application (login, affichage donnÃ©es, invitations)

---

## Erreurs Connues et Solutions

### Erreur: "null value in column 'token'"
**Cause**: Code utilise `invite_token` au lieu de `token`
**Solution**: VÃ©rifier que le code utilise `token` partout

### Erreur: "new row violates row-level security policy"
**Cause**: Politique RLS trop restrictive
**Solution**: ExÃ©cuter le script de reset des politiques RLS

### Erreur: Invitation reste "pending"
**Cause**: Politique UPDATE manquante sur `invitations`
**Solution**: VÃ©rifier que la politique `invitations_all` existe

### Erreur: Utilisateur ne voit pas les donnÃ©es partagÃ©es
**Cause**: Politiques SELECT trop restrictives
**Solution**: VÃ©rifier les politiques sur `companies`, `employees`, `department_mappings`

---

## DonnÃ©es de Test Actuelles

- **therealmoyt@gmail.com**: PropriÃ©taire de Fresheo (50 employÃ©s) et Mamy Home
- **momoabdouni2@gmail.com**: InvitÃ© sur Mamy Home (role: viewer)

Token d'invitation actif: `5c33132e-bf3e-4ea2-a186-873b85b09def`
