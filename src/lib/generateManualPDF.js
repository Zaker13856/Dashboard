import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const generateManualPDF = async () => {
  const container = document.createElement('div');
  container.style.cssText = [
    'position:absolute', 'left:-9999px', 'top:0',
    'width:800px', 'background:#ffffff', 'color:#1f2937',
    'font-family:Inter,Arial,sans-serif', 'padding:0',
    'box-sizing:border-box', 'line-height:1.6',
  ].join(';');

  const today = new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'long', year:'numeric' });

  const PAGE = `min-height:1040px;padding:60px;box-sizing:border-box;page-break-after:always;`;
  const H1 = `font-size:36px;font-weight:800;color:#1e293b;margin-bottom:10px;`;
  const H2 = `font-size:24px;font-weight:700;color:#2563eb;border-bottom:2px solid #e2e8f0;padding-bottom:10px;margin-bottom:24px;`;
  const H3 = `font-size:17px;font-weight:600;color:#1e293b;margin:20px 0 8px;`;
  const P  = `font-size:14px;color:#4b5563;margin-bottom:14px;`;
  const LI = `font-size:14px;color:#4b5563;margin-bottom:8px;padding-left:4px;`;
  const CALLOUT = `background:#eff6ff;border-left:4px solid #2563eb;padding:14px 16px;border-radius:8px;font-size:13.5px;color:#1e40af;margin:16px 0;`;
  const CALLOUT_G = `background:#ecfdf5;border-left:4px solid #10b981;padding:14px 16px;border-radius:8px;font-size:13.5px;color:#065f46;margin:16px 0;`;
  const CALLOUT_A = `background:#fffbeb;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:8px;font-size:13.5px;color:#92400e;margin:16px 0;`;
  const FIELD = `display:grid;grid-template-columns:190px 1fr;gap:12px;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;`;
  const BADGE = (c) => `display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:100px;margin:0 4px 0 0;background:${c};`;

  container.innerHTML = `

    <!-- COVER -->
    <div style="${PAGE}display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:linear-gradient(135deg,#2563eb,#1d4ed8,#3730a3);">
      <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.5);letter-spacing:.12em;text-transform:uppercase;margin-bottom:28px;">ISINNOVA</div>
      <div style="font-size:48px;font-weight:800;color:#fff;margin-bottom:14px;">Guida Consulenti</div>
      <div style="font-size:22px;color:#bfdbfe;margin-bottom:10px;">Come caricare una nuova spesa</div>
      <div style="width:60px;height:3px;background:rgba(255,255,255,.3);margin:24px auto;border-radius:2px;"></div>
      <div style="font-size:14px;color:rgba(255,255,255,.5);">Aggiornato al ${today}</div>
    </div>

    <!-- INDICE -->
    <div style="${PAGE}">
      <div style="${H2}Indice</div>
      <ol style="font-size:16px;margin-left:24px;line-height:2.4;color:#374151;">
        <li>Dove si trovano le spese</li>
        <li>Procedura passo-passo</li>
        <li>Riepilogo campi del modulo</li>
        <li>Come leggere la lista spese</li>
        <li>Domande frequenti</li>
      </ol>
    </div>

    <!-- 1. DOVE TROVARE -->
    <div style="${PAGE}">
      <div style="${H2}1. Dove si trovano le spese</div>
      <p style="${P}">Dopo il login la dashboard si apre direttamente sulla scheda <strong>Le Mie Spese</strong>. In alto sono presenti due tab:</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0;">
        <div style="padding:16px;background:#eff6ff;border:2px solid #bfdbfe;border-radius:12px;">
          <div style="font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:6px;">📋 Le Mie Spese</div>
          <div style="font-size:13px;color:#4b5563;">Elenco di tutte le spese già registrate, raggruppate per progetto con i totali.</div>
        </div>
        <div style="padding:16px;background:#f5f3ff;border:2px solid #ddd6fe;border-radius:12px;">
          <div style="font-size:14px;font-weight:700;color:#7c3aed;margin-bottom:6px;">➕ Carica Spesa</div>
          <div style="font-size:13px;color:#4b5563;">Modulo per inserire una nuova spesa di trasferta o costo di progetto.</div>
        </div>
      </div>
      <div style="${CALLOUT}">💡 Per aggiungere una nuova spesa clicca sul tab <strong>Carica Spesa</strong>.</div>
    </div>

    <!-- 2. PROCEDURA -->
    <div style="${PAGE}">
      <div style="${H2}2. Procedura passo-passo</div>

      <div style="margin-bottom:22px;">
        <div style="${H3}Passo 1 — Clicca sul tab "Carica Spesa"</div>
        <p style="${P}">Nella sezione Le Mie Spese, seleziona il tab <strong>Carica Spesa</strong>. Si aprirà il modulo di inserimento.</p>
      </div>

      <div style="margin-bottom:22px;">
        <div style="${H3}Passo 2 — Seleziona il Progetto</div>
        <p style="${P}">Dal menu a tendina scegli il progetto per cui hai sostenuto la spesa. Vengono mostrati solo i progetti attivi a te assegnati.</p>
      </div>

      <div style="margin-bottom:22px;">
        <div style="${H3}Passo 3 — Inserisci la Data</div>
        <p style="${P}">Indica la data in cui hai effettuato la spesa (non oggi, ma la data reale del costo). Il sistema propone automaticamente la data odierna.</p>
      </div>

      <div style="margin-bottom:22px;">
        <div style="${H3}Passo 4 — Scegli il Tipo di Spesa</div>
        <p style="${P}">Seleziona la categoria:</p>
        <ul style="margin-left:20px;">
          <li style="${LI}"><span style="${BADGE('#dbeafe')}color:#1d4ed8;">Transportation</span> — Trasporto (aereo, treno, taxi, auto propria…)</li>
          <li style="${LI}"><span style="${BADGE('#fef3c7')}color:#92400e;">Lodging</span> — Alloggio (hotel, b&b…)</li>
          <li style="${LI}"><span style="${BADGE('#ede9fe')}color:#5b21b6;">Meals</span> — Pasti durante la trasferta</li>
        </ul>
      </div>
    </div>

    <!-- 2b. PROCEDURA (cont.) -->
    <div style="${PAGE}">
      <div style="${H2}2. Procedura passo-passo (continua)</div>

      <div style="margin-bottom:22px;">
        <div style="${H3}Passo 5 — Inserisci Importo e IVA</div>
        <p style="${P}"><strong>Importo Totale €</strong>: l'importo lordo indicato sulla ricevuta / scontrino / fattura.</p>
        <p style="${P}"><strong>IVA €</strong>: l'importo IVA se indicato separatamente. Lascia vuoto se non applicabile.</p>
        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:14px 18px;font-size:14px;color:#4c1d95;font-weight:500;margin:12px 0;">
          💜 &nbsp; Eleggibile = Importo Totale − IVA &nbsp;&nbsp; (calcolato automaticamente)
        </div>
        <div style="${CALLOUT_A}">⚠️ Il campo <strong>Eligible Costs</strong> si aggiorna da solo non appena compili Importo e IVA. Non è modificabile manualmente.</div>
      </div>

      <div style="margin-bottom:22px;">
        <div style="${H3}Passo 6 — Aggiungi una Descrizione (facoltativo)</div>
        <p style="${P}">Inserisci una breve nota (es. nome del convegno, destinazione). Viene anteposta automaticamente la categoria scelta.</p>
      </div>

      <div style="margin-bottom:22px;">
        <div style="${H3}Passo 7 — Clicca "Aggiungi Spesa"</div>
        <p style="${P}">Premi il pulsante in fondo al modulo. Se tutti i campi obbligatori sono corretti, la spesa viene salvata e appare subito nella lista.</p>
        <div style="${CALLOUT_G}">✅ Dopo il salvataggio il modulo si azzera automaticamente, pronto per un nuovo inserimento.</div>
      </div>
    </div>

    <!-- 3. CAMPI -->
    <div style="${PAGE}">
      <div style="${H2}3. Riepilogo campi del modulo</div>

      <div style="${FIELD}">
        <div style="font-size:13px;font-weight:600;color:#374151;">Progetto <span style="${BADGE('#fee2e2')}color:#b91c1c;font-size:10px;">obbligatorio</span></div>
        <div style="font-size:13px;color:#6b7280;">Menu a tendina con i progetti attivi assegnati al consulente.</div>
      </div>
      <div style="${FIELD}">
        <div style="font-size:13px;font-weight:600;color:#374151;">Data Spesa <span style="${BADGE('#fee2e2')}color:#b91c1c;font-size:10px;">obbligatorio</span></div>
        <div style="font-size:13px;color:#6b7280;">Data effettiva della spesa (non la data di inserimento).</div>
      </div>
      <div style="${FIELD}">
        <div style="font-size:13px;font-weight:600;color:#374151;">Tipo Spesa <span style="${BADGE('#fee2e2')}color:#b91c1c;font-size:10px;">obbligatorio</span></div>
        <div style="font-size:13px;color:#6b7280;">Transportation / Lodging / Meals.</div>
      </div>
      <div style="${FIELD}">
        <div style="font-size:13px;font-weight:600;color:#374151;">Importo Totale € <span style="${BADGE('#fee2e2')}color:#b91c1c;font-size:10px;">obbligatorio</span></div>
        <div style="font-size:13px;color:#6b7280;">Importo lordo della ricevuta in euro (es. 420.66).</div>
      </div>
      <div style="${FIELD}">
        <div style="font-size:13px;font-weight:600;color:#374151;">IVA €</div>
        <div style="font-size:13px;color:#6b7280;">Importo IVA separato se presente. Lascia vuoto se assente.</div>
      </div>
      <div style="display:grid;grid-template-columns:190px 1fr;gap:12px;padding:12px 14px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:8px;">
        <div style="font-size:13px;font-weight:600;color:#7c3aed;">Eligible Costs €</div>
        <div style="font-size:13px;color:#6b7280;"><em>Calcolato automaticamente</em>. Non modificabile. È il valore rendicontato al progetto.</div>
      </div>
      <div style="${FIELD}">
        <div style="font-size:13px;font-weight:600;color:#374151;">Descrizione</div>
        <div style="font-size:13px;color:#6b7280;">Nota libera (destinazione, evento). Facoltativa ma consigliata.</div>
      </div>
    </div>

    <!-- 4. LISTA -->
    <div style="${PAGE}">
      <div style="${H2}4. Come leggere la lista spese</div>
      <p style="${P}">Nel tab <strong>Le Mie Spese</strong> ogni progetto è un accordion. Nell'intestazione compaiono due indicatori fondamentali:</p>

      <div style="padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin:16px 0;">
        <div style="font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:6px;">Travel eleg: € X / € Y</div>
        <div style="font-size:13px;color:#4b5563;">
          <strong>€ X</strong> = totale eleggibile delle tue spese Travel inserite.<br>
          <strong>€ Y</strong> = budget Travel venduto per quel progetto.<br>
          <span style="color:#dc2626;font-weight:600;">Diventa rosso</span> se hai superato il budget.
        </div>
      </div>
      <div style="padding:16px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;margin:16px 0;">
        <div style="font-size:14px;font-weight:700;color:#d97706;margin-bottom:6px;">Other eleg: € X / € Y</div>
        <div style="font-size:13px;color:#4b5563;">Stesso schema per alloggio, pasti e altri costi. Diventa rosso se il budget è sforato.</div>
      </div>
      <div style="${CALLOUT}">💡 Tieni d'occhio questi valori: ogni euro speso in più rispetto al venduto non è rimborsabile dal progetto.</div>

      <div style="margin-top:28px;">
        <div style="${H2}5. Domande frequenti</div>
        <div style="margin-bottom:18px;">
          <div style="font-size:15px;font-weight:600;color:#1e293b;margin-bottom:4px;">Posso eliminare una spesa già inserita?</div>
          <p style="${P}">Sì. Apri l'accordion del progetto, trova la riga della spesa e clicca sull'icona del cestino rosso a destra. Verrà chiesta una conferma prima dell'eliminazione definitiva.</p>
        </div>
        <div style="margin-bottom:18px;">
          <div style="font-size:15px;font-weight:600;color:#1e293b;margin-bottom:4px;">Posso esportare le mie spese in Excel?</div>
          <p style="${P}">Sì. In ogni accordion di progetto c'è il pulsante <strong>Excel</strong> (verde): genera un file .xlsx con tutte le spese di quel progetto, inclusa una riga di totale.</p>
        </div>
        <div>
          <div style="font-size:15px;font-weight:600;color:#1e293b;margin-bottom:4px;">Cosa significa "Eleggibile"?</div>
          <p style="${P}">È l'importo che viene riconosciuto come costo ammissibile dal progetto europeo: Importo Totale meno IVA. L'IVA non è rendicontabile sui progetti EU.</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const pageHeightPx = 1040;
    const totalPages = Math.ceil(container.clientHeight / pageHeightPx);

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      const yOffset = -(i * pdfH);
      pdf.addImage(imgData, 'PNG', 0, yOffset, pdfW, (canvas.height * pdfW) / canvas.width);
      pdf.setFontSize(9);
      pdf.setTextColor(180);
      pdf.text(`ISINNOVA — Guida Consulenti · Pagina ${i + 1} di ${totalPages}`, pdfW / 2, pdfH - 8, { align: 'center' });
    }
    pdf.save('Guida_Consulenti_Spese.pdf');
  } catch (err) {
    console.error('PDF generation error:', err);
    throw err;
  } finally {
    document.body.removeChild(container);
  }
};
