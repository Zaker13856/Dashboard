-- Aggiunge le colonne extra alla tabella expenses per tracciare tutti i dati del foglio spese
-- Da eseguire una volta sola nell'SQL editor di Supabase

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS invoice_ref      TEXT,
  ADD COLUMN IF NOT EXISTS iva              NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS eligible_amount  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_date     DATE;
