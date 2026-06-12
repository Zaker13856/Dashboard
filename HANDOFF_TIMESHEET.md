# Handoff — Parte Timesheet (Dashboard ISINNOVA)

> Documento per agente che riprende il lavoro sulla parte Timesheet.
> Aggiornato: 12/06/2026. Stato deploy: live su https://isinnova.cloud

## Progetto

Dashboard gestione consulenti per progetti EU (Horizon): timesheet ore, nota spese a missioni, budget progetti.
Due ruoli: **admin** e **consultant** (campo `role` in tabella `consultants`).

- **Stack**: Vite + React 18 (JSX, no TS) + Tailwind + shadcn/Radix + Supabase (DB/auth/realtime) + `xlsx` per export Excel
- **Dir locale**: `C:/Users/DaniloU7b/Hostinger/Dashboard/`
- **Repo**: https://github.com/Zaker13856/Dashboard (privato) — ⚠️ modifiche del 12/06 non ancora committate
- **Supabase**: `https://yhkzkpntfkzcktxdceri.supabase.co` — chiavi in `.env` (`VITE_SUPABASE_ANON_KEY` client, `SUPABASE_SERVICE_ROLE_KEY` solo script node)
- **Build**: `npx vite build` (NB: `npm run build` passa da `tools/generate-llms.js` che può fallire silenziosamente)
- **Deploy**: `node scripts/deploy-ftp.cjs` poi `node scripts/clean-old-assets.cjs` (rimuove asset di build vecchie dal server)
- **REGOLA**: chiedere SEMPRE conferma esplicita all'utente prima di un deploy FTP
- **Script DB**: `node --env-file=.env scripts/<file>.mjs`

## Stato Timesheet — cosa esiste

### Lato consulente (FUNZIONANTE, base completa) — scheda di riferimento

**Percorsi esatti dei file della scheda Timesheet pronta:**

| File | Percorso assoluto |
|------|-------------------|
| Pagina | `C:\Users\DaniloU7b\Hostinger\Dashboard\src\pages\ConsultantTimesheetPage.jsx` |
| Form mese (cuore) | `C:\Users\DaniloU7b\Hostinger\Dashboard\src\components\TimesheetMonthForm.jsx` |
| Riga libera | `C:\Users\DaniloU7b\Hostinger\Dashboard\src\components\TimesheetFreeRow.jsx` |
| Context dati | `C:\Users\DaniloU7b\Hostinger\Dashboard\src\context\TimesheetContext.jsx` |
| Export Excel | `C:\Users\DaniloU7b\Hostinger\Dashboard\src\lib\timesheetExport.js` |
| Hook export | `C:\Users\DaniloU7b\Hostinger\Dashboard\src\hooks\useTimesheetExport.js` |

- Route: `/consultant/timesheet` → `src/pages/ConsultantTimesheetPage.jsx`
  - Card ore mensili (progress vs limite mese) + card progressione annuale (vs `ore_max`)
  - `selectedYear`/`selectedMonth` vivono qui e scendono come props a `TimesheetMonthForm`
- `src/components/TimesheetMonthForm.jsx` (658 righe, cuore del modulo):
  - Ore fisse: `ferie`, `malattia`, `isinnova_comunicazione`, `isinnova_amministrazione`, `isinnova_altro` (+nota)
  - Righe progetto: select dai `projects`, ore per mese
  - Attività libere persistenti con categorie: `tender_sub`, `proposta`, `consulenza`, `altro` (+nota)
  - `MONTHLY_LIMIT = Math.round(ore_max / 12)` (fallback 143) da `consultant_rates`
  - Export Excel personale: `src/lib/timesheetExport.js` → `exportConsultantTimesheet({consultantId, consultantName, year, projects})`
- Dati reali presenti: **241 righe** in `timesheets`, incluse ore reali gen–mag 2026 importate (`scripts/import-ore-reali-2026.mjs`)

### Lato admin (DA FARE — questo è il lavoro)

- `src/components/AdminSidebar.jsx:16` linka `/admin/timesheets` ma **la route NON esiste in App.jsx** → click finisce sul catch-all e rimbalza al login. Da decidere: aggiungere route o rimuovere voce menu.
- Esistono due pagine **orfane** (mai routate, probabilmente versioni vecchie da valutare/riciclare o cancellare):
  - `src/pages/TimesheetsPage.jsx` (288 righe, usa `AdminLayout`)
  - `src/pages/TimesheetDashboard.jsx` (102 righe)
