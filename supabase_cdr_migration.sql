-- ============================================================
-- SALARIZE — Migration CDR Module
-- Exécuter dans Supabase SQL Editor (une seule fois)
-- ============================================================

-- ─── 1. cdr_categories ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS cdr_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid REFERENCES companies(id) ON DELETE CASCADE,
  name          text NOT NULL,
  type          text CHECK (type IN ('revenue', 'expense')) DEFAULT 'expense',
  color         text,
  parent_id     uuid REFERENCES cdr_categories(id) ON DELETE SET NULL,
  sort_order    integer DEFAULT 0,
  is_recurring  boolean DEFAULT false,
  status        text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'pending_cancel')),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE cdr_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cdr_categories_owner" ON cdr_categories;
CREATE POLICY "cdr_categories_owner" ON cdr_categories
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM invitations WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

-- ─── 2. invoices ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             uuid REFERENCES companies(id) ON DELETE CASCADE,
  supplier_name          text,
  invoice_number         text,
  invoice_date           date,
  due_date               date,
  amount_ht              numeric(12,2),
  amount_tva             numeric(12,2),
  amount_ttc             numeric(12,2),
  currency               text DEFAULT 'EUR',
  category_id            uuid REFERENCES cdr_categories(id) ON DELETE SET NULL,
  file_url               text,
  file_name              text,
  status                 text DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  extraction_confidence  numeric(3,2),
  extracted_by_ai        boolean DEFAULT false,
  is_closer_invoice      boolean DEFAULT false,
  notes                  text,
  created_at             timestamptz DEFAULT now(),
  validated_at           timestamptz
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_owner" ON invoices;
CREATE POLICY "invoices_owner" ON invoices
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM invitations WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

-- ─── 3. invoice_lines ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_lines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    uuid REFERENCES invoices(id) ON DELETE CASCADE,
  description   text,
  quantity      numeric(10,2) DEFAULT 1,
  unit_price    numeric(12,2),
  total         numeric(12,2),
  client_name   text,
  closing_date  date,
  product_sold  text
);

ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_lines_owner" ON invoice_lines;
CREATE POLICY "invoice_lines_owner" ON invoice_lines
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE company_id IN (
        SELECT id FROM companies WHERE user_id = auth.uid()
        UNION
        SELECT company_id FROM invitations WHERE invited_email = auth.email() AND status = 'accepted'
      )
    )
  );

-- ─── 4. closing_records ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS closing_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id    uuid REFERENCES invoices(id) ON DELETE SET NULL,
  closer_name   text,
  client_name   text,
  closing_date  date,
  amount        numeric(12,2),
  product_sold  text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE closing_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "closing_records_owner" ON closing_records;
CREATE POLICY "closing_records_owner" ON closing_records
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM invitations WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

-- ─── 5. cdr_entries ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cdr_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid REFERENCES companies(id) ON DELETE CASCADE,
  category_id  uuid REFERENCES cdr_categories(id) ON DELETE CASCADE,
  month        integer CHECK (month BETWEEN 1 AND 12),
  year         integer,
  amount       numeric(12,2) DEFAULT 0,
  source       text DEFAULT 'manual' CHECK (source IN ('manual', 'invoice', 'import')),
  invoice_id   uuid REFERENCES invoices(id) ON DELETE SET NULL,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (company_id, category_id, month, year, source)
);

ALTER TABLE cdr_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cdr_entries_owner" ON cdr_entries;
CREATE POLICY "cdr_entries_owner" ON cdr_entries
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM invitations WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

-- ─── 6. cdr_budget ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cdr_budget (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid REFERENCES companies(id) ON DELETE CASCADE,
  category_id    uuid REFERENCES cdr_categories(id) ON DELETE CASCADE,
  month          integer CHECK (month BETWEEN 1 AND 12),
  year           integer,
  budget_amount  numeric(12,2) DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (company_id, category_id, month, year)
);

ALTER TABLE cdr_budget ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cdr_budget_owner" ON cdr_budget;
CREATE POLICY "cdr_budget_owner" ON cdr_budget
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM invitations WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

-- ─── 7. supplier_category_hints (mémoire catégorisation IA) ──
CREATE TABLE IF NOT EXISTS supplier_category_hints (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              uuid REFERENCES companies(id) ON DELETE CASCADE,
  supplier_name_normalized text NOT NULL,
  category_id             uuid REFERENCES cdr_categories(id) ON DELETE CASCADE,
  times_confirmed         integer DEFAULT 1,
  UNIQUE (company_id, supplier_name_normalized)
);

ALTER TABLE supplier_category_hints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_hints_owner" ON supplier_category_hints;
CREATE POLICY "supplier_hints_owner" ON supplier_category_hints
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );
-- --- 8. material_costs (module fournisseurs) ---
CREATE TABLE IF NOT EXISTS material_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period TEXT,
  sku TEXT,
  barcode TEXT,
  article_name TEXT,
  supplier TEXT,
  category TEXT,
  unit TEXT,
  quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE material_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_costs_owner" ON material_costs;
CREATE POLICY "material_costs_owner" ON material_costs
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM invitations WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

-- ─── 8. Storage bucket pour les factures ─────────────────────
-- À exécuter dans Supabase Dashboard > Storage > New bucket:
-- Nom: "invoices", Public: false
-- Ou via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "invoices_storage_owner" ON storage.objects;
CREATE POLICY "invoices_storage_owner" ON storage.objects
  FOR ALL USING (
    bucket_id = 'invoices' AND auth.uid() IS NOT NULL
  );

