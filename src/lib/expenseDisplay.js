// Righe da mostrare nelle tabelle spese: le voci con mission_id vengono accorpate in una riga per missione
// (usata sia dalla pagina Spese dell'admin sia dalla scheda progetto del consulente)

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
