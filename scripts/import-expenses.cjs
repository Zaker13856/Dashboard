/**
 * import-expenses.js
 * Importa le spese da un file Excel (.xlsx) nella tabella `expenses` di Supabase.
 *
 * Uso:
 *   node scripts/import-expenses.js <file.xlsx> <nome-progetto>
 *
 * Esempi:
 *   node scripts/import-expenses.js scripts/dbcosti_BIOMAPE.xlsx "Biomape"
 *   node scripts/import-expenses.js scripts/dbcosti_ROAD4ALL.xlsx "Road4All"
 */

const XLSX    = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL      = 'https://yhkzkpntfkzcktxdceri.supabase.co';
const SUPABASE_SR_KEY   = 'sb_secret_i3E-N5nZRE00sU8oLDbQKA_DZ9BvH1S'; // service role
const supabase          = createClient(SUPABASE_URL, SUPABASE_SR_KEY);

const MU_HOURS = 143.33;

// ── Helpers ──────────────────────────────────────────────────────────────────

// Converte data Excel (serial number o stringa) in formato YYYY-MM-DD
const toDate = (val) => {
  if (!val && val !== 0) return null;
  // Serial date Excel
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (!date) return null;
    return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
  }
  if (typeof val === 'string') {
    const s = val.trim();
    // "10-12/12/2025" → prendo giorno fine / mese / anno
    const m1 = s.match(/(\d+)-(\d+)\/(\d+)\/(\d+)/);
    if (m1) return `${m1[4]}-${m1[3].padStart(2,'0')}-${m1[2].padStart(2,'0')}`;
    // "12/02/2026"
    const m2 = s.match(/^(\d+)\/(\d+)\/(\d+)$/);
    if (m2) return `${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`;
  }
  return null;
};

// Parse numerico robusto — arrotonda a 2 decimali
const n = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const f = parseFloat(v);
  return isNaN(f) ? null : Math.round(f * 100) / 100;
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const [,, filePath, projectName] = process.argv;

  if (!filePath || !projectName) {
    console.error('Uso: node scripts/import-expenses.js <file.xlsx> "<nome-progetto>"');
    process.exit(1);
  }

  // 1. Trova il project_id dal nome
  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', `%${projectName}%`);

  if (projErr || !projects?.length) {
    console.error(`❌ Progetto "${projectName}" non trovato. Progetti disponibili:`);
    const { data: all } = await supabase.from('projects').select('name');
    (all || []).forEach(p => console.log(' -', p.name));
    process.exit(1);
  }
  if (projects.length > 1) {
    console.warn(`⚠️  Trovati più progetti con "${projectName}":`);
    projects.forEach(p => console.log(` - ${p.id}: ${p.name}`));
    console.warn('Uso il primo. Rinomina per disambiguare.');
  }
  const project = projects[0];
  console.log(`✅ Progetto: ${project.name} (${project.id})`);

  // 2. Leggi il file Excel
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // 3. Salta header (riga 0) e righe vuote/totale
  const SKIP_KEYWORDS = ['totale', 'total', 'subtotal', ''];
  const dataRows = rows.slice(1).filter(row => {
    const desc = String(row[0]).toLowerCase().trim();
    if (SKIP_KEYWORDS.includes(desc)) return false;
    const hasAmount = (parseFloat(row[3]) || 0) + (parseFloat(row[4]) || 0) > 0;
    return hasAmount;
  });

  console.log(`📋 Righe da importare: ${dataRows.length}`);

  // 4. Costruisci i record da inserire
  // Colonne: 0=CostItem, 1=PlaceInvoice, 2=Date, 3=Travel, 4=Other,
  //          5=TotalCosts, 6=IVA, 7=EligibleCosts, 8=PaymentDate
  const records = [];

  for (const row of dataRows) {
    const description  = String(row[0]).trim();
    const invoice_ref  = String(row[1]).trim() || null;
    const date         = toDate(row[2]);
    const travel       = n(row[3]);
    const other        = n(row[4]);
    const iva          = n(row[6]);
    const eligible     = n(row[7]);
    const payment_date = toDate(row[8]);

    const totalAmount = (travel || 0) + (other || 0);

    if (travel && !other) {
      // Solo travel
      records.push({
        project_id:      project.id,
        type:            'travel',
        description,
        invoice_ref,
        date,
        amount:          travel,
        iva:             iva,
        eligible_amount: eligible,
        payment_date,
      });
    } else if (other && !travel) {
      // Solo other cost
      records.push({
        project_id:      project.id,
        type:            'other_cost',
        description,
        invoice_ref,
        date,
        amount:          other,
        iva:             iva,
        eligible_amount: eligible,
        payment_date,
      });
    } else if (travel && other) {
      // Entrambi → due record, IVA ripartita proporzionalmente
      const ratio = travel / totalAmount;
      records.push({
        project_id:      project.id,
        type:            'travel',
        description:     `${description} [travel]`,
        invoice_ref,
        date,
        amount:          travel,
        iva:             iva != null ? Math.round(iva * ratio * 100) / 100 : null,
        eligible_amount: eligible != null ? Math.round(eligible * ratio * 100) / 100 : null,
        payment_date,
      });
      records.push({
        project_id:      project.id,
        type:            'other_cost',
        description:     `${description} [other]`,
        invoice_ref,
        date,
        amount:          other,
        iva:             iva != null ? Math.round(iva * (1 - ratio) * 100) / 100 : null,
        eligible_amount: eligible != null ? Math.round(eligible * (1 - ratio) * 100) / 100 : null,
        payment_date,
      });
    }
  }

  // 5. Mostra anteprima
  console.log('\n📝 Anteprima record da inserire:');
  records.forEach((r, i) => {
    console.log(`  ${i+1}. [${r.type}] ${r.description} | ${r.date} | €${r.amount} | IVA:${r.iva ?? '—'} | Ammissibile:${r.eligible_amount ?? '—'}`);
  });

  // 6. Inserisci su Supabase
  console.log('\n⬆️  Inserimento in corso...');
  const { data: inserted, error } = await supabase
    .from('expenses')
    .insert(records)
    .select();

  if (error) {
    console.error('❌ Errore inserimento:', error.message);
    console.error(error);
    process.exit(1);
  }

  console.log(`\n✅ Importati ${inserted.length} record per il progetto "${project.name}"!`);

  // Riepilogo per tipo
  const travel = inserted.filter(r => r.type === 'travel').reduce((s, r) => s + parseFloat(r.amount), 0);
  const other  = inserted.filter(r => r.type === 'other_cost').reduce((s, r) => s + parseFloat(r.amount), 0);
  console.log(`   Travel:     € ${travel.toFixed(2)}`);
  console.log(`   Other Cost: € ${other.toFixed(2)}`);
  console.log(`   Totale:     € ${(travel + other).toFixed(2)}`);
}

main().catch(err => { console.error(err); process.exit(1); });
