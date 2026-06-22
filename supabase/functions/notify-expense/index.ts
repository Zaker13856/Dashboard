// Edge Function: notify-expense
// Invia email a segreteria quando consulente invia nota spese.
// Deploy: npx supabase functions deploy notify-expense --project-ref yhkzkpntfkzcktxdceri

import { createClient } from 'npm:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const PAYMENT_LABELS: Record<string, string> = {
  carta_personale: 'Carta Personale',
  carta_aziendale: 'Carta Aziendale',
  cash: 'Cash',
};

const parseSubType = (description: string) => {
  if (!description) return { subType: 'Other', text: '' };
  const match = description.match(/^\[([^\]]+)\]\s*(.*)/);
  if (match) return { subType: match[1], text: match[2] };
  return { subType: 'Other', text: description };
};

const DARK_BLUE = '1F3864';
const LIGHT_BG  = 'DCE6F1';
const ALT_ROW   = 'F2F7FC';

const cs = (fill: string | null, fontColor = 'FFFFFF', bold = false, sz = 10, halign = 'center') => ({
  fill: fill ? { patternType: 'solid', fgColor: { rgb: fill } } : undefined,
  font: { bold, color: { rgb: fontColor }, sz },
  alignment: { horizontal: halign, vertical: 'center', wrapText: true },
  border: {
    top:    { style: 'thin', color: { rgb: 'BFBFBF' } },
    bottom: { style: 'thin', color: { rgb: 'BFBFBF' } },
    left:   { style: 'thin', color: { rgb: 'BFBFBF' } },
    right:  { style: 'thin', color: { rgb: 'BFBFBF' } },
  },
});

const setCell = (ws: Record<string, unknown>, ref: string, value: unknown, style?: unknown) => {
  ws[ref] = { v: value, t: typeof value === 'number' ? 'n' : 's', s: style };
};

