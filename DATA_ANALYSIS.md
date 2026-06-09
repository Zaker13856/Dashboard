
# Analisi Completa del Codebase - Tracciamento Dati

Documento aggiornato al 09/06/2026. L'architettura è completamente basata su **Supabase** (PostgreSQL remoto) — nessun localStorage strutturale.

## 1. Database Esterno — Supabase

**URL**: `https://yhkzkpntfkzcktxdceri.supabase.co`  
**Credenziali**: `.env` (non committato su GitHub — va copiato manualmente)

### Tabelle principali

| Tabella | Contenuto |
|---|---|
| `projects` | Anagrafica progetti, budget, periodi |
| `allocations` | Assegnazione consulenti ai progetti (`consultant_id`, `project_id`, ore allocate) |
| `timesheets` | Ore lavorate per consulente/progetto/mese |
| `expenses` | Tutte le spese (travel, other_cost, subcontract, third_parties, planned) |
| `consultants` | Anagrafica consulenti, ruoli, tariffe |
| `consultant_rates` | Tariffe orarie per anno |

### Realtime subscriptions attive
Tutti i context usano `supabase.channel(...).on('postgres_changes', ...)` — i dati si aggiornano automaticamente senza refresh.

## 2. Context API — Architettura

Tre provider in cascata in `App.jsx`:

```
AuthProvider → TimesheetProvider → ExpenseProvider → App
```

Ognuno:
1. Fetch da Supabase al mount (`useEffect`)
2. Mostra spinner finché loading = false (non blocca silenziosamente)
3. Espone dati e funzioni CRUD via Context

### AuthContext (`src/context/AuthContext.jsx`)
- Gestisce login/logout/sessione utente (`timesheet_user` in localStorage — unico uso di localStorage)
- Anagrafica consulenti con tariffe orarie
- Funzioni: `login`, `logout`, `addConsultant`, `updateConsultant`, `resetConsultantPassword`

### TimesheetContext (`src/context/TimesheetContext.jsx`)
- Progetti (`projects`), voci ore (`entries`), allocazioni (`allocations`)
- Funzioni: `addProject`, `updateProject`, `deleteProject`, `addEntry`, `updateEntry`, `deleteEntry`, `assignConsultant`, `removeAssignment`
- **IMPORTANTE**: `assignedConsultants` NON è una colonna di `projects` — le assegnazioni stanno nella tabella `allocations` (`consultant_id` + `project_id`)

### ExpenseContext (`src/context/ExpenseContext.jsx`)
- Tutte le spese in `allExpenses`, suddivise per tipo:
  - `expenses` = travel + third_parties
  - `subcontracts` = type 'subcontract'
  - `otherCosts` = type 'other_cost'
- Funzioni: `addExpense`, `updateExpense`, `deleteExpense`, `addSubcontract`, `addOtherCost`

## 3. Entità e Flusso Dati

| Entità | Creata in | Tabella Supabase | Note |
|---|---|---|---|
| **Consulenti** | `AuthContext` (`addConsultant`) | `consultants` | |
| **Progetti** | `TimesheetContext` (`addProject`) | `projects` | |
| **Allocazioni** | `TimesheetContext` (`assignConsultant`) | `allocations` | Collega consulenti ↔ progetti |
| **Timesheet** | `TimesheetContext` (`addEntry`) | `timesheets` | Una riga per mese/consulente/tipo |
| **Spese** | `ExpenseContext` (`addExpense`) | `expenses` | Tipo determina categoria |

## 4. Routing

`BrowserRouter` con route protette per ruolo:
- `/login` — pubblica
- `/admin/*` — solo ruolo `admin`
- `/consultant/*` — solo ruolo `consultant`

**SPA routing su Hostinger**: `.htaccess` con `RewriteRule` + `ErrorDocument 404 /index.html`.

## 5. Deploy

Script FTP: `scripts/deploy-ftp.cjs`  
Comando: `node scripts/deploy-ftp.cjs` (eseguire da `Dashboard/`)  
Target: `ftp.isinnova.cloud` → `/public_html`

Sequenza completa:
```bash
npx vite build
node scripts/deploy-ftp.cjs
```
