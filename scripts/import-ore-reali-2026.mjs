// import-ore-reali-2026.mjs — v2
// Importa ore reali da Cartel1.csv con struttura corretta per TimesheetMonthForm
// Tutte le righe su date = primo del mese; tipi fissi aggregati; custom activities create
//
// Esegui con:  node scripts/import-ore-reali-2026.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Env ──────────────────────────────────────────────────────────────
try {
  const envRaw = readFileSync(resolve('C:/Users/DaniloU7b/hostinger/.env'), 'utf-8');
  for (const line of envRaw.split('\n')) {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  }
} catch {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY || !SUPABASE_URL) {
  console.error('Manca .env'); process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Costanti ─────────────────────────────────────────────────────────
const MESI = {
  Gennaio:1, Febbraio:2, Marzo:3, Aprile:4, Maggio:5, Giugno:6,
  Luglio:7, Agosto:8, Settembre:9, Ottobre:10, Novembre:11, Dicembre:12,
};

// Tipi fissi: una sola riga per mese, aggregata
const FIXED_TYPES = ['ferie','malattia','isinnova_amministrazione','isinnova_comunicazione','isinnova_altro'];

// Tipi custom: vanno in consultant_activities + timesheet per (type,note)
const CUSTOM_TYPES = ['proposta','tender_sub','consulenza','altro'];

const PROJECT_ALIASES = {
  'ai4soilhealth': 'all4soil',
  'seed micat':    'life22 mikat',
  'twinrd':        'twind',
  'sleeping beauty':'sleeping beauty',
  'hypef':         'hypef',
  'roads4all':     'roads4all',
};

const CONSULTANT_ALIASES = { 'GIUFFRE': 'giuffr' };

// ── Mapping tipo_attivita + nome_attivita → activity_type ─────────────
function mapActivityType(tipo, nome) {
  const t = tipo.toLowerCase().replace(/[";]/g,'').trim();
  const n = nome.toLowerCase().trim();

  if (t.includes('ferie') || t.includes('malattia')) {
    if (n === 'malattia') return 'malattia';
    return 'ferie';
  }
  if (t === 'progetto') return 'project';
  if (t === 'proposta he' || t.includes('proposte altri programmi')) return 'proposta';
  if (t === 'tender/sub' || t === 'tender fod') return 'tender_sub';
  if (t === 'consulenza') return 'consulenza';
  if (t === 'altro') return 'altro';

  // ISINNOVA o Amministrazione ISINNOVA
  if (n === 'amministrazione isinnova') return 'isinnova_amministrazione';
  if (n.includes('comunicazione')) return 'isinnova_comunicazione';

  return 'isinnova_altro';
}

// ── Parse CSV ─────────────────────────────────────────────────────────
const raw = readFileSync('C:/Users/DaniloU7b/Downloads/Cartel1.csv', 'utf-8');
const parsed = [];

for (const line of raw.split('\n')) {
  const clean = line.trim();
  if (!clean || clean.startsWith('persona')) continue;

  // Parse con gestione campi quotati (contengono ;)
  const fields = [];
  let buf = '', inQuote = false;
  for (const part of clean.split(';')) {
    if (!inQuote && part.startsWith('"')) { inQuote = true; buf = part.slice(1); }
    else if (inQuote && part.endsWith('"')) { buf += ';' + part.slice(0,-1); fields.push(buf); buf=''; inQuote=false; }
    else if (inQuote) { buf += ';' + part; }
    else { fields.push(part); }
  }
  if (fields.length < 6) continue;

  const persona   = fields[0].trim().toUpperCase();
  const tipo_raw  = fields[1].trim();
  const nome_raw  = fields[2].trim();
  const mese_str  = fields[3].trim();
  const anno_str  = fields[4].trim();
  const ore_str   = fields[5].trim().replace(',','.');

  const mese = MESI[mese_str];
  const anno = parseInt(anno_str, 10);
  const ore  = parseFloat(ore_str);

  if (!mese || isNaN(anno) || isNaN(ore)) { console.warn('SKIP parse:', clean); continue; }

  parsed.push({ persona, tipo_raw, nome_raw, mese, anno, ore });
}
console.log(`Righe CSV: ${parsed.length}`);

// ── Carica consultants + projects ──────────────────────────────────────
const { data: consultants } = await supabase.from('consultants').select('id,name');
const { data: projects }    = await supabase.from('projects').select('id,name');

function findConsultant(cognome) {
  const needle = (CONSULTANT_ALIASES[cognome] ?? cognome).toLowerCase();
  return consultants.find(c =>
    c.name.toLowerCase().split(/\s+/).some(w => w === needle) ||
    c.name.toLowerCase().includes(needle)
  );
}

function findProject(name) {
  const needle = name.toLowerCase().trim();
  for (const [alias, target] of Object.entries(PROJECT_ALIASES)) {
    if (needle.includes(alias) || alias.includes(needle)) {
      const found = projects.find(p => p.name.toLowerCase().includes(target));
      if (found) return found;
    }
  }
  return projects.find(p =>
    p.name.toLowerCase().includes(needle) || needle.includes(p.name.toLowerCase())
  );
}

// ── Aggrega righe per consultant + mese ───────────────────────────────
// Struttura aggregata per (consultantId, anno, mese):
//   fixed: { ferie:h, malattia:h, isinnova_amministrazione:h, isinnova_comunicazione:h, isinnova_altro:h }
//   projects: Map<project_id, hours>
//   customs: Map<`${type}||${note}`, { type, note, hours }>

const buckets = new Map(); // key: `${consultantId}|${anno}|${mese}`

let skipCnt = 0;

for (const row of parsed) {
  const consultant = findConsultant(row.persona);
  if (!consultant) {
    console.warn(`SKIP — consulente non trovato: ${row.persona}`);
    skipCnt++;
    continue;
  }

  const actType = mapActivityType(row.tipo_raw, row.nome_raw);
  const key = `${consultant.id}|${row.anno}|${row.mese}`;

  if (!buckets.has(key)) {
    buckets.set(key, {
      consultantId: consultant.id,
      anno: row.anno,
      mese: row.mese,
      fixed: { ferie:0, malattia:0, isinnova_amministrazione:0, isinnova_comunicazione:0, isinnova_altro:0 },
      projects: new Map(),
      customs: new Map(),
    });
  }
  const b = buckets.get(key);

  if (actType === 'project') {
    const proj = findProject(row.nome_raw);
    if (!proj) {
      console.warn(`SKIP — progetto non trovato: "${row.nome_raw}" (${row.persona})`);
      skipCnt++;
      continue;
    }
    b.projects.set(proj.id, (b.projects.get(proj.id) || 0) + row.ore);

  } else if (FIXED_TYPES.includes(actType)) {
    b.fixed[actType] += row.ore;

  } else if (CUSTOM_TYPES.includes(actType)) {
    const ck = `${actType}||${row.nome_raw}`;
    b.customs.set(ck, {
      type: actType,
      note: row.nome_raw,
      hours: (b.customs.get(ck)?.hours || 0) + row.ore,
    });
  }
}

console.log(`Bucket consulente+mese: ${buckets.size}, skip: ${skipCnt}`);

// ── Import ────────────────────────────────────────────────────────────
let okFixed=0, okProj=0, okCustom=0, errCnt=0;

for (const [, b] of buckets) {
  const date = `${b.anno}-${String(b.mese).padStart(2,'0')}-01`;

  // 1. Elimina tutte le righe esistenti per questo consulente+mese
  const startDate = date;
  const endDate   = `${b.anno}-${String(b.mese).padStart(2,'0')}-28`;
  const { error: delErr } = await supabase.from('timesheets')
    .delete()
    .eq('consultant_id', b.consultantId)
    .gte('date', startDate)
    .lte('date', endDate);
  if (delErr) console.warn(`WARN delete ${date}: ${delErr.message}`);

  // 2. Inserisci tipi fissi (solo se ore > 0)
  for (const type of FIXED_TYPES) {
    const hours = b.fixed[type];
    if (hours <= 0) continue;
    const { error } = await supabase.from('timesheets').insert({
      consultant_id: b.consultantId,
      date,
      activity_type: type,
      activity_note: null,
      hours,
      project_id: null,
    });
    if (error) { console.error(`ERR fixed ${date} ${type}: ${error.message}`); errCnt++; }
    else { okFixed++; }
  }

  // 3. Inserisci progetti
  for (const [project_id, hours] of b.projects) {
    const { error } = await supabase.from('timesheets').insert({
      consultant_id: b.consultantId,
      date,
      activity_type: 'project',
      activity_note: null,
      hours,
      project_id,
    });
    if (error) { console.error(`ERR project ${date} ${project_id}: ${error.message}`); errCnt++; }
    else { okProj++; }
  }

  // 4. Inserisci custom activities + crea consultant_activities se mancanti
  for (const [, custom] of b.customs) {
    // Upsert consultant_activity (usa insert ignorando duplicati)
    const { data: existing } = await supabase
      .from('consultant_activities')
      .select('id')
      .eq('consultant_id', b.consultantId)
      .eq('activity_type', custom.type)
      .eq('activity_note', custom.note)
      .maybeSingle();

    if (!existing) {
      await supabase.from('consultant_activities').insert({
        consultant_id: b.consultantId,
        activity_type: custom.type,
        activity_note: custom.note,
        status: 'active',
      });
    }

    // Inserisci timesheet
    const { error } = await supabase.from('timesheets').insert({
      consultant_id: b.consultantId,
      date,
      activity_type: custom.type,
      activity_note: custom.note,
      hours: custom.hours,
      project_id: null,
    });
    if (error) { console.error(`ERR custom ${date} ${custom.type} "${custom.note}": ${error.message}`); errCnt++; }
    else { okCustom++; }
  }

  const persona = consultants.find(c=>c.id===b.consultantId)?.name ?? b.consultantId;
  console.log(`OK  ${String(persona).padEnd(20)} ${date}  fixed:${Object.values(b.fixed).filter(h=>h>0).length}  proj:${b.projects.size}  custom:${b.customs.size}`);
}

console.log(`\nImport completato:`);
console.log(`  Fixed  : ${okFixed}`);
console.log(`  Progetti: ${okProj}`);
console.log(`  Custom  : ${okCustom}`);
console.log(`  Errori  : ${errCnt}`);
console.log(`  Skip    : ${skipCnt}`);
