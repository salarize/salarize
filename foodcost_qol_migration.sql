-- ============================================================
-- FOOD COST MODULE — QoL MIGRATION (run AFTER foodcost_migration.sql)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Additional columns on food_import_jobs ──────────────────
ALTER TABLE food_import_jobs
  ADD COLUMN IF NOT EXISTS file_hash        TEXT,
  ADD COLUMN IF NOT EXISTS progress         INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duplicate_of     UUID REFERENCES food_import_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retry_count      INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_food_import_jobs_hash ON food_import_jobs(company_id, file_hash);

-- ── Additional columns on food_invoice_lines ────────────────
ALTER TABLE food_invoice_lines
  ADD COLUMN IF NOT EXISTS sku                  TEXT,
  ADD COLUMN IF NOT EXISTS is_confirmed         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS raw_columns          JSONB,
  ADD COLUMN IF NOT EXISTS original_extracted   JSONB,
  ADD COLUMN IF NOT EXISTS source_metadata      JSONB,
  ADD COLUMN IF NOT EXISTS duplicate_group_id   UUID,
  ADD COLUMN IF NOT EXISTS edited_by            TEXT,
  ADD COLUMN IF NOT EXISTS edited_at            TIMESTAMPTZ;

-- ── food_corrections — audit trail of every field edit ──────
CREATE TABLE IF NOT EXISTS food_corrections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    TEXT NOT NULL,
  line_id       UUID NOT NULL REFERENCES food_invoice_lines(id) ON DELETE CASCADE,
  field_name    TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  edited_by     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_food_corrections_line ON food_corrections(line_id);
ALTER TABLE food_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food_corrections_access" ON food_corrections
  FOR ALL USING (
    company_id IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id::text FROM invitations WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

-- ── food_duplicate_groups — suspected duplicate invoice lines ─
CREATE TABLE IF NOT EXISTS food_duplicate_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved_keep_both','resolved_merge','resolved_ignore')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE food_duplicate_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food_duplicate_groups_access" ON food_duplicate_groups
  FOR ALL USING (
    company_id IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id::text FROM invitations WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

-- ── food_anomalies — price spikes, unknown units, missing data ─
CREATE TABLE IF NOT EXISTS food_anomalies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      TEXT NOT NULL,
  article_id      UUID REFERENCES food_articles(id) ON DELETE SET NULL,
  supplier_id     UUID REFERENCES food_suppliers(id) ON DELETE SET NULL,
  invoice_line_id UUID REFERENCES food_invoice_lines(id) ON DELETE SET NULL,
  anomaly_type    TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  description     TEXT,
  value           NUMERIC,
  threshold       NUMERIC,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','ignored')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_food_anomalies_company ON food_anomalies(company_id, status, created_at DESC);
ALTER TABLE food_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food_anomalies_access" ON food_anomalies
  FOR ALL USING (
    company_id IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id::text FROM invitations WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

-- ── food_unit_conversions — custom supplier pack conversions ──
CREATE TABLE IF NOT EXISTS food_unit_conversions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      TEXT NOT NULL,
  supplier_id     UUID REFERENCES food_suppliers(id) ON DELETE CASCADE,
  raw_unit        TEXT NOT NULL,
  normalized_unit TEXT NOT NULL CHECK (normalized_unit IN ('kg','L','unit')),
  factor          NUMERIC NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, supplier_id, raw_unit)
);
ALTER TABLE food_unit_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food_unit_conversions_access" ON food_unit_conversions
  FOR ALL USING (
    company_id IN (
      SELECT id::text FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id::text FROM invitations WHERE invited_email = auth.email() AND status = 'accepted'
    )
  );

-- ── Realtime for anomalies ────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE food_anomalies;
ALTER PUBLICATION supabase_realtime ADD TABLE food_corrections;
