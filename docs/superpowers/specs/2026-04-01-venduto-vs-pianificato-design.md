# Design: Card "Venduto vs Pianificato"

**Data:** 2026-04-01
**Feature:** Indicatore di confronto Venduto vs Pianificato nella pagina progetto
**File coinvolto:** `src/pages/ProjectManagement.jsx`

---

## Obiettivo

Aggiungere una card visiva tra l'header del progetto e la tabella dei periodi che mostri in tempo reale il confronto tra i valori venduti al cliente e quelli pianificati tramite le allocazioni dei consulenti.

Questo permette all'utente di regolarsi durante l'inserimento delle ore, capendo immediatamente se è sopra o sotto il venduto — sia in termini di mesi persona (MU) che di valore economico (€).

---

## Dati

Tutti i dati sono già disponibili nel componente `ProjectDetail` senza nessuna nuova chiamata al DB.

| Metrica | Sorgente | Descrizione |
|---|---|---|
| MU Venduti | `project.sold_person_months` | Mesi persona venduti al cliente |
| MU Pianificati | `totals.totMU` | Totale ore allocate / 143,33 |
| Valore Venduto (€) | `project.total_value` | Valore contrattuale |
| Valore Pianificato (€) | `totals.costiPersonale` | `costoInterno + costoEsterno` (no overhead, no travel, no subcontracting) |

---

## Componente

**Nome:** `PlanningGauge` (componente locale in `ProjectManagement.jsx`, non un file separato)

**Props:**
```js
PlanningGauge({ soldMU, plannedMU, soldValue, plannedValue, formatFn })
```

**Layout:** due box affiancati (grid 2 colonne), wrappati in una `Card`.

### Box struttura (identica per MU e €):
- Label "MESI (MU)" o "VALORE €"
- Riga: `Venduti: X`
- Riga: `Pianif.: Y`
- Barra sottile: riempita a `min(pianificato/venduto * 100, 100)%` — rossa se >100%, blu se ≤100%
- Delta in grassetto: `Δ +N` o `Δ -N` con testo descrittivo ("in eccesso" / "disponibile")

### Logica colori:
- `pianificato > venduto` → delta in **rosso** (`text-red-600`), barra `bg-red-500`
- `pianificato ≤ venduto` → delta in **verde** (`text-green-600`), barra `bg-blue-500`
- Se `venduto = 0` o `null` → mostra "—" senza delta

---

## Posizione nella pagina

```
<Header Card>        ← già esistente (Tipo, Inizio, Fine, Durata, MU Venduti, Valore Venduto)
<PlanningGauge>      ← NUOVO — inserito qui
<Tabella periodi>    ← già esistente
```

---

## Feature futura (fuori scope ora)

Export Excel della tabella periodi con tutti i valori (ore consulenti, costi, overhead, gran totale). Da implementare come tasto separato nella pagina.

---

## Scope

- Solo `ProjectManagement.jsx` — nessun nuovo file, nessuna modifica al DB, nessuna modifica ai contesti
- Nessuna modifica alla logica di calcolo esistente — `totals` è già corretto
- Il componente `PlanningGauge` è locale e non riusabile (un solo utilizzo)
