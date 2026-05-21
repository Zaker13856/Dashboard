import { jsPDF } from 'jspdf';

export const generateManualPDF = async () => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = 210;
  const H = 297;
  const ML = 20;   // margin left
  const MR = 20;   // margin right
  const TW = W - ML - MR; // text width
  const today = new Date().toLocaleDateString('it-IT');

  let y = 0;

  const addPage = () => {
    pdf.addPage();
    y = 20;
  };

  const checkY = (needed = 10) => {
    if (y + needed > H - 15) addPage();
  };

  const footer = () => {
    const total = pdf.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      pdf.setPage(i);
      pdf.setFontSize(9);
      pdf.setTextColor(160);
      pdf.text(`ISINNOVA – Guida Consulenti – Pagina ${i} di ${total}`, W / 2, H - 8, { align: 'center' });
    }
  };

  // ── COVER ────────────────────────────────────────────────────────
  // Blue header bar
  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 0, W, 60, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ISINNOVA', W / 2, 28, { align: 'center' });

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema Timesheet', W / 2, 42, { align: 'center' });
  pdf.text('Guida per Consulenti', W / 2, 52, { align: 'center' });

  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Data: ${today}`, W / 2, 85, { align: 'center' });

  // ── INDICE ───────────────────────────────────────────────────────
  addPage();

  pdf.setFillColor(37, 99, 235);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.rect(ML, y, TW, 10, 'F');
  pdf.text('INDICE', ML + 4, y + 7);
  y += 16;

  const toc = [
    '1. Introduzione',
    '2. Come Inserire le Ore',
    '3. Come Inserire le Spese',
    '4. Visualizzazione Dati',
    '5. FAQ - Domande Frequenti',
    '6. Contatti e Supporto',
  ];
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  toc.forEach((item) => {
    pdf.text(item, ML + 6, y);
    y += 9;
  });

  // ── SECTION 1 ────────────────────────────────────────────────────
  addPage();
  const sectionHeader = (title) => {
    pdf.setFillColor(37, 99, 235);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.rect(ML, y, TW, 10, 'F');
    pdf.text(title, ML + 4, y + 7);
    y += 16;
    pdf.setTextColor(30, 41, 59);
  };

  const body = (text, indent = 0) => {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    const lines = pdf.splitTextToSize(text, TW - indent);
    checkY(lines.length * 6 + 2);
    pdf.text(lines, ML + indent, y);
    y += lines.length * 6 + 3;
  };

  const subtitle = (text) => {
    checkY(10);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(text, ML, y);
    y += 8;
  };

  const bullet = (text, indent = 4) => {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    const lines = pdf.splitTextToSize(`• ${text}`, TW - indent);
    checkY(lines.length * 6 + 1);
    pdf.text(lines, ML + indent, y);
    y += lines.length * 6 + 2;
  };

  const numbered = (n, text, indent = 4) => {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    const lines = pdf.splitTextToSize(`${n}. ${text}`, TW - indent);
    checkY(lines.length * 6 + 1);
    pdf.text(lines, ML + indent, y);
    y += lines.length * 6 + 2;
  };

  const tip = (text) => {
    checkY(18);
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(37, 99, 235);
    const lines = pdf.splitTextToSize(text, TW - 12);
    const boxH = lines.length * 6 + 8;
    pdf.roundedRect(ML, y, TW, boxH, 2, 2, 'FD');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(37, 99, 235);
    pdf.text('Suggerimento', ML + 4, y + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 64, 175);
    pdf.text(lines, ML + 4, y + 12);
    y += boxH + 6;
  };

  // 1. Introduzione
  sectionHeader('1. Introduzione');
  body('Benvenuto nel Sistema Timesheet di ISINNOVA. Questa piattaforma e\' stata progettata per semplificare e ottimizzare il processo di rendicontazione delle ore e delle spese per i consulenti.');
  y += 2;
  subtitle('Obiettivi del sistema:');
  bullet('Registrazione rapida e intuitiva delle ore lavorate sui vari progetti.');
  bullet('Monitoraggio in tempo reale dei limiti mensili e annuali.');
  bullet('Gestione centralizzata dei rimborsi spesa.');

  // 2. Come Inserire le Ore
  addPage();
  sectionHeader('2. Come Inserire le Ore');
  body('L\'inserimento delle ore avviene tramite la sezione "Timesheet" della tua dashboard principale.');
  y += 2;
  subtitle('Passaggi:');
  numbered(1, 'Seleziona il mese di riferimento dal menu a tendina.');
  numbered(2, 'Scegli il progetto dal menu "Seleziona Progetto".');
  numbered(3, 'Inserisci il numero di ore nel campo dedicato.');
  numbered(4, 'Clicca sul pulsante "Salva Ore".');
  y += 4;
  tip('Assicurati di non superare il tuo limite mensile. Il sistema mostrera\' un avviso se ti avvicini alla soglia.');

  // 3. Come Inserire le Spese
  addPage();
  sectionHeader('3. Come Inserire le Spese');
  body('Puoi gestire i tuoi rimborsi nella scheda "Le Mie Spese".');
  y += 2;
  subtitle('Passaggi:');
  numbered(1, 'Seleziona il progetto per il quale hai sostenuto la spesa.');
  numbered(2, 'Scegli la categoria della spesa (es. Viaggio, Alloggio, Pasti).');
  numbered(3, 'Inserisci la data e l\'importo.');
  numbered(4, 'Carica una ricevuta (se richiesto) e clicca "Aggiungi Spesa".');

  // 4. Visualizzazione Dati
  addPage();
  sectionHeader('4. Visualizzazione Dati');
  body('La dashboard fornisce indicatori visivi per aiutarti a monitorare la tua attivita\':');
  y += 2;
  bullet('Monthly Overview: Mostra le ore registrate nel mese corrente rispetto al limite mensile.');
  bullet('Annual Progress: Indica il totale delle ore registrate nell\'anno rispetto al plafond annuale.');
  bullet('Current Month Entries: Tabella riepilogativa con tutte le registrazioni del mese selezionato.');

  // 5. FAQ
  addPage();
  sectionHeader('5. FAQ - Domande Frequenti');

  subtitle('Posso modificare le ore gia\' inserite?');
  body('Si\', puoi modificare o eliminare una registrazione dalla tabella "Voci del Mese Corrente" utilizzando le icone a destra della riga.');
  y += 4;

  subtitle('Cosa succede se supero il limite mensile?');
  body('Il sistema generera\' un avviso (rosso) per informarti che il limite e\' stato superato. Sara\' comunque possibile registrare le ore, ma l\'amministratore ne sara\' notificato.');
  y += 4;

  subtitle('Come cambio la password?');
  body('Contatta l\'amministratore per richiedere il reset della password. Riceverai le nuove credenziali via email.');

  // 6. Contatti
  addPage();
  sectionHeader('6. Contatti e Supporto');
  body('Per qualsiasi problema tecnico o dubbio sull\'utilizzo della piattaforma, contatta il supporto amministrativo:');
  y += 6;

  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(ML, y, TW, 28, 3, 3, 'F');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('Email:', ML + 6, y + 10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('admin@isinnova.it', ML + 24, y + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Orari:', ML + 6, y + 20);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Lunedi\' - Venerdi\', 09:00 - 18:00', ML + 24, y + 20);

  // Footer su tutte le pagine
  footer();

  pdf.save('Guida_Consulenti_Spese.pdf');
};
