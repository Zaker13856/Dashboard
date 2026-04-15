-- Aggiunge la colonna is_lump_sum alla tabella projects
-- Da eseguire una volta sola nell'SQL editor di Supabase

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_lump_sum BOOLEAN NOT NULL DEFAULT FALSE;

-- Imposta i progetti esistenti noti come Lump Sum (opzionale, modifica i nomi se necessario)
-- UPDATE projects SET is_lump_sum = TRUE WHERE name IN ('Road4All', 'Biomape');