// Genera workbook XLSX con lo stesso formato del template ISINNOVA
const buildXlsx = (mission: Record<string, unknown>, expenses: Record<string, unknown>[], consultantName: string, projectName: string): string => {
  const ws: Record<string, unknown> = {};

  const totalAmt  = expenses.reduce((s, e) => s + (parseFloat(e.amount as string) || 0), 0);
  const totalIva  = expenses.reduce((s, e) => s + (parseFloat(e.iva as string) || 0), 0);
  const totalElig = expenses.reduce((s, e) => s + (parseFloat(e.eligible_amount as string) || 0), 0);

  const safeName = ((mission.place as string) || 'Missione').replace(/[\\/\?\*\[\]:]/g, '').substring(0, 28);

  // Titolo
  const titleStyle = { font: { bold: true, color: { rgb: DARK_BLUE }, sz: 16 }, alignment: { horizontal: 'center', vertical: 'center' } };
  setCell(ws, 'A1', 'Travel Expense Report', titleStyle);

  // Intestazione sinistra
  const labelStyle = { font: { bold: true, color: { rgb: '333333' }, sz: 10 }, alignment: { horizontal: 'right', vertical: 'center' } };
  const valueStyle = { font: { bold: false, color: { rgb: '000000' }, sz: 10 }, alignment: { horizontal: 'left', vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: '333333' } } } };
  setCell(ws, 'A3', 'Name:',            labelStyle);
  setCell(ws, 'B3', consultantName,      valueStyle);
  setCell(ws, 'A4', 'Travelling with:',  labelStyle);
  setCell(ws, 'B4', (mission.travelling_with as string) || '', valueStyle);
  setCell(ws, 'A5', 'Project:',          labelStyle);
  setCell(ws, 'B5', projectName,         valueStyle);
  setCell(ws, 'A6', 'Destination:',      labelStyle);
  setCell(ws, 'B6', (mission.place as string) || '', valueStyle);

  // Intestazione destra (Period)
  const periodHeaderStyle = cs(DARK_BLUE, 'FFFFFF', true, 10, 'center');
  const periodLabelStyle  = { font: { bold: true, color: { rgb: '333333' }, sz: 10 }, alignment: { horizontal: 'right', vertical: 'center' }, fill: { patternType: 'solid', fgColor: { rgb: LIGHT_BG } } };
  const periodValueStyle  = { font: { bold: false, color: { rgb: '000000' }, sz: 10 }, alignment: { horizontal: 'left', vertical: 'center' }, fill: { patternType: 'solid', fgColor: { rgb: LIGHT_BG } } };
  setCell(ws, 'J2', 'Period',  periodHeaderStyle);
  setCell(ws, 'J3', 'From:',   periodLabelStyle);
  setCell(ws, 'K3', fmtDate(mission.date_from as string), periodValueStyle);
  setCell(ws, 'J4', 'To:',     periodLabelStyle);
  setCell(ws, 'K4', fmtDate(mission.date_to as string),   periodValueStyle);

  // Intestazioni tabella
  const headers = ['Payment Method','Date of Transaction','Notes/Description','Currency','Transportation','Lodging','Meals','Other','VAT','Rec','TOTAL EURO','VAT'];
  const cols    = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  headers.forEach((h, i) => setCell(ws, `${cols[i]}8`, h, cs(DARK_BLUE, 'FFFFFF', true, 9, 'center')));

  // Righe dati
  const dataStart = 9;
  const minRows = Math.max(expenses.length, 13);
  for (let r = 0; r < minRows; r++) {
    const e = expenses[r] as Record<string, unknown> | undefined;
    const rowNum = dataStart + r;
    const rowBg = r % 2 === 0 ? 'FFFFFF' : ALT_ROW;
    const dc = (halign = 'left') => cs(rowBg, '000000', false, 10, halign);
    const nc = cs(rowBg, '000000', false, 10, 'right');
    if (e) {
      const { subType, text } = parseSubType((e.description as string) || '');
      const amt = parseFloat(e.amount as string) || 0;
      const iva = parseFloat(e.iva as string) || 0;
      setCell(ws, `A${rowNum}`, PAYMENT_LABELS[e.payment_method as string] || (e.payment_method as string) || '', dc());
      setCell(ws, `B${rowNum}`, fmtDate((e.payment_date || e.date) as string), dc('center'));
      setCell(ws, `C${rowNum}`, text || (e.description as string) || '', dc());
      setCell(ws, `D${rowNum}`, 'EURO', dc('center'));
      ws[`E${rowNum}`] = { v: subType === 'Transportation' ? amt : '', t: subType === 'Transportation' ? 'n' : 's', z: '€ #,##0.00', s: nc };
      ws[`F${rowNum}`] = { v: subType === 'Lodging'        ? amt : '', t: subType === 'Lodging'        ? 'n' : 's', z: '€ #,##0.00', s: nc };
      ws[`G${rowNum}`] = { v: subType === 'Meals'           ? amt : '', t: subType === 'Meals'           ? 'n' : 's', z: '€ #,##0.00', s: nc };
      ws[`H${rowNum}`] = { v: subType === 'Other'           ? amt : '', t: subType === 'Other'           ? 'n' : 's', z: '€ #,##0.00', s: nc };
      ws[`I${rowNum}`] = { v: iva, t: 'n', z: '0.00', s: nc };
      setCell(ws, `J${rowNum}`, '', dc());
      ws[`K${rowNum}`] = { v: amt, t: 'n', z: '"€ "#,##0.00', s: nc };
      ws[`L${rowNum}`] = { v: iva, t: 'n', z: '0.00', s: nc };
    } else {
      cols.forEach(c => { ws[`${c}${rowNum}`] = { v: c === 'D' ? 'EURO' : '', t: 's', s: dc(c === 'D' ? 'center' : 'left') }; });
    }
  }

  // Totali
  const sumRow = dataStart + minRows + 1;
  const totLabelStyle = cs(LIGHT_BG, '000000', true, 10, 'right');
  const totValueStyle = { fill: { patternType: 'solid', fgColor: { rgb: LIGHT_BG } }, font: { bold: true, color: { rgb: '000000' }, sz: 10 }, alignment: { horizontal: 'right' }, border: { top: { style: 'thin', color: { rgb: DARK_BLUE } }, bottom: { style: 'thin', color: { rgb: DARK_BLUE } }, left: { style: 'thin', color: { rgb: DARK_BLUE } }, right: { style: 'thin', color: { rgb: DARK_BLUE } } } };
  const totEligStyle  = { fill: { patternType: 'solid', fgColor: { rgb: DARK_BLUE } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, alignment: { horizontal: 'right' }, border: { top: { style: 'medium', color: { rgb: DARK_BLUE } }, bottom: { style: 'medium', color: { rgb: DARK_BLUE } }, left: { style: 'medium', color: { rgb: DARK_BLUE } }, right: { style: 'medium', color: { rgb: DARK_BLUE } } } };
  setCell(ws, `J${sumRow}`,   'Total Expense',        totLabelStyle);
  ws[`K${sumRow}`]   = { v: totalAmt,  t: 'n', z: '"€ "#,##0.00', s: totValueStyle };
  setCell(ws, `J${sumRow+1}`, 'Of which Total VAT',   totLabelStyle);
  ws[`K${sumRow+1}`] = { v: totalIva,  t: 'n', z: '"€ "#,##0.00', s: totValueStyle };
  setCell(ws, `J${sumRow+2}`, 'Total Eligible Costs', totLabelStyle);
  ws[`K${sumRow+2}`] = { v: totalElig, t: 'n', z: '"€ "#,##0.00', s: totEligStyle };

  // Merge e dimensioni
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 9 }, e: { r: 1, c: 11 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 8 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 8 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 8 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 8 } },
  ];
  ws['!cols'] = [
    { wch: 16 }, { wch: 13 }, { wch: 28 }, { wch: 8 },
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 8  }, { wch: 18 }, { wch: 13 }, { wch: 8 },
  ];
  ws['!rows'] = [{ hpt: 28 }];
  ws['!ref']  = `A1:L${sumRow + 2}`;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws as XLSX.WorkSheet, safeName || 'Missione');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }) as string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const resendKey = Deno.env.get('RESEND_API_KEY')!;
  if (!resendKey) return json({ error: 'RESEND_API_KEY non configurata' }, 500);

  // Verifica JWT chiamante
  const authHeader = req.headers.get('Authorization') ?? '';
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !caller) return json({ error: 'Non autenticato' }, 401);

  let body: { mission_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body JSON non valido' }, 400);
  }

  if (!body.mission_id) return json({ error: 'mission_id mancante' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch missione
  const { data: mission, error: mErr } = await admin
    .from('missions')
    .select('*')
    .eq('id', body.mission_id)
    .single();

  if (mErr || !mission) return json({ error: 'Missione non trovata' }, 404);

  // Fetch consulente e progetto separatamente (no FK join in questo progetto)
  const [{ data: consultant }, { data: project }] = await Promise.all([
    admin.from('consultants').select('id, name').eq('auth_user_id', caller.id).single(),
    admin.from('projects').select('name').eq('id', mission.project_id).single(),
  ]);

  // Solo il proprietario può inviare
  if (!consultant || mission.consultant_id !== consultant.id) return json({ error: 'Permesso negato' }, 403);

  const consultantName = consultant?.name || caller.email || 'Consulente';
  const projectName = project?.name || '—';

  // Fetch spese missione
  const { data: expenses } = await admin
    .from('expenses')
    .select('*')
    .eq('mission_id', body.mission_id)
    .order('payment_date', { ascending: true });

  const rows = expenses || [];
  const totalAmt  = rows.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalElig = rows.reduce((s, e) => s + (parseFloat(e.eligible_amount) || 0), 0);

  // Genera URL firmati allegati (7 giorni)
  const attachmentLinks: string[] = [];
  if (mission.receipt_paths?.length > 0) {
    for (const path of mission.receipt_paths) {
      const { data } = await admin.storage.from('scontrini').createSignedUrl(path, 60 * 60 * 24 * 7);
      if (data?.signedUrl) {
        const name = path.split('/').pop() || path;
        attachmentLinks.push(`<a href="${data.signedUrl}" style="color:#4f46e5">${name}</a>`);
      }
    }
  }

  // Costruisci tabella spese HTML
  const subtypeLabel = (desc: string) => {
    const m = desc?.match(/^\[([^\]]+)\]/);
    return m ? m[1] : '—';
  };
  const descText = (desc: string) => desc?.replace(/^\[[^\]]+\]\s*/, '') || '—';

  const expenseRows = rows.map(e => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${fmtDate(e.payment_date || e.date)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${subtypeLabel(e.description)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${descText(e.description)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">€ ${fmt(parseFloat(e.amount) || 0)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#15803d">€ ${fmt(parseFloat(e.eligible_amount) || 0)}</td>
    </tr>`).join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#111;max-width:640px;margin:0 auto;padding:24px">
  <div style="background:#4f46e5;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">ISINNOVA — Nota Spese</h2>
  </div>
  <div style="background:#f9fafb;padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <table style="width:100%;margin-bottom:16px">
      <tr><td style="color:#6b7280;width:140px">Consulente</td><td><strong>${consultantName}</strong></td></tr>
      <tr><td style="color:#6b7280">Progetto</td><td>${projectName}</td></tr>
      <tr><td style="color:#6b7280">Destinazione</td><td>${mission.place || '—'}</td></tr>
      <tr><td style="color:#6b7280">Periodo</td><td>${fmtDate(mission.date_from)} – ${fmtDate(mission.date_to)}</td></tr>
      ${mission.travelling_with ? `<tr><td style="color:#6b7280">Con</td><td>${mission.travelling_with}</td></tr>` : ''}
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
      <thead>
        <tr style="background:#e5e7eb">
          <th style="padding:6px 8px;text-align:left">Data</th>
          <th style="padding:6px 8px;text-align:left">Tipo</th>
          <th style="padding:6px 8px;text-align:left">Descrizione</th>
          <th style="padding:6px 8px;text-align:right">Importo</th>
          <th style="padding:6px 8px;text-align:right">Eligible</th>
        </tr>
      </thead>
      <tbody>${expenseRows}</tbody>
      <tfoot>
        <tr style="font-weight:bold;background:#f3f4f6">
          <td colspan="3" style="padding:6px 8px">Totale</td>
          <td style="padding:6px 8px;text-align:right">€ ${fmt(totalAmt)}</td>
          <td style="padding:6px 8px;text-align:right;color:#15803d">€ ${fmt(totalElig)}</td>
        </tr>
      </tfoot>
    </table>

    ${attachmentLinks.length > 0 ? `
    <div style="margin-bottom:16px">
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Allegati (link validi 7 giorni)</p>
      <ul style="margin:0;padding-left:18px">
        ${attachmentLinks.map(l => `<li style="margin-bottom:4px;font-size:13px">${l}</li>`).join('')}
      </ul>
    </div>` : ''}

    <p style="font-size:12px;color:#9ca3af;margin:0">Inviato automaticamente da isinnova.cloud</p>
  </div>
</body>
</html>`;

  const TO_EMAIL = 'gcali@isinnova.org';
  const dateRange = mission.date_from === mission.date_to
    ? fmtDate(mission.date_from)
    : `${fmtDate(mission.date_from)}–${fmtDate(mission.date_to)}`;

  const safeName = (mission.place || 'Missione').replace(/[\\/\?\*\[\]:]/g, '').substring(0, 28);
  const dateStamp = fmtDate(mission.date_from).replace(/\//g, '');
  const xlsxBase64 = buildXlsx(mission, rows, consultantName, projectName);

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ISINNOVA Dashboard <onboarding@resend.dev>',
      to: [TO_EMAIL],
      subject: `[ISINNOVA] Nota spese — ${consultantName} · ${mission.place} · ${dateRange}`,
      html,
      attachments: [{
        filename: `NotaSpese_${safeName}_${dateStamp}.xlsx`,
        content: xlsxBase64,
      }],
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    return json({ error: `Resend error: ${err}` }, 500);
  }

  // Marca missione come inviata
  await admin.from('missions').update({
    submitted: true,
    submitted_at: new Date().toISOString(),
  }).eq('id', body.mission_id);

  return json({ success: true });
});
