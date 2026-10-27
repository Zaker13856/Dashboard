-- Scontrini cancellati 20 giorni dopo l'invio della nota spese (resta la nota, spariscono solo i file)
-- Si può rilanciare senza problemi.

-- 1) data di scadenza degli scontrini su ogni nota
ALTER TABLE missions ADD COLUMN IF NOT EXISTS receipts_expire_at timestamptz;

-- 2) pulizia automatica ogni notte alle 3:00 (ora UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- toglie eventuali versioni precedenti
DELETE FROM vault.secrets WHERE name = 'receipts_cleanup_key';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'pulizia-scontrini';

-- la chiave è quella pubblica del sito (publishable): la pulizia tocca solo file già scaduti
SELECT cron.schedule(
  'pulizia-scontrini',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yhkzkpntfkzcktxdceri.supabase.co/functions/v1/receipts-cleanup',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_MEPLCOYUqHGpAaifZ7tmDg_EOZVzphI"}'::jsonb,
    body := '{"action":"cleanup"}'::jsonb
  );
  $$
);
