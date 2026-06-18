-- ============================================================
-- FOOD COST MODULE — SUPABASE MIGRATION
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Suppliers
CREATE TABLE IF NOT EXISTS food_suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  TEXT NOT NULL,
  name        TEXT NOT NULL,
  address     TEXT,
  email       TEXT,
  phone       TEXT,
  country     TEXT DEFAULT 'BE',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Invoices (one row per PDF)
CREATE TABLE IF NOT EXISTS food_invoices (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             TEXT NOT NULL,
  supplier_id            UUID REFERENCES food_suppliers(id) ON DELETE SET NULL,
  invoice_number         TEXT,
  invoice_date           DATE,
  file_url               TEXT NOT NULL,
  total_ht               NUMERIC(12,2),
  total_tva              NUMERIC(12,2),
  total_ttc              NUMERIC(12,2),
  status                 TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validated','rejected')),
  extraction_confidence  NUMERIC(4,3),
  page_count             INT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Article master catalog
CREATE TABLE IF NOT EXISTS food_articles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  category       TEXT DEFAULT 'other' CHECK (category IN ('meat','fish','dairy','produce','dry','beverage','other')),
  default_unit   TEXT DEFAULT 'kg' CHECK (default_unit IN ('kg','L','unit')),
  aliases        TEXT[] DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Article aliases (for fast fuzzy matching)
CREATE TABLE IF NOT EXISTS food_article_aliases (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id         UUID NOT NULL REFERENCES food_articles(id) ON DELETE CASCADE,
  alias_text         TEXT NOT NULL,
  source_supplier_id UUID REFERENCES food_suppliers(id) ON DELETE SET NULL,
  times_seen         INT DEFAULT 1,
  UNIQUE(article_id, alias_text)
);

-- 5. Invoice lines (one row per article line on an invoice)
CREATE TABLE IF NOT EXISTS food_invoice_lines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id            UUID NOT NULL REFERENCES food_invoices(id) ON DELETE CASCADE,
  company_id            TEXT NOT NULL,
  raw_description       TEXT,
  article_id            UUID REFERENCES food_articles(id) ON DELETE SET NULL,
  quantity              NUMERIC(12,4),
  unit_raw              TEXT,
  unit_normalized       TEXT CHECK (unit_normalized IN ('kg','L','unit') OR unit_normalized IS NULL),
  quantity_normalized   NUMERIC(12,6),
  unit_price_raw        NUMERIC(12,4),
  unit_price_normalized NUMERIC(12,6),
  total_price_ht        NUMERIC(12,2),
  tva_rate              NUMERIC(6,4),
  total_price_ttc       NUMERIC(12,2),
  confidence            NUMERIC(4,3),
  needs_review          BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Price history (one row per validated line — used for VWAP)
CREATE TABLE IF NOT EXISTS food_price_history (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              TEXT NOT NULL,
  article_id              UUID NOT NULL REFERENCES food_articles(id) ON DELETE CASCADE,
  supplier_id             UUID REFERENCES food_suppliers(id) ON DELETE SET NULL,
  invoice_line_id         UUID REFERENCES food_invoice_lines(id) ON DELETE SET NULL,
  date                    DATE NOT NULL,
  quantity_normalized     NUMERIC(12,6) NOT NULL,
  price_per_normalized_unit NUMERIC(12,6) NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Import jobs queue (one row per uploaded PDF)
CREATE TABLE IF NOT EXISTS food_import_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          TEXT NOT NULL,
  file_url            TEXT NOT NULL,
  file_name           TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','processing','done','error','duplicate_blocked')),
  lines_extracted     INT DEFAULT 0,
  lines_needing_review INT DEFAULT 0,
  error_message       TEXT,
  force_reimport      BOOLEAN DEFAULT FALSE,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_food_invoices_company     ON food_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_food_invoice_lines_invoice ON food_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_food_invoice_lines_article ON food_invoice_lines(article_id);
CREATE INDEX IF NOT EXISTS idx_food_price_history_article ON food_price_history(article_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_food_import_jobs_company  ON food_import_jobs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_article_aliases_text ON food_article_aliases(alias_text);

-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS — users only see their own company's data
-- ============================================================
ALTER TABLE food_suppliers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_articles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_article_aliases   ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_invoice_lines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_price_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_import_jobs       ENABLE ROW LEVEL SECURITY;

-- Helper: get company_ids the current user owns or is invited to
-- (mirrors the pattern used by existing tables in this project)
CREATE POLICY "food_suppliers_access" ON food_suppliers
  FOR ALL USING (
    company_id IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id::text FROM invitations
        WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

CREATE POLICY "food_invoices_access" ON food_invoices
  FOR ALL USING (
    company_id IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id::text FROM invitations
        WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

CREATE POLICY "food_articles_access" ON food_articles
  FOR ALL USING (
    company_id IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id::text FROM invitations
        WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

CREATE POLICY "food_article_aliases_access" ON food_article_aliases
  FOR ALL USING (
    article_id IN (
      SELECT id FROM food_articles WHERE company_id IN (
        SELECT id::text FROM companies WHERE user_id = auth.uid()
        UNION
        SELECT company_id::text FROM invitations
          WHERE invited_email = auth.email() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "food_invoice_lines_access" ON food_invoice_lines
  FOR ALL USING (
    company_id IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id::text FROM invitations
        WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

CREATE POLICY "food_price_history_access" ON food_price_history
  FOR ALL USING (
    company_id IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id::text FROM invitations
        WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

CREATE POLICY "food_import_jobs_access" ON food_import_jobs
  FOR ALL USING (
    company_id IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id::text FROM invitations
        WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

-- ============================================================
-- REALTIME (so the frontend can subscribe to job updates)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE food_import_jobs;
