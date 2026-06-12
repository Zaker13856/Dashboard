// Backup dati Supabase via REST (PostgREST + GoTrue admin).
// Legge SUPABASE_SERVICE_ROLE_KEY e VITE_SUPABASE_URL da .env — nessuna chiave hardcoded.
// Output: backups/<timestamp>/<tabella>.json + auth_users.json
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const URL_BASE = env.VITE_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error('Mancano VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = path.join(__dirname, '..', 'backups', stamp);
fs.mkdirSync(outDir, { recursive: true });

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

async function dumpTable(name) {
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const res = await fetch(`${URL_BASE}/rest/v1/${name}?select=*`, {
      headers: { ...HEADERS, Range: `${from}-${from + page - 1}` },
    });
    if (!res.ok) throw new Error(`${res.status} su tabella ${name}`);
    const chunk = await res.json();
    rows.push(...chunk);
    if (chunk.length < page) break;
  }
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(rows, null, 1));
  console.log(`${name}: ${rows.length} righe`);
  return rows.length;
}

async function dumpAuthUsers() {
  const users = [];
  for (let p = 1; ; p++) {
    const data = await fetchJson(`${URL_BASE}/auth/v1/admin/users?page=${p}&per_page=1000`, HEADERS);
    const batch = data.users || [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }
  fs.writeFileSync(path.join(outDir, 'auth_users.json'), JSON.stringify(users, null, 1));
  console.log(`auth_users: ${users.length} utenti`);
}

(async () => {
  // Il root di PostgREST espone lo schema OpenAPI: da lì l'elenco tabelle/viste
  const spec = await fetchJson(`${URL_BASE}/rest/v1/`, HEADERS);
  const tables = Object.keys(spec.paths || {})
    .filter((p) => p !== '/' && !p.includes('rpc/'))
    .map((p) => p.slice(1));
  console.log(`Tabelle trovate: ${tables.join(', ')}`);
  let total = 0;
  for (const t of tables) total += await dumpTable(t);
  await dumpAuthUsers();
  console.log(`\nBackup completato in ${outDir} (${total} righe totali)`);
})().catch((e) => {
  console.error('ERRORE:', e.message);
  process.exit(1);
});
