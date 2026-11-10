# Handoff — Dashboard ISINNOVA: sicurezza completata, edge function pendente

**Date:** 2026-06-12
**Next focus:** deploy edge function `admin-users` con i nuovi secrets + pulizia node_modules dal repo

## Context

- Repo: `C:\Users\DaniloU7b\Hostinger\Dashboard` → GitHub privato Zaker13856/Dashboard, branch **master** (non main). Sito live: isinnova.cloud (FTP Hostinger). Supabase project ref: `yhkzkpntfkzcktxdceri`.
- Sessione odierna: 2 commit separati (lato consulente timesheet + vista admin timesheet, tag `stabile-pre-admin-timesheet`), deploy FTP ×2, link Timesheets in AdminHeader.
- **Rotazione chiavi Supabase COMPLETATA**: backup dati → migrazione sito a publishable key → nuova secret key per script → legacy JWT keys (anon+service_role) disabilitate dal pannello. Verificato: sito 200, REST 200, chiavi vecchie 401.
- Chiavi/password hardcoded rimosse da `scripts/create-users.js`, `verify-users.js`, `import-expenses.cjs`, `create-consultants-auth.js` e `supabase/functions/admin-users/index.ts` → tutti leggono `.env` (commit `ae14399d`). Vecchi segreti restano nella git history ma sono revocati (innocui).

## State

**Fatto:**
- Tutto committato e pushato fino a `ae14399d`. Working tree pulito (salvo `.env` e `backups/`, gitignorati).
- Backup DB ×2: `backups/2026-06-12T15-04-35/` (pre-rotazione) e `backups/2026-06-12T15-55-58/` (post-rotazione, con chiavi nuove — script verificato) — 11 tabelle JSON (1025 righe) + `auth_users.json` (16 utenti). Script riusabile: `node scripts/backup-supabase.cjs`. Timestamp cartelle in UTC.
- `.env` (MAI committare) contiene: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (ora `sb_publishable_...`), `SUPABASE_SERVICE_ROLE_KEY` (ora `sb_secret_...` nuova), `DEFAULT_RESET_PASSWORD`.
- Deploy flow: `npx vite build` poi `node scripts/deploy-ftp.cjs` poi `node scripts/clean-old-assets.cjs` (sempre dentro la cartella repo).

**Pendente:**
1. **Edge function `admin-users` non deployata** — finché manca, da admin UI falliscono creazione account consulenti e reset password (resto del sito ok). ⚠️ CRITICO: con le legacy keys disabilitate, la env auto-iniettata `SUPABASE_SERVICE_ROLE_KEY` nelle functions è morta → impostare come secrets della function la nuova secret key (da `.env`) e `DEFAULT_RESET_PASSWORD`.
2. **`node_modules` tracciato nel repo** (~37.400 file) — aggiungere a `.gitignore` + `git rm -r --cached node_modules` + commit.
3. Timesheet lato admin appena deployato (`/admin/timesheets`, 3 tab + export Excel) — testato superficialmente, feedback utente pendente.

**Blocker per il punto 1:** serve `npx supabase login` (interattivo, deve farlo l'utente) prima di `npx supabase functions deploy admin-users --project-ref yhkzkpntfkzcktxdceri`.

**Regola utente (da memoria):** chiedere SEMPRE OK esplicito prima di qualsiasi deploy FTP.

**Gotcha tecnico:** `Invoke-WebRequest` (PS 5.1) dava falsi 401 testando le chiavi `sb_secret_`; usare `curl.exe`.

## Key references

- `C:\Users\DaniloU7b\.claude\projects\C--Users-DaniloU7b\memory\project_dashboard.md` — stato completo progetto, architettura spese, storia fix
- `C:\Users\DaniloU7b\Hostinger\Dashboard\HANDOFF_TIMESHEET.md` — handoff funzionale sul sistema timesheet (committato nel repo)
- `supabase/functions/admin-users/index.ts` — edge function da deployare (richiede env `DEFAULT_RESET_PASSWORD`, niente fallback)
- `scripts/backup-supabase.cjs` — backup dati via REST, legge `.env`
- Pannello chiavi: https://supabase.com/dashboard/project/yhkzkpntfkzcktxdceri/settings/api-keys

## Suggested skills

- `/handoff` — a fine prossima sessione, per continuità
- `superpowers:verification-before-completion` — prima di dichiarare deployata la edge function, testare davvero creazione account/reset password

## Next steps

1. Far eseguire all'utente `npx supabase login` (suggerire `! npx supabase login` in chat).
2. Impostare i secrets della function: `npx supabase secrets set SB_SECRET_KEY=<da .env> DEFAULT_RESET_PASSWORD=<da .env> --project-ref yhkzkpntfkzcktxdceri` — nota: i nomi `SUPABASE_*` sono riservati nei secrets; se necessario rinominare la env letta in `index.ts` (es. `SB_SECRET_KEY`) e aggiornare il codice di conseguenza prima del deploy.
3. `npx supabase functions deploy admin-users --project-ref yhkzkpntfkzcktxdceri`.
4. Test reale: da admin UI creare un account di prova / reset password; verificare 200 e login.
5. Pulizia `node_modules` dal tracking git (punto 2 sopra) + commit + push.
6. Aggiornare `project_dashboard.md` (memoria) a lavoro finito.