-- ─── 9. Seed catégories par défaut ───────────────────────────
-- Cette fonction est appelée depuis le front lors du premier
-- chargement du module CDR pour une société sans catégories.
-- Elle s'exécute côté Supabase via une RPC.

CREATE OR REPLACE FUNCTION seed_cdr_categories(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cat_fixes uuid;
  cat_vehicules uuid;
  cat_saas uuid;
  cat_equipe uuid;
  cat_revenus uuid;
BEGIN
  -- Vérifier si des catégories existent déjà
  IF EXISTS (SELECT 1 FROM cdr_categories WHERE company_id = p_company_id) THEN
    RETURN;
  END IF;

  -- Charges fixes (groupe parent)
  INSERT INTO cdr_categories (company_id, name, type, color, sort_order)
  VALUES (p_company_id, 'Charges fixes', 'expense', '#6366f1', 10)
  RETURNING id INTO cat_fixes;

  INSERT INTO cdr_categories (company_id, name, type, color, parent_id, sort_order, is_recurring) VALUES
    (p_company_id, 'Bureaux / Loyer',     'expense', '#6366f1', cat_fixes, 11, true),
    (p_company_id, 'Assurances',          'expense', '#6366f1', cat_fixes, 12, true),
    (p_company_id, 'Amortissements',      'expense', '#6366f1', cat_fixes, 13, false),
    (p_company_id, 'Comptable / Juridique','expense', '#6366f1', cat_fixes, 14, true),
    (p_company_id, 'Intérêts bancaires',  'expense', '#6366f1', cat_fixes, 15, true);

  -- Véhicules
  INSERT INTO cdr_categories (company_id, name, type, color, sort_order)
  VALUES (p_company_id, 'Véhicules', 'expense', '#8b5cf6', 20)
  RETURNING id INTO cat_vehicules;

  INSERT INTO cdr_categories (company_id, name, type, color, parent_id, sort_order, is_recurring) VALUES
    (p_company_id, 'Crédit véhicule',   'expense', '#8b5cf6', cat_vehicules, 21, true),
    (p_company_id, 'Assurance véhicule','expense', '#8b5cf6', cat_vehicules, 22, true),
    (p_company_id, 'Entretien véhicule','expense', '#8b5cf6', cat_vehicules, 23, false),
    (p_company_id, 'Carburant',         'expense', '#8b5cf6', cat_vehicules, 24, false);

  -- SaaS & Outils
  INSERT INTO cdr_categories (company_id, name, type, color, sort_order)
  VALUES (p_company_id, 'SaaS & Outils', 'expense', '#06b6d4', 30)
  RETURNING id INTO cat_saas;

  INSERT INTO cdr_categories (company_id, name, type, color, parent_id, sort_order, is_recurring) VALUES
    (p_company_id, 'CRM & Vente',        'expense', '#06b6d4', cat_saas, 31, true),
    (p_company_id, 'Communication',      'expense', '#06b6d4', cat_saas, 32, true),
    (p_company_id, 'Marketing & Pub',    'expense', '#06b6d4', cat_saas, 33, false),
    (p_company_id, 'Automation',         'expense', '#06b6d4', cat_saas, 34, true),
    (p_company_id, 'Productivité',       'expense', '#06b6d4', cat_saas, 35, true),
    (p_company_id, 'Autre SaaS',         'expense', '#06b6d4', cat_saas, 36, false);

  -- Équipe commerciale
  INSERT INTO cdr_categories (company_id, name, type, color, sort_order)
  VALUES (p_company_id, 'Équipe commerciale', 'expense', '#f59e0b', 40)
  RETURNING id INTO cat_equipe;

  INSERT INTO cdr_categories (company_id, name, type, color, parent_id, sort_order, is_recurring) VALUES
    (p_company_id, 'Commissions closers', 'expense', '#f59e0b', cat_equipe, 41, false),
    (p_company_id, 'Coûts formation',     'expense', '#f59e0b', cat_equipe, 42, false),
    (p_company_id, 'Événements & Team',   'expense', '#f59e0b', cat_equipe, 43, false);

  -- Revenus
  INSERT INTO cdr_categories (company_id, name, type, color, sort_order)
  VALUES (p_company_id, 'Revenus', 'revenue', '#10b981', 1)
  RETURNING id INTO cat_revenus;

  INSERT INTO cdr_categories (company_id, name, type, color, parent_id, sort_order) VALUES
    (p_company_id, 'Ventes coaching', 'revenue', '#10b981', cat_revenus, 2),
    (p_company_id, 'Upsells',         'revenue', '#10b981', cat_revenus, 3),
    (p_company_id, 'Autres revenus',  'revenue', '#10b981', cat_revenus, 4);

END;
$$;


-- --- Verification schema cache ---
SELECT
  to_regclass('public.cdr_categories') AS cdr_categories,
  to_regclass('public.cdr_entries') AS cdr_entries,
  to_regclass('public.cdr_budget') AS cdr_budget,
  to_regclass('public.invoices') AS invoices,
  to_regclass('public.closing_records') AS closing_records,
  to_regclass('public.invoice_lines') AS invoice_lines,
  to_regclass('public.supplier_category_hints') AS supplier_category_hints,
  to_regclass('public.material_costs') AS material_costs;
