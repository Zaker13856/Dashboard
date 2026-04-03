import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const generateManualPDF = async () => {
  // Create a hidden container for the manual content
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px'; // Fixed width for consistent rendering
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#333333';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.padding = '40px';
  container.style.boxSizing = 'border-box';
  container.style.lineHeight = '1.6';

  const today = new Date().toLocaleDateString('it-IT');

  // HTML Content
  container.innerHTML = `
    <!-- Cover Page -->
    <div style="min-height: 1040px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-after: always;">
      <h1 style="color: #2563eb; font-size: 48px; margin-bottom: 10px; font-weight: bold;">ISINNOVA</h1>
      <h2 style="font-size: 36px; margin-bottom: 20px; color: #1e293b;">Manuale d'Uso - Sistema Timesheet</h2>
      <h3 style="font-size: 24px; color: #64748b; margin-bottom: 50px;">Guida per Consulenti</h3>
      <p style="font-size: 18px; color: #94a3b8;">Data: ${today}</p>
    </div>

    <!-- Table of Contents -->
    <div style="min-height: 1040px; page-break-after: always;">
      <h2 style="color: #2563eb; font-size: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">Indice</h2>
      <ol style="font-size: 18px; margin-left: 20px; line-height: 2;">
        <li>Introduzione</li>
        <li>Come Inserire le Ore</li>
        <li>Come Inserire le Spese</li>
        <li>Visualizzazione Dati</li>
        <li>FAQ - Domande Frequenti</li>
        <li>Contatti e Supporto</li>
      </ol>
    </div>

    <!-- Section 1 -->
    <div style="min-height: 1040px; page-break-after: always;">
      <h2 style="color: #2563eb; font-size: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">1. Introduzione</h2>
      <p style="font-size: 16px; margin-bottom: 15px;">Benvenuto nel nuovo <strong>Sistema Timesheet di ISINNOVA</strong>. Questa piattaforma è stata progettata per semplificare e ottimizzare il processo di rendicontazione delle ore e delle spese per i consulenti.</p>
      <p style="font-size: 16px; margin-bottom: 15px;"><strong>Obiettivi del sistema:</strong></p>
      <ul style="font-size: 16px; margin-left: 20px; margin-bottom: 20px;">
        <li>Registrazione rapida e intuitiva delle ore lavorate sui vari progetti.</li>
        <li>Monitoraggio in tempo reale dei limiti mensili e annuali.</li>
        <li>Gestione centralizzata dei rimborsi spesa.</li>
      </ul>
    </div>

    <!-- Section 2 -->
    <div style="min-height: 1040px; page-break-after: always;">
      <h2 style="color: #2563eb; font-size: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">2. Come Inserire le Ore</h2>
      <p style="font-size: 16px; margin-bottom: 15px;">L'inserimento delle ore avviene tramite la sezione "Timesheet" della tua dashboard principale.</p>
      <h3 style="font-size: 20px; color: #0f172a; margin-top: 20px;">Passaggi:</h3>
      <ol style="font-size: 16px; margin-left: 20px; margin-bottom: 20px;">
        <li>Seleziona il mese di riferimento dal menu a tendina.</li>
        <li>Scegli il progetto dal menu a tendina "Seleziona Progetto".</li>
        <li>Inserisci il numero di ore nel campo dedicato.</li>
        <li>Clicca sul pulsante "Salva Ore" (o l'icona di salvataggio).</li>
      </ol>
      <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin-top: 20px;">
        <strong>💡 Suggerimento:</strong> Assicurati di non superare il tuo limite mensile. Il sistema mostrerà un avviso se ti avvicini alla soglia.
      </div>
    </div>

    <!-- Section 3 -->
    <div style="min-height: 1040px; page-break-after: always;">
      <h2 style="color: #2563eb; font-size: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">3. Come Inserire le Spese</h2>
      <p style="font-size: 16px; margin-bottom: 15px;">Puoi gestire i tuoi rimborsi nella scheda "Le Mie Spese".</p>
      <h3 style="font-size: 20px; color: #0f172a; margin-top: 20px;">Passaggi:</h3>
      <ol style="font-size: 16px; margin-left: 20px; margin-bottom: 20px;">
        <li>Seleziona il progetto per il quale hai sostenuto la spesa.</li>
        <li>Scegli la categoria della spesa (es. Viaggio, Alloggio, Pasti).</li>
        <li>Inserisci la data e l'importo.</li>
        <li>Carica una ricevuta (se richiesto) e clicca "Aggiungi Spesa".</li>
      </ol>
    </div>

    <!-- Section 4 -->
    <div style="min-height: 1040px; page-break-after: always;">
      <h2 style="color: #2563eb; font-size: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">4. Visualizzazione Dati</h2>
      <p style="font-size: 16px; margin-bottom: 15px;">La dashboard fornisce indicatori visivi per aiutarti a monitorare la tua attività:</p>
      <ul style="font-size: 16px; margin-left: 20px; margin-bottom: 20px;">
        <li><strong>Monthly Overview:</strong> Mostra le ore registrate nel mese corrente rispetto al limite mensile.</li>
        <li><strong>Annual Progress:</strong> Indica il totale delle ore registrate nell'anno rispetto al plafond annuale.</li>
        <li><strong>Current Month Entries:</strong> Una tabella riepilogativa con tutte le registrazioni effettuate nel mese selezionato.</li>
      </ul>
    </div>

    <!-- Section 5 -->
    <div style="min-height: 1040px; page-break-after: always;">
      <h2 style="color: #2563eb; font-size: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">5. FAQ - Domande Frequenti</h2>
      <div style="margin-bottom: 20px;">
        <h4 style="font-size: 18px; color: #0f172a; margin-bottom: 5px;">Posso modificare le ore già inserite?</h4>
        <p style="font-size: 16px; color: #475569;">Sì, puoi modificare o eliminare una registrazione dalla tabella "Voci del Mese Corrente" utilizzando le icone a destra della riga.</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h4 style="font-size: 18px; color: #0f172a; margin-bottom: 5px;">Cosa succede se supero il limite mensile?</h4>
        <p style="font-size: 16px; color: #475569;">Il sistema genererà un avviso (rosso) per informarti che il limite è stato superato. Sarà comunque possibile registrare le ore, ma l'amministratore ne sarà notificato.</p>
      </div>
    </div>

    <!-- Section 6 -->
    <div style="min-height: 1040px;">
      <h2 style="color: #2563eb; font-size: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">6. Contatti e Supporto</h2>
      <p style="font-size: 16px; margin-bottom: 15px;">Per qualsiasi problema tecnico o dubbio sull'utilizzo della piattaforma, puoi contattare il supporto amministrativo:</p>
      <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <p style="font-size: 16px; margin: 0;"><strong>Email:</strong> admin@isinnova.it</p>
        <p style="font-size: 16px; margin: 10px 0 0 0;"><strong>Orari di assistenza:</strong> Lun - Ven, 09:00 - 18:00</p>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate how many pages we need based on container height
    const containerHeight = container.clientHeight;
    const pageHeightPx = 1040; // Approximate height per section we set
    const totalPages = Math.ceil(containerHeight / pageHeightPx);

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      
      // Calculate source y position in canvas
      const srcY = i * pageHeightPx * 2; // scale is 2
      const srcHeight = pageHeightPx * 2;
      
      // We will just place the entire image offset upwards for each page
      const yOffset = -(i * pdfHeight);
      pdf.addImage(imgData, 'PNG', 0, yOffset, pdfWidth, (canvas.height * pdfWidth) / canvas.width);
      
      // Add footer
      pdf.setFontSize(10);
      pdf.setTextColor(150);
      pdf.text(`Pagina ${i + 1} di ${totalPages}`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
    }

    pdf.save('Manuale_Uso_Timesheet.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    document.body.removeChild(container);
  }
};