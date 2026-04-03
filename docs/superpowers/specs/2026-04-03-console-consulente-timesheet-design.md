# Console Consulente — Timesheet Design

**Data:** 2026-04-03
**Scope:** Scheda Timesheet del portale consulente (`/consultant/timesheet`)
**Fuori scope:** Dashboard consulente, Spese consulente (lavoro futuro)

---

## 1. Contesto

Ogni consulente ISInnova compila mensilmente un timesheet con le ore reali lavorate, distribuendole su progetti assegnati e attività interne/esterne. Oggi il processo avviene tramite file Excel. Questo design sostituisce l'Excel con un form web nella console consulente.

---

## 2. Modello dati

### Modifiche alla tabella `timesheets` (Supabase)

Colonne da aggiungere:

| Colonna | Tipo | Note |
|---|---|---|
| `activity_type` | TEXT | Enum — valori sotto |
| `activity_note` | TEXT | Nullable — testo libero per categorie libere |

Colonna da modificare:
- `project_id` → diventa **nullable** (è NULL per tutte le righe non-progetto)

La colonna `date` continua ad esistere ma contiene sempre il **primo del mese** (es. `2026-03-01` per marzo 2026).

### Valori di `activity_type`

| Valore | Categoria |
|---|---|
| `project` | Progetto assegnato (project_id obbligatorio) |
| `ferie` | Ferie (fisso) |
| `malattia` | Malattia (fisso) |
| `isinnova_comunicazione` | ISINNOVA — Comunicazione (fisso) |
| `isinnova_amministrazione` | ISINNOVA — Amministrazione (fisso) |
| `isinnova_altro` | ISINNOVA — Altro (con nota) |
| `tender_sub` | Tender-Sub (con nota, multiplo) |
| `proposta` | Proposta (con nota, multiplo) |
| `consulenza` | Consulenza (con nota, multiplo) |
| `altro` | Altro (con nota, multiplo) |

### Unicità

- Righe **fisse** (ferie, malattia, isinnova_*): una sola riga per `(consultant_id, date, activity_type)` → upsert al salvataggio
- Righe **progetto**: una sola riga per `(consultant_id, date, project_id)` → upsert
- Righe **libere** (tender_sub, proposta, consulenza, altro): più righe per stesso `activity_type` nello stesso mese → identificate da `id`

---

## 3. UX — Scheda Timesheet

### Navigazione mese

In cima alla pagina: selettore `< Marzo 2026 >` con frecce prev/next.
Default: mese corrente.
A destra del selettore: badge `XX / 160h` con le ore totali inserite nel mese. Il limite mensile (160h default) viene letto dalla costante `MONTHLY_LIMIT` del `TimesheetContext`.

### Sezioni del form

Il form è diviso in 4 sezioni visive (card o separator con titolo).

---

#### Sezione: Ferie & Malattia
Sempre visibile, 2 righe fisse.

| Attività | Ore |
|---|---|
| Ferie | `[input numerico]` |
| Malattia | `[input numerico]` |

---

#### Sezione: ISINNOVA
3 righe fisse.

| Attività | Ore | Nota |
|---|---|---|
| Comunicazione | `[input]` | — |
| Amministrazione | `[input]` | — |
| Altro | `[input]` | `[testo libero]` |

---

#### Sezione: Progetti
Righe generate dinamicamente dai progetti assegnati al consulente (`allocations` table, filtrate per `consultant_id`). Vengono mostrati **tutti i progetti allocati**, indipendentemente dall'anno, poiché la tabella `allocations` non ha un campo anno.

- Se il consulente non ha progetti assegnati: stato vuoto con messaggio "Nessun progetto assegnato per questo mese."
- Una riga per progetto con nome del progetto e input ore.

---

#### Sezione: Attività
Righe aggiungibili dal consulente. Ogni riga ha:
- **Dropdown categoria**: Tender-Sub / Proposta / Consulenza / Altro
- **Campo nota** (testo libero, obbligatorio)
- **Input ore**
- **Bottone × elimina riga**

Pulsante `+ Aggiungi attività` in fondo alla sezione aggiunge una nuova riga vuota.

---

### Salvataggio

**Auto-save con debounce di 1.5s** dopo ogni modifica. Nessun bottone "Salva".

Indicatore di stato in alto a destra:
- `Salvato ✓` (verde, testo piccolo)
- `Salvataggio...` (grigio, con spinner)
- `Errore nel salvataggio` (rosso, con retry automatico)

---

## 4. Logica di caricamento

Al cambio mese/anno:
1. Query su `timesheets` per `consultant_id = utente` e `date = primo del mese selezionato`
2. Popola le righe fisse (ferie, malattia, isinnova_*) con i valori trovati (0 se assenti)
3. Popola le righe progetto con i valori trovati (0 se assenti)
4. Carica le righe libere trovate per quel mese (tender_sub, proposta, consulenza, altro)

---

## 5. Logica di salvataggio

- **Righe fisse / progetto con ore = 0**: cancellare il record se esiste, non inserire
- **Righe fisse / progetto con ore > 0**: upsert su `(consultant_id, date, activity_type)` o `(consultant_id, date, project_id)`
- **Righe libere**: insert/update per id; delete se rimosse

---

## 6. Componenti da creare / modificare

| File | Azione |
|---|---|
| `src/pages/ConsultantTimesheetPage.jsx` | Riscrivere — pagina principale |
| `src/components/TimesheetMonthForm.jsx` | Nuovo — form mensile con sezioni |
| `src/components/TimesheetFreeRow.jsx` | Nuovo — singola riga attività libera |

---

## 7. Migrazioni DB richieste (Supabase)

```sql
-- Aggiungere colonne alla tabella timesheets
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS activity_type TEXT;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS activity_note TEXT;
ALTER TABLE timesheets ALTER COLUMN project_id DROP NOT NULL;

-- Popolare activity_type per i record esistenti
UPDATE timesheets SET activity_type = 'project' WHERE project_id IS NOT NULL AND activity_type IS NULL;
```
