
# Analisi Completa del Codebase - Tracciamento Dati

Questo documento contiene l'analisi dettagliata richiesta sui meccanismi di storage, database esterni, gestione del contesto (Context API) e tracciamento dei dati nell'applicazione.

## 1. Ricerca Storage
L'applicazione fa un uso intensivo e metodico di **`localStorage`** per garantire la persistenza dei dati sul client. Non vi è traccia di `sessionStorage`, `IndexedDB` o `Cookies` per il salvataggio dei dati strutturali.

### Chiavi `localStorage` utilizzate:
**AuthContext.jsx**:
- `timesheet_consultants`: Salva l'anagrafica, le tariffe orarie e i ruoli dei consulenti.
- `timesheet_user`: Mantiene la sessione attiva dell'utente loggato.
- `timesheet_rates_version`: Traccia la versione delle modifiche alle tariffe per forzare i refresh (cache invalidation locale).

**TimesheetContext.jsx**:
- `timesheet_projects`: Salva tutti i dati dei progetti, inclusi i budget e le allocazioni dei consulenti (`assignedConsultants`).
- `timesheet_entries`: Salva tutte le ore lavorate/inserite nei timesheet.
- `timesheet_limits`: Salva i limiti di ore (mensili/annuali) personalizzati per singolo consulente.
- `timesheet_history`: Salva lo storico delle modifiche (sebbene parzialmente implementato).
- `timesheet_years`: Salva l'elenco degli anni gestiti dal sistema (es. 2022-2027).
- `timesheet_projects_backup_diamond`: Chiave specifica per il recovery dati di un particolare progetto.

**ExpenseContext.jsx**:
- `timesheet_expenses`: Spese effettive caricate dai consulenti.
- `subcontracts`: Costi di subappalto esterni.
- `otherCosts`: Costi miscellanei di progetto.
- `plannedExpenses`: Voci di budget preventivate.

## 2. Ricerca Database Esterno
Attualmente **NON è presente alcun database esterno collegato**.
- **Supabase**: Assente. Nessuna inizializzazione (`createClient`), nessuna importazione di `@supabase/supabase-js` nel `package.json`.
- **Firebase/Pocketbase**: Assenti.
- **API REST**: Non vi è alcuna chiamata `fetch` o `axios` verso server/backend remoti per la sincronizzazione dei dati. Il progetto è un ambiente frontend isolato e auto-consistente ("Local First").

## 3. Analisi Context (Gestione di Stato e Sincronizzazione)
L'architettura dei dati si basa su React Context API in combinazione con `useEffect` per sincronizzare lo stato in memoria (RAM) con `localStorage` (Disco rigido del browser).

- **Inizializzazione (Lettura)**: In ogni Context (`AuthContext`, `TimesheetContext`, `ExpenseContext`), al primo caricamento (mount) viene eseguito un `useEffect` che legge i dati dal `localStorage`. Se le chiavi sono vuote, carica dei dati costanti di default (es. `INITIAL_CONSULTANTS`, `INITIAL_PROJECTS`).
- **Memoria Volatile**: I dati vengono salvati in variabili di stato React (`useState`), rendendoli estremamente veloci da interrogare tramite l'interfaccia.
- **Sincronizzazione (Scrittura)**: Ogni volta che la variabile di stato (`projects`, `consultants`, `expenses`) viene modificata (es. tramite l'aggiunta di un progetto), un `useEffect` dipendente da quella variabile entra in azione e fa una sovrascrittura (`localStorage.setItem`) con la versione stringificata (`JSON.stringify()`) del nuovo stato.

## 4. Tracciamento Dati (Entità)

| Entità | Dove viene Creata | Persistenza | Caricamento al Refresh |
|--------|-------------------|-------------|------------------------|
| **CONSULTANTS** | `AuthContext.jsx` (funzione `addConsultant`) | `localStorage` (`timesheet_consultants`) | Un `useEffect` in `AuthContext` legge la chiave, unisce eventuali dati di fallback (`INITIAL_CONSULTANTS`) e li salva nello stato `consultants`. |
| **PROJECTS** | `TimesheetContext.jsx` (funzione `addProject`) | `localStorage` (`timesheet_projects`) | Letto nel mount di `TimesheetContext`. Se assente, carica `INITIAL_PROJECTS`. |
| **TIMESHEETS** | `TimesheetContext.jsx` (funzione `addEntry`) | `localStorage` (`timesheet_entries`) | Letto nel mount di `TimesheetContext`. Persistente a livello di browser. |
| **EXPENSES** | `ExpenseContext.jsx` (funzione `addExpense`) | `localStorage` (`timesheet_expenses`, ecc.) | Letto nel mount di `ExpenseContext` da varie chiavi suddivise per tipologia di spesa. |
| **ALLOCATIONS** | `TimesheetContext.jsx` (funzione `assignConsultant`) | Dentro `localStorage` (`timesheet_projects`) | Le allocazioni non sono un'entità indipendente, ma un array innestato (`assignedConsultants`) dentro gli oggetti progetto. |
