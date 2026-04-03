# Design: Export Excel Piano Progetto

**Data:** 2026-04-01
**Feature:** Tasto esporta Excel nella pagina progetto — esporta la tabella periodi con testata e riepilogo
**File coinvolti:**
- `src/lib/excelExporter.js` — nuova funzione `exportProjectPlan`
- `src/pages/ProjectManagement.jsx` — tasto nell'header card del progetto

---

## Obiettivo

Permettere all'utente di esportare in Excel il piano di allocazione del progetto (tabella periodi con ore, costi, overhead) insieme ai dati di testata e al riepilogo Venduto vs Pianificato. Il file viene inviato periodicamente.

---

## Struttura del file Excel

Un singolo file `.xlsx`, un singolo foglio chiamato `"Piano Progetto"`.

### Blocco 1 — Testata progetto (righe 1–N)

| Campo | Valore |
|---|---|
| Nome | `project.name` |
| Cliente | `project.client` |
| Tipo | `project.type` |
| Stato | `project.status` |
| Inizio | `project.start_date` |
| Fine | `project.end_date` |
| Durata | `project.duration_months` mesi |
| MU Venduti | `project.sold_person_months` |
| Valore Venduto | `project.total_value` € |

Formato: due colonne (Label | Valore). Riga vuota dopo il blocco.

### Blocco 2 — Venduto vs Pianificato

| Campo | Venduti | Pianificati | Delta |
|---|---|---|---|
| Mesi (MU) | `project.sold_person_months` | `totals.totMU` | `totMU - sold_person_months` |
| Valore (€) | `project.total_value` | `totals.costiPersonale` | `costiPersonale - total_value` |

Formato: quattro colonne (Campo | Venduti | Pianificati | Delta). Delta positivo = in eccesso. Riga vuota dopo il blocco.

### Blocco 3 — Tabella periodi

**Intestazioni:**
`Periodo | Durata (mesi) | [Nome Consulente 1] | [Nome Consulente 2] | ... | Tot MU | Costo Int. € | Costo Ext. € | Costi Pers. € | Travel € | Other € | Subcontr. € | 3rd Part. € | Tot Diretti € | Overhead € | Gran Totale €`

**Righe dati:** una per ogni periodo in `periods`, con valori calcolati da `calcRow(period.id, period.year)` + ore per consulente da `allocMap`.

**Riga TOTALE:** valori da `totals` e `totals.cTot[consultantId]` per le ore per consulente.

---

## Funzione da aggiungere

**File:** `src/lib/excelExporter.js`
**Nome:** `exportProjectPlan`
**Firma:**
```js
export const exportProjectPlan = ({ project, periods, consultants, allocMap, costsMap, ratesMap, totals, ovhRate })
```

Usa la libreria `xlsx` già importata nel file. Pattern identico alle funzioni esistenti (`aoa_to_sheet`, `book_append_sheet`, `writeFile`).

**Nome file generato:** `NomeProgetto_Piano_YYYY-MM-DD.xlsx`

---

## Tasto nell'UI

**File:** `src/pages/ProjectManagement.jsx`, componente `ProjectDetail`
**Posizione:** nell'header card, accanto al badge status e al pulsante Modifica
**Icona:** `FileSpreadsheet` (già importata da lucide-react)
**Comportamento:** click → chiama `exportProjectPlan(...)` con tutti i dati disponibili nel componente

La funzione `calcRow` è locale a `ProjectDetail` — i calcoli (costoInterno, overhead, ecc.) vengono ricalcolati dentro `exportProjectPlan` iterando su `periods` con la stessa logica.

---

## Scope

- Nessun nuovo file di componente — solo modifica a `excelExporter.js` e `ProjectManagement.jsx`
- Nessuna chiamata al DB — tutti i dati sono già in memoria nel componente
- Nessuna modifica ai context o agli hook
