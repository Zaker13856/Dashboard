import { createClient } from '@supabase/supabase-js';

const svc = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: prj } = await svc.from('projects').select('id,name').ilike('name', '%biomethaverse%');
const PROJ = prj[0].id;
const { data: cons } = await svc.from('consultants').select('id,name');
const f = n => cons.find(c => c.name.toLowerCase().includes(n))?.id;
const PROIETTI = f('proietti'), GALVINI = f('galvini'), ZAINI = f('zaini');
console.log('proj ok | proietti:', !!PROIETTI, '| galvini:', !!GALVINI, '| zaini:', !!ZAINI);

// 1. pulizia completa (tutte le voci senza missione: travel + other + sub)
const { data: del } = await svc.from('expenses').delete()
  .eq('project_id', PROJ).is('mission_id', null).select('id');
console.log('eliminate:', del.length);

// 2. missioni — Uppsala Proietti = 1 missione 2 voci
const M = [
  { c: GALVINI,  place: 'Parigi',       from: '2022-11-21', to: '2022-11-24', voci: [['[Other] Totale viaggio', 134.59, 7.64]] },
  { c: PROIETTI, place: 'Parigi',       from: '2023-11-22', to: '2023-11-24', voci: [['[Other] Totale viaggio', 771.18, 39.56]] },
  { c: PROIETTI, place: 'Uppsala',      from: '2023-06-13', to: '2023-06-15', voci: [['[Transportation] Volo a/r', 298.95, 0], ['[Other] Totale viaggio', 1214.80, 46.52]] },
  { c: GALVINI,  place: 'Uppsala',      from: '2023-06-13', to: '2023-06-15', voci: [['[Other] Volo a/r + albergo x1 + spese locali', 911.74, 51.18]] },
  { c: PROIETTI, place: 'Brussels',     from: '2023-10-01', to: '2023-10-02', voci: [['[Other] Totale viaggio', 777.55, 10.54]] },
  { c: PROIETTI, place: 'Bologna',      from: '2023-10-12', to: '2023-10-12', voci: [['[Other] Totale viaggio', 98.00, 1.29]] },
  { c: PROIETTI, place: 'Brussels',     from: '2023-10-23', to: '2023-10-25', voci: [['[Other] Totale viaggio', 1037.61, 21.04]] },
  { c: PROIETTI, place: 'Rimini',       from: '2023-11-08', to: '2023-11-09', voci: [['[Other] Totale viaggio', 375.20, 22.86]] },
  { c: PROIETTI, place: 'Milano',       from: '2023-11-29', to: '2023-12-01', voci: [['[Other] Totale viaggio', 522.40, 35.54]] },
  { c: GALVINI,  place: 'Milano',       from: '2023-11-29', to: '2023-12-01', voci: [['[Other] Totale viaggio', 26.50, 3.61]] },
  { c: PROIETTI, place: 'Thessaloniki', from: '2024-06-19', to: '2024-06-22', voci: [['[Other] Totale viaggio', 806.24, 64.01]] },
  { c: PROIETTI, place: 'Brussels',     from: '2024-10-14', to: '2024-10-15', voci: [['[Other] Totale viaggio', 815.86, 13.80]] },
  { c: PROIETTI, place: 'Brussels',     from: '2024-10-22', to: '2024-10-24', voci: [['[Other] Totale viaggio', 890.92, 16.75]] },
  { c: ZAINI,    place: 'Barcellona',   from: '2024-11-27', to: '2024-11-29', with_: 'Stefano Proietti', voci: [['[Other] Totale viaggio', 790.20, 57.34]] },
  { c: PROIETTI, place: 'Barcellona',   from: '2024-11-27', to: '2024-11-29', with_: 'Danilo Zaini', voci: [['[Other] Totale viaggio', 344.30, 1.00]] },
  { c: PROIETTI, place: 'Rimini',       from: '2025-03-06', to: '2025-03-06', voci: [['[Other] Totale viaggio', 178.50, 1.72]] },
  { c: PROIETTI, place: 'Brussels',     from: '2025-05-13', to: '2025-05-14', voci: [['[Other] Totale viaggio', 567.41, 6.45]] },
  { c: PROIETTI, place: 'Valencia',     from: '2025-09-09', to: '2025-09-11', voci: [['[Other] Totale viaggio', 609.93, 13.75]] },
  { c: PROIETTI, place: 'Brussels',     from: '2025-10-13', to: '2025-10-15', voci: [['[Other] Totale viaggio', 716.60, 21.62]] },
  { c: PROIETTI, place: 'Cartagena',    from: '2025-11-04', to: '2025-11-07', voci: [['[Other] Totale viaggio', 831.51, 48.94]] },
  { c: PROIETTI, place: 'Milano',       from: '2025-11-24', to: '2025-11-26', voci: [['[Other] Totale viaggio', 411.20, 25.28]] },
  { c: PROIETTI, place: 'Brussels',     from: '2026-02-16', to: '2026-02-17', voci: [['[Other] Totale viaggio', 672.35, 7.21]] },
];
for (const m of M) {
  const { data: mis, error: e1 } = await svc.from('missions').insert({
    consultant_id: m.c, project_id: PROJ, place: m.place, date_from: m.from, date_to: m.to, travelling_with: m.with_ || null,
  }).select().single();
  if (e1) { console.error('mission err:', m.place, e1.message); process.exit(1); }
  for (const [desc, amt, iva] of m.voci) {
    const elig = Math.round((amt - iva) * 100) / 100;
    const { error: e2 } = await svc.from('expenses').insert({
      project_id: PROJ, consultant_id: m.c, mission_id: mis.id, place: m.place,
      date: m.from, payment_date: m.from, payment_method: 'carta_aziendale',
      type: 'travel', amount: amt, iva: iva || null, eligible_amount: elig, description: desc,
    });
    if (e2) { console.error('voce err:', e2.message); process.exit(1); }
  }
}
console.log('missioni:', M.length, 'ok');

