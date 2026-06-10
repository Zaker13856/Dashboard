import { createClient } from '@supabase/supabase-js';

const svc = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const { data: prj } = await svc.from('projects').select('id,name').ilike('name', '%hypef%');
const PROJ = prj[0].id;
const { data: cons } = await svc.from('consultants').select('id,name');
const f = n => cons.find(c => c.name.toLowerCase().includes(n))?.id;
const MALCOTTI = f('malcotti'), GALVINI = f('galvini');
console.log('proj:', prj[0].name, '| malcotti:', !!MALCOTTI, '| galvini:', !!GALVINI);

// 1. pulizia
const { data: del } = await svc.from('expenses').delete()
  .eq('project_id', PROJ).is('mission_id', null).select('id');
console.log('eliminate:', del.length);

// 2. missioni — tutte carta aziendale
const M = [
  { c: MALCOTTI, place: 'Madrid - KOM',    from: '2024-02-05', to: '2024-02-06', voci: [['[Other] Totale viaggio', 269.51, 0]] },
  { c: GALVINI,  place: 'Madrid - KOM',    from: '2024-02-05', to: '2024-02-06', voci: [['[Other] Totale viaggio', 633.67, 28.36]] },
  { c: GALVINI,  place: 'Roma - 1st GA',   from: '2024-07-08', to: '2024-07-09', voci: [['[Other] Totale viaggio', 377.89, 0.52]] },
  { c: MALCOTTI, place: 'Roma - 1st GA',   from: '2024-07-08', to: '2024-07-09', voci: [['[Other] Totale viaggio', 239.80, 0]] },
  { c: GALVINI,  place: 'Paris - 2nd GA',  from: '2025-01-29', to: '2025-01-31', with_: 'Valentina Malcotti', voci: [['[Other] Totale viaggio', 781.29, 3.95]] },
  { c: MALCOTTI, place: 'Paris - 2nd GA',  from: '2025-01-29', to: '2025-01-31', voci: [['[Other] Totale viaggio', 598.75, 15.45]] },
  { c: GALVINI,  place: 'Madrid - GA',     from: '2025-06-25', to: '2025-06-28', with_: 'Valentina Malcotti', voci: [['[Other] Totale viaggio', 769.50, 13.15]] },
  { c: MALCOTTI, place: 'Madrid - GA',     from: '2025-06-25', to: '2025-06-28', voci: [['[Other] Totale viaggio', 692.61, 0]] },
  { c: MALCOTTI, place: 'Bologna',         from: '2026-02-11', to: '2026-02-12', voci: [['[Other] Totale viaggio', 302.50, 12.22]] },
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

// 3. other costs
const O = [
  ['2024-02-28', 'acquisto LOGO', null, 97.99, 0],
  ['2024-06-06', 'sito internet - Andrea Borzi', null, 1000, 0],
  ['2024-12-31', 'IUBENDA licenza cookie', null, 99, 17.85],
  ['2024-07-08', 'cena partner - 1st GA Roma', null, 756, 68.73],
  ['2024-07-08', 'catering - 1st GA Roma', null, 341, 31],
  ['2024-08-02', 'Prowly', 'fatt. 78/2024', 483.10, 0],
  ['2024-12-31', 'caseproof - tool sito web', 'fatt. 282314/2024', 166.06, 0],
  ['2024-12-23', 'Installazione e set-up plugin MemberPress - Andrea Borzi', null, 500, 0],
  ['2025-03-11', 'aruba hosting wordpress', 'fatt. 1000253001866024', 44.99, 0],
  ['2026-02-11', 'Consortium Dinner - Meeting Bologna', 'Fatt. 121/2026', 665, 60.45],
  ['2026-02-11', 'Catering 2gg - Meeting Bologna', 'Fatt. 174/2026', 610.50, 55.50],
  ['2026-03-06', 'aruba hosting wordpress', 'fatt. 0337/2026', 60.99, 11],
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

// 4. subcontract — external review
const S = [
  ['2025-06-30', 'Studio Fieschi - external review M16', 'fatt. 148/2025', 3660, 660, 3000],
  ['2025-06-20', 'Bureau Veritas - external review M16', 'Fattura 25355181', 2250, 0, 2250],
  ['2025-11-01', 'H2Consulting (Ortiz Cebolla) - external review M16', 'fatt. 009/2025', 2250, 0, 2250],
  ['2025-11-21', 'Studio Fieschi - external review M21', 'Fattura 292/2025', 3660, 660, 3000],
  ['2025-11-21', 'Bureau Veritas - external review M21', 'Fattura 25623045/2025', 2250, 0, 2250],
  ['2025-12-11', 'H2Consulting (Ortiz Cebolla) - external review M21', 'Fattura 012/2025', 2250, 0, 2250],
];
for (const [date, desc, ref, amt, iva, elig] of S) {
  const { error } = await svc.from('expenses').insert({
    project_id: PROJ, type: 'subcontract', date, description: desc, invoice_ref: ref,
    amount: amt, iva: iva || null, eligible_amount: elig,
  });
  if (error) { console.error('sub err:', desc, error.message); process.exit(1); }
}
console.log('subcontract: 6 ok');

const { data: chk } = await svc.from('expenses').select('type,amount,iva,eligible_amount').eq('project_id', PROJ);
const s = (fld, t) => chk.filter(e => !t || e.type === t).reduce((a, e) => a + (parseFloat(e[fld]) || 0), 0);
console.log('TOTALI -> travel:', s('amount', 'travel').toFixed(2), '(atteso 4665.52) | other:', s('amount', 'other_cost').toFixed(2), '(atteso 4824.63) | sub:', s('amount', 'subcontract').toFixed(2), '(atteso 16320.00)');
