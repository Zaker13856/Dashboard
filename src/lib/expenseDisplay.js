import * as XLSX from 'xlsx';

// Righe da mostrare nelle tabelle spese: le voci con mission_id vengono accorpate in una riga per missione
// (usata sia dalla pagina Spese dell'admin sia dalla scheda progetto del consulente)

const TYPE_LABELS = { travel: 'Travel', other_cost: 'Other Cost', subcontract: 'Subcontract', third_parties: '3rd Parties' };

// Excel delle spese di un progetto (stesso file per admin e colleghi)
export const exportExpensesXLS = (projectName, items) => {
  const header = ['Data', 'Luogo', 'Descrizione', 'Tipo', 'Consulente', 'Importo €', 'IVA €', 'Ammissibile €'];
  const rows = items.map(e => [
    e.date_label || (e.date ? new Date(e.date).toLocaleDateString('it-IT') : ''),
    e.place || '',
    e.description || '',
    TYPE_LABELS[e.type] || e.type,
    e.consultant?.name || e.consultant_name || '',
    parseFloat(e.amount) || 0,
    parseFloat(e.iva) || 0,
    parseFloat(e.eligible_amount) || 0,
  ]);
  // Riga totale
  const totAmt  = items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totIva  = items.reduce((s, e) => s + (parseFloat(e.iva) || 0), 0);
  const totElig = items
    .filter(e => e.type === 'travel' || e.type === 'other_cost')
    .reduce((s, e) => s + (parseFloat(e.eligible_amount) || 0), 0);
  rows.push(['TOTALE', '', '', '', '', totAmt, totIva, totElig]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  // Larghezze colonne
  ws['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 12 },
    { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Spese');
  XLSX.writeFile(wb, `Spese_${projectName.replace(/\s+/g, '_')}.xlsx`);
};

const fmtRange = (from, to) => {
  try {
    const f = new Date(from), t = new Date(to);
    if (from === to) return f.toLocaleDateString('it-IT');
    if (f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear()) {
      return `${f.getDate()}-${t.getDate()}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`;
    }
    return `${f.toLocaleDateString('it-IT')} - ${t.toLocaleDateString('it-IT')}`;
  } catch { return ''; }
};

export const groupByMission = (items, missionMap) => {
  const byMission = {};
  const displayItems = [];
  items.forEach(e => {
    if (e.mission_id && missionMap[e.mission_id]) {
      if (!byMission[e.mission_id]) {
        const mi = missionMap[e.mission_id];
        byMission[e.mission_id] = {
          id: 'mission-' + e.mission_id,
          _isMission: true,
          _voci: [],
          mission: mi,
          project_id: e.project_id,
          type: 'travel',
          date: mi.date_from,
          date_label: fmtRange(mi.date_from, mi.date_to),
          place: mi.place,
          days: Math.round((new Date(mi.date_to) - new Date(mi.date_from)) / 86400000) + 1,
          consultant_name: e.consultant_name,
          amount: 0, iva: 0, eligible_amount: 0,
        };
        displayItems.push(byMission[e.mission_id]);
      }
      const m = byMission[e.mission_id];
      m._voci.push(e);
      m.amount += parseFloat(e.amount) || 0;
      m.iva += parseFloat(e.iva) || 0;
      m.eligible_amount += parseFloat(e.eligible_amount) || 0;
    } else {
      displayItems.push(e);
    }
  });
  displayItems.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return displayItems;
};