- **CONFERMATO dall'utente (12/06/2026): la vista admin timesheet va costruita** — c'è sempre un amministratore che deve vedere i timesheet di tutti i consulenti (riepilogo mensile/annuale, confronto con limiti, export). Questo è il lavoro principale.
- Usare la scheda consulente pronta (percorsi sopra) come riferimento di stile e pattern dati.
- **Chiedere all'utente i dettagli del layout prima di costruire**: matrice consulente×mese? dettaglio per progetto? export Excel aggregato?

## Schema DB rilevante

```
timesheets:        id, consultant_id, project_id (nullable), hours, date (NOT NULL,
                   convenzione: primo del mese es. 2026-01-01 = ore di gennaio),
                   notes, activity_type, activity_note, created_at
consultants:       id, name, email, role ('admin'|'consultant'), tipo, status,
                   auth_user_id (FK a Supabase Auth), socio_dal, qualifica_socio
consultant_rates:  consultant_id, year, hourly_rate, costo_aziendale, ore_max
                   (+ legacy: annual_rate, monthly_hours_limit, annual_hours_limit)
                   hourly_rate = costo_aziendale / ore_max, upsert su (consultant_id, year)
projects:          id, name, ... (+ sold_travel, sold_other ecc. per budget spese)
allocations:       id, consultant_id, project_id, project_period_id (NOT NULL!),
                   allocated_hours
project_periods:   id, project_id, label, year, start/end_date, estimated_hours, budget...
```

`activity_type` valori visti: `'project'` (riga progetto), `'altro'`, `'ferie'`, `'malattia'`, `'isinnova_*'`, `'tender_sub'`, `'proposta'`, `'consulenza'`.

## Architettura dati (vincoli importanti)

- **`TimesheetContext.jsx`** (`src/context/`): al mount fa fetch COMPLETO di `projects` + `timesheets` + `allocations` e si iscrive a realtime (`postgres_changes` → rifa il fetch completo). Espone `getMonthlyHours`, `getAnnualHours`, `getConsultantLimits`, CRUD timesheets/projects/allocations. Tutto il calcolo ore è client-side su array completi.
- **NIENTE join Supabase** tra tabelle: le FK non sono registrate nella schema cache → query separate + map manuale in JS (convenzione consolidata nel progetto).
- RLS: `expenses` ha policy SELECT per tutti gli autenticati; `missions` RLS disabilitata. Verificare policy su `timesheets` se l'admin deve leggere le ore di tutti (il fetch attuale `select('*')` lato consulente già scarica tutto, quindi presumibilmente RLS aperta — confermare).
- `AuthContext`: NON mettere `await` di chiamate supabase dentro il callback `onAuthStateChange` (deadlock documentato supabase-js, già fixato il 12/06 — non regredire). Pattern: lavoro dentro `setTimeout(..., 0)`.
- Route admin in `App.jsx` sotto `ProtectedRoute allowedRoles={['admin']}`, tutte le pagine in `React.lazy` (mantenere per nuove pagine).
- Menu admin: `AdminSidebar.jsx` (route-based) + `AdminHorizontalMenu.jsx` (tab interne alla dashboard: overview, limits, rates, financials, spese, recovery, security).

## Sicurezza — pendenze note (non bloccanti per timesheet)

1. Edge Function `supabase/functions/admin-users/index.ts` scritta ma **non deployata** (serve `npx supabase login`). Finché manca: crea-account e reset-password da admin UI falliscono.
2. Chiavi Supabase da ruotare (la vecchia service_role è stata esposta nel bundle pubblico fino al 12/06).
3. Mai usare prefisso `VITE_` per segreti: finisce nel bundle pubblico.

## Convenzioni codice

- Italiano per UI e commenti; inglese per nomi variabili/funzioni
- Toast per feedback (`useToast` shadcn), `AlertDialog` per conferme distruttive
- Date visualizzate `dd/mm/yyyy`, salvate ISO `yyyy-mm-dd`
- Niente test automatici nel progetto; verifica = build + prova manuale (chiedere all'utente o usare `npx vite preview`)
