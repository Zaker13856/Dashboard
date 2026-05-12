import * as XLSX from 'xlsx';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Esporta in XLSX il timesheet di un consulente per l'anno indicato.
 * Formato: Categoria | Nome Attività | Gennaio … Dicembre | TOTALE
 * Le celle mensili contengono giorni (= ore / 8). Celle vuote se 0.
 *
 * @param {Object}   p
 * @param {string}   p.consultantId    UUID del consulente
 * @param {string}   p.consultantName  Nome del consulente (usato nel filename)
 * @param {number}   p.year            Anno (es. 2026)
 * @param {Array}    [p.projects]      Lista progetti (id, name) per risolvere il nome
 * @returns {Promise<{ ok: boolean, filename?: string, message?: string }>}
 */
export async function exportConsultantTimesheet({ consultantId, consultantName, year, projects }) {
  const yearStart = `${year}-01-01`;
  const yearEnd   = `${year}-12-31`;

  // Carica timesheets, attività e (se non passati) progetti
  const tsP = supabase.from('timesheets').select('*').eq('consultant_id', consultantId).gte('date', yearStart).lte('date', yearEnd);
  const acP = supabase.from('consultant_activities').select('*').eq('consultant_id', consultantId);
  const prP = projects && projects.length
    ? Promise.resolve({ data: projects })
    : supabase.from('projects').select('id, name');

  const [{ data: ts, error: tsErr }, { data: allActs }, { data: prList }] = await Promise.all([tsP, acP, prP]);
  if (tsErr) return { ok: false, message: tsErr.message };

  const tsRows = ts || [];
  const projectsList = prList || [];

  const sumMonths = (matcher) => {
    const m = Array(12).fill(0);
    tsRows.filter(matcher).forEach(t => {
      const i = new Date(t.date).getMonth();
      m[i] += parseFloat(t.hours || 0);
    });
    return m;
  };

  const rows = [];

  // 1) Ferie / Malattia (sempre presenti)
  rows.push({ category: 'Ferie/Malattia', name: 'Ferie',    months: sumMonths(t => t.activity_type === 'ferie') });
  rows.push({ category: 'Ferie/Malattia', name: 'Malattia', months: sumMonths(t => t.activity_type === 'malattia') });

  // 2) ISINNOVA (3 righe sempre presenti)
  rows.push({ category: 'ISINNOVA', name: 'Comunicazione',   months: sumMonths(t => t.activity_type === 'isinnova_comunicazione') });
  rows.push({ category: 'ISINNOVA', name: 'Amministrazione', months: sumMonths(t => t.activity_type === 'isinnova_amministrazione') });
  rows.push({ category: 'ISINNOVA', name: 'Altro',           months: sumMonths(t => t.activity_type === 'isinnova_altro') });

  // 3) Progetti — solo quelli con almeno una riga nell'anno
  const projectIds = [...new Set(tsRows.filter(t => t.activity_type === 'project' && t.project_id).map(t => t.project_id))];
  const usedProjects = projectIds
    .map(id => projectsList.find(p => p.id === id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  usedProjects.forEach(p => {
    rows.push({ category: 'Progetto', name: p.name, months: sumMonths(t => t.activity_type === 'project' && t.project_id === p.id) });
  });

  // 4) Categorie custom da consultant_activities; placeholder se assenti
  const customCats = [
    { type: 'proposta',   label: 'Proposta' },
    { type: 'tender_sub', label: 'Tender-Sub' },
    { type: 'consulenza', label: 'Consulenza' },
    { type: 'altro',      label: 'Altro' },
  ];
  customCats.forEach(({ type, label }) => {
    const acts = (allActs || []).filter(a => a.activity_type === type);
    if (acts.length === 0) {
      rows.push({ category: label, name: 'Descrizione attività', months: Array(12).fill(0) });
    } else {
      acts
        .slice()
        .sort((a, b) => (a.activity_note || '').localeCompare(b.activity_note || ''))
        .forEach(a => {
          rows.push({
            category: label,
            name:     a.activity_note || 'Descrizione attività',
            months:   sumMonths(t => t.activity_type === type && t.activity_note === a.activity_note),
          });
        });
    }
  });

  // 5) Build XLSX
  const monthsLabels = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const data = rows.map(r => {
    const out = { 'Categoria': r.category, 'Nome Attività': r.name };
    let total = 0;
    r.months.forEach((h, i) => {
      out[monthsLabels[i]] = h > 0 ? +(h / 8).toFixed(2) : '';
      total += h;
    });
    out['TOTALE'] = total > 0 ? +(total / 8).toFixed(2) : '';
    return out;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 16 }, { wch: 38 }, ...Array(12).fill({ wch: 10 }), { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Timesheet ${year}`);
  const safeName = (consultantName || 'consulente').replace(/\s+/g, '_');
  const filename = `Timesheet_${safeName}_${year}.xlsx`;
  XLSX.writeFile(wb, filename);

  return { ok: true, filename };
}