// 3. other costs (incl. due diligence spostata da travel)
const O = [
  ['2022-12-22', 'due diligence - bonifico Ucraina (roma BPS)', null, 925.15, 0],
  ['2023-03-20', 'iubenda - licenza sito privacy & cookie', 'fatt. 2023-63565', 27, 4.87],
  ['2023-05-11', 'mailchimp', null, 23.45, 0],
  ['2023-06-11', 'mailchimp', null, 23.45, 0],
  ['2023-07-11', 'mailchimp', null, 23.45, 0],
  ['2023-08-11', 'mailchimp', null, 23.45, 0],
  ['2023-09-11', 'mailchimp', null, 23.45, 0],
  ['2023-12-31', 'Carnicella tipografia - poster', 'fatt. 764/2023', 24.40, 4.40],
  ['2023-10-24', 'Proietti - EBA Conference Brux (quota)', null, 877.25, 152.25],
  ['2023-12-31', 'sito', null, 1000, 0],
  ['2024-03-31', 'Mailchimp da 05/2023 a 03/2024', null, 321.55, 0],
  ['2023-12-31', 'aruba sito 2023', null, 15.90, 0],
  ['2024-12-31', 'aruba sito 2024', null, 47.58, 8.58],
  ['2024-10-23', 'European Biogas Conference - member fee (Brussels 23-24/10/2024)', null, 1203.95, 208.95],
  ['2024-12-31', 'aruba - sito web', 'fatt. 1000243006656362/2024', 54.89, 9.90],
  ['2025-01-11', 'Software Newsletter 11/05/2023-11/01/2025', null, 535.73, 0],
  ['2025-03-16', 'iubenda - licenza sito privacy & cookie', 'fatt. 2025-76675', 27, 4.87],
  ['2025-06-20', "Alemar web app diritti d'autore", 'fatt. 586/2025', 3538, 638],
  ['2025-07-14', "Landing page web app INSPIRE (di cui 50 euro CONFOR come ritenuta d'acconto)", null, 250, 0],
  ['2025-09-30', 'aruba sito web', 'fatt. 1000253007658931/2025', 54.89, 9.90],
  ['2025-10-14', 'EBA Conference', 'EBA-CONF-2025-ON-0076', 1391.50, 241.50],
  ['2026-12-31', 'iubenda - licenza sito privacy & cookie', 'fatt. 87481/2026', 27, 4.87],
];
for (const [date, desc, ref, amt, iva] of O) {
  const elig = Math.round((amt - iva) * 100) / 100;
  const { error } = await svc.from('expenses').insert({
    project_id: PROJ, type: 'other_cost', date, description: desc, invoice_ref: ref,
    amount: amt, iva: iva || null, eligible_amount: elig,
  });
  if (error) { console.error('other err:', desc, error.message); process.exit(1); }
}
console.log('other:', O.length, 'ok');

// 4. subcontract Alemar (fatt. 522 annullata con NC 585 — esclusa)
const S = [
  ['2025-05-12', 'Alemar web app - acconto', 'fatt. 494/2025', 2635.20, 475.20, 2160],
  ['2025-06-04', 'Alemar web app - saldo', 'fatt. 521/2025', 6148.80, 1108.80, 5040],
  ['2025-06-25', 'Alemar web app - assistenza e manutenzione', 'fatt. 587/2025', 854, 154, 700],
];
for (const [date, desc, ref, amt, iva, elig] of S) {
  const { error } = await svc.from('expenses').insert({
    project_id: PROJ, type: 'subcontract', date, description: desc, invoice_ref: ref,
    amount: amt, iva, eligible_amount: elig,
  });
  if (error) { console.error('sub err:', desc, error.message); process.exit(1); }
}
console.log('subcontract: 3 ok');

const { data: chk } = await svc.from('expenses').select('type,amount,iva,eligible_amount').eq('project_id', PROJ);
const s = (fld, t) => chk.filter(e => !t || e.type === t).reduce((a, e) => a + (parseFloat(e[fld]) || 0), 0);
console.log('TOTALI -> travel:', s('amount', 'travel').toFixed(2), '| other:', s('amount', 'other_cost').toFixed(2), '| sub:', s('amount', 'subcontract').toFixed(2));
console.log('attesi: travel 13803.54 (14728.69 - 925.15 due diligence) | other 10439.04 (9513.89 + 925.15) | sub 9638.00');
