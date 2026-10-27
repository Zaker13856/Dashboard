-- Note spese Tender e Promozione (centri di costo senza progetto)
-- Backup: backups/2026-10-27T08-12-14

-- 1) missioni
ALTER TABLE missions ADD COLUMN cost_center text NOT NULL DEFAULT 'progetto'
  CHECK (cost_center IN ('progetto','tender','promozione'));
ALTER TABLE missions ADD COLUMN cost_center_note text;
ALTER TABLE missions ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE missions ADD CONSTRAINT missions_progetto_chk
  CHECK ((cost_center = 'progetto') = (project_id IS NOT NULL));

-- 2) voci di spesa
ALTER TABLE expenses ADD COLUMN cost_center text NOT NULL DEFAULT 'progetto'
  CHECK (cost_center IN ('progetto','tender','promozione'));
ALTER TABLE expenses ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE expenses ADD CONSTRAINT expenses_progetto_chk
  CHECK ((cost_center = 'progetto') = (project_id IS NOT NULL));
