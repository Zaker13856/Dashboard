import { createClient } from '@supabase/supabase-js';

const svc = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const { data: prj } = await svc.from('projects').select('id,name').ilike('name', '%micat%');
const PROJ = prj[0].id;
const { data: cons } = await svc.from('consultants').select('id,name');
const f = n => cons.find(c => c.name.toLowerCase().includes(n))?.id;
const GALVINI = f('galvini'), FABERI = f('faberi');
console.log('proj:', prj[0].name, '| galvini:', !!GALVINI, '| faberi:', !!FABERI);

const { data: del } = await svc.from('expenses').delete()
  .eq('project_id', PROJ).is('mission_id', null).select('id');
console.log('eliminate:', del.length);

const M = [
  { c: GALVINI, place: 'Bruxelles', from: '2023-12-02', to: '2023-12-06', voci: [['[Other] Totale viaggio', 95.24, 2.87]] },
  { c: FABERI,  place: 'Bruxelles', from: '2023-12-05', to: '2023-12-06', voci: [['[Other] Totale viaggio', 803.16, 23.84]] },
  { c: GALVINI, place: 'Praga',     from: '2024-11-10', to: '2024-11-11', voci: [['[Other] Totale viaggio', 628.55, 8.41]] },
  { c: GALVINI, place: 'Berlino',   from: '2024-11-21', to: '2024-11-24', voci: [['[Other] Totale viaggio', 428.17, 2.21]] },
  { c: GALVINI, place: 'Bruxelles', from: '2024-11-19', to: '2024-11-20', voci: [['[Other] Totale viaggio', 402.69, 5.32]] },
  { c: GALVINI, place: 'Roma',      from: '2024-11-24', to: '2024-11-25', voci: [['[Other] Totale viaggio', 292.22, 4.01]] },
  { c: GALVINI, place: 'Milano',    from: '2024-11-26', to: '2024-11-27', voci: [['[Other] Totale viaggio', 136.90, 10.03]] },
  { c: FABERI,  place: 'Milano',    from: '2024-11-26', to: '2024-11-27', voci: [['[Other] Viaggio mancato per malattia', 144, 0]] },
];
for (const m of M) {
  const { data: mis, error: e1 } = await svc.from('missions').insert({
    consultant_id: m.c, project_id: PROJ, place: m.place, date_from: m.from, date_to: m.to,
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

const { data: chk } = await svc.from('expenses').select('type,amount,iva,eligible_amount').eq('project_id', PROJ);
const s = fld => chk.reduce((a, e) => a + (parseFloat(e[fld]) || 0), 0);
console.log('TOTALI -> travel:', s('amount').toFixed(2), '(atteso 2930.93) | iva:', s('iva').toFixed(2), '(atteso 56.69) | elig:', s('eligible_amount').toFixed(2), '(atteso 2874.24)');
