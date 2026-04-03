# Design: Gestione Periodi Progetto

**Data:** 2026-04-02
**Feature:** Aggiunta e cancellazione periodi nella pagina progetto
**File coinvolto:** `src/pages/ProjectManagement.jsx`

---

## Obiettivo

Permettere all'utente di aggiungere e cancellare periodi direttamente dalla scheda progetto, senza toccare il DB manualmente. I periodi vengono spezzati automaticamente per anno con label `{year}_{N}`.

---

## Flusso utente

1. Crea progetto (form esistente)
2. Clicca sul progetto nella lista → apre `ProjectDetail`
3. Clicca **"+ Periodo"** nell'header → dialogo di inserimento
4. Inserisce inizio e fine (mese + anno)
5. Il sistema crea le righe in `project_periods` e la tabella si aggiorna

---

## Aggiunta periodo

### UI
- Tasto **"+ Periodo"** nell'header card del progetto, accanto a Excel e Modifica
- Icona: `CalendarPlus` (lucide-react)
- Click → `Dialog` con form

### Form campi
| Campo | Tipo | Note |
|---|---|---|
| Mese inizio | Select (1–12, nomi italiani) | es. "Giugno" |
| Anno inizio | Input number | es. 2026 |
| Mese fine | Select (1–12, nomi italiani) | es. "Dicembre" |
| Anno fine | Input number | es. 2027 |

### Validazione
- Fine deve essere ≥ Inizio
- Anno deve essere ragionevole (2020–2035)

### Logica di creazione (client-side)

Per ogni anno Y nel range [startYear, endYear]:
- `monthStart` = (Y === startYear) ? startMonth : 1
- `monthEnd` = (Y === endYear) ? endMonth : 12
- `duration_months` = monthEnd - monthStart + 1
- `period_number` = max period_number esistente per (project_id, year=Y) + 1
- `label` = `${Y}_${period_number}`

INSERT in `project_periods`:
```
{ project_id, year: Y, period_number, label, duration_months,
  travel_budget: 0, other_costs_budget: 0, subcontracting_budget: 0,
  third_parties_budget: 0, external_cost: 0 }
```

Dopo il salvataggio: chiudi dialog, richiama `load()` per aggiornare la tabella.

---

## Cancellazione periodo

### UI
- Icona **cestino** (`Trash2`) nella colonna sticky sinistra di ogni riga, accanto al label
- Click → `AlertDialog` di conferma: "Eliminare il periodo {label}? Verranno cancellate anche tutte le ore allocate."
- Conferma → DELETE da `project_periods` (cascade su `allocations` tramite FK Supabase)

### Nota DB
La FK `allocations.project_period_id → project_periods.id` deve avere `ON DELETE CASCADE`. Se non fosse così, il DELETE fallisce — in quel caso eliminare prima le allocazioni, poi il periodo.

---

## Scope

- Solo `ProjectManagement.jsx` — nessun nuovo file
- Nessuna modifica al form di creazione progetto
- Nessuna modifica ai context o agli hook
- Nessuna modifica alla tabella DB (solo INSERT/DELETE su `project_periods`)
