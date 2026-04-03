import * as XLSX from 'xlsx';

// Helper to format date as DD/MM/YYYY for consistency
const formatDate = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return dateInput; // Return original if parsing fails
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Exports a comprehensive project expense report including consultant expenses, subcontracts, and other costs.
 * Creates multiple sheets for detailed breakdown and a summary sheet.
 */
export const exportProjectExpenses = (projectData) => {
  const wb = XLSX.utils.book_new();

  // 1. Consultant Expenses Sheet
  if (projectData.consultantExpenses && projectData.consultantExpenses.length > 0) {
    const wsData = [
      ["Data", "Consulente", "Tipo", "Descrizione", "Importo (€)", "IVA (€)", "Eligible (€)"],
      ...projectData.consultantExpenses.map(exp => [
        formatDate(exp.expenseDate),
        exp.consultantName,
        exp.expenseType,
        exp.description || "",
        parseFloat(exp.amount || 0),
        parseFloat(exp.vat || 0),
        parseFloat(exp.eligibleAmount || 0)
      ])
    ];
    
    const totalAmount = projectData.consultantExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    wsData.push(["", "", "", "TOTALE", totalAmount, "", ""]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Spese Consulenti");
  }

  // 2. Subcontracts Sheet
  if (projectData.subcontracts && projectData.subcontracts.length > 0) {
    const wsData = [
      ["Data Inserimento", "Descrizione", "Importo (€)"],
      ...projectData.subcontracts.map(sub => [
        formatDate(sub.date || sub.createdAt),
        sub.description,
        parseFloat(sub.amount || 0)
      ])
    ];

    const totalSub = projectData.subcontracts.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    wsData.push(["", "TOTALE", totalSub]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Subcontratti");
  }

  // 3. Other Costs Sheet
  if (projectData.otherCosts && projectData.otherCosts.length > 0) {
    const wsData = [
      ["Data Inserimento", "Descrizione", "Importo (€)"],
      ...projectData.otherCosts.map(oc => [
        formatDate(oc.date || oc.createdAt),
        oc.description,
        parseFloat(oc.amount || 0)
      ])
    ];

    const totalOther = projectData.otherCosts.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
    wsData.push(["", "TOTALE", totalOther]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Other Costs");
  }

  // 4. Summary Sheet
  if (projectData.totals) {
    const summaryData = [
      ["Categoria", "Totale (€)"],
      ["Spese Consulenti", projectData.totals.consultants],
      ["Subcontratti", projectData.totals.subcontracts],
      ["Other Costs", projectData.totals.otherCosts],
      ["", ""],
      ["TOTALE COMPLESSIVO", projectData.totals.grandTotal]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Riepilogo");
  }

  const safeProjectName = (projectData.projectName || "Project").replace(/[^a-z0-9]/gi, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `Spese_${safeProjectName}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
};

/**
 * Exports a specific detailed report for Subcontracts and Other Costs combined.
 */
export const exportProjectExpensesDetailed = ({ projectName, subcontracts = [], otherCosts = [] }) => {
  const wb = XLSX.utils.book_new();
  
  const safeSubcontracts = Array.isArray(subcontracts) ? subcontracts : [];
  const safeOtherCosts = Array.isArray(otherCosts) ? otherCosts : [];

  // Combine data from subcontracts and other costs
  const allExpenses = [
    ...safeSubcontracts.map(s => ({
      ...s,
      type: 'Subcontract',
      exportDate: s.date || s.createdAt,
      desc: s.description || 'Subcontract',
      amount: parseFloat(s.amount || 0)
    })),
    ...safeOtherCosts.map(o => ({
      ...o,
      type: 'Other Cost',
      exportDate: o.date || o.createdAt,
      desc: o.description || 'Other Cost',
      amount: parseFloat(o.amount || 0)
    }))
  ];

  // Sort by date (descending)
  allExpenses.sort((a, b) => {
    const dateA = new Date(a.exportDate || 0);
    const dateB = new Date(b.exportDate || 0);
    return dateB - dateA;
  });

  const wsData = [
    ["Nome Progetto", "Data Spesa", "Descrizione Spesa", "Importo"]
  ];

  let totalAmount = 0;

  allExpenses.forEach(item => {
    const val = item.amount;
    if (!isNaN(val)) {
      totalAmount += val;
    }

    wsData.push([
      item.projectName || projectName, 
      formatDate(item.exportDate),
      item.desc,
      val
    ]);
  });

  wsData.push(["", "", "TOTALE", totalAmount]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  ws['!cols'] = [
    { wch: 25 }, // Project Name
    { wch: 15 }, // Date
    { wch: 50 }, // Description
    { wch: 15 }  // Amount
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Dettaglio Spese");

  const safeName = (projectName || "Project").replace(/[^a-z0-9]/gi, '_');
  XLSX.writeFile(wb, `${safeName}_Expenses_Detailed.xlsx`);
};

/**
 * Exports ALL expenses for a single project (Consultants + Subcontracts + Other Costs).
 * Rows: Nome Progetto | Data (DD/MM/YYYY) | Descrizione | Importo | Tipo di Spesa
 */
export const exportSingleProjectExpenses = ({ projectName, consultantExpenses = [], subcontracts = [], otherCosts = [] }) => {
  const wb = XLSX.utils.book_new();

  const safeConsultantExpenses = Array.isArray(consultantExpenses) ? consultantExpenses : [];
  const safeSubcontracts = Array.isArray(subcontracts) ? subcontracts : [];
  const safeOtherCosts = Array.isArray(otherCosts) ? otherCosts : [];

  // 1. Normalize all items
  const allItems = [
    ...safeConsultantExpenses.map(item => ({
      projectName: projectName,
      date: item.expenseDate || item.date || item.uploadDate,
      description: item.description || item.expenseType || "Consultant Expense",
      amount: parseFloat(item.amount || 0),
      type: item.expenseType || "Consultant"
    })),
    ...safeSubcontracts.map(item => ({
      projectName: projectName,
      date: item.date || item.createdAt,
      description: item.description || "Subcontract",
      amount: parseFloat(item.amount || 0),
      type: "Subcontract"
    })),
    ...safeOtherCosts.map(item => ({
      projectName: projectName,
      date: item.date || item.createdAt,
      description: item.description || "Other Cost",
      amount: parseFloat(item.amount || 0),
      type: "Other Cost"
    }))
  ];

  // 2. Sort by date (descending)
  allItems.sort((a, b) => {
    const da = new Date(a.date || 0);
    const db = new Date(b.date || 0);
    return db - da; // newest first
  });

  // 3. Create Worksheet Data with Italian Headers
  const wsData = [
    ["Nome Progetto", "Data", "Descrizione", "Importo", "Tipo di Spesa"]
  ];

  let grandTotal = 0;

  allItems.forEach(item => {
    const val = item.amount;
    if (!isNaN(val)) grandTotal += val;

    wsData.push([
      item.projectName,
      formatDate(item.date),
      item.description,
      val,
      item.type
    ]);
  });

  // 4. Add Footer
  wsData.push(["", "", "TOTALE", grandTotal, ""]);

  // 5. Create Sheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 25 }, // Project Name
    { wch: 15 }, // Date
    { wch: 50 }, // Description
    { wch: 15 }, // Amount
    { wch: 20 }  // Type
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Spese Progetto");

  // 6. Write File
  const safeName = (projectName || "Project").replace(/[^a-z0-9]/gi, '_');
  XLSX.writeFile(wb, `${safeName}_Expenses.xlsx`);
};

/**
 * Exports the project allocation plan: header, sold-vs-planned summary, and periods table.
 */
export const exportProjectPlan = ({ project, consultants, periodRows, totals, ovhRate }) => {
  const wb = XLSX.utils.book_new();
  const n2 = v => parseFloat((v || 0).toFixed(2));

  // ── Blocco 1: Testata progetto ───────────────────────────────
  const headerRows = [
    ['Nome',           project.name            || '—'],
    ['Cliente',        project.client          || '—'],
    ['Tipo',           project.type            || '—'],
    ['Stato',          project.status          || '—'],
    ['Inizio',         project.start_date ? formatDate(project.start_date) : '—'],
    ['Fine',           project.end_date   ? formatDate(project.end_date)   : '—'],
    ['Durata',         project.duration_months != null ? `${project.duration_months} mesi` : '—'],
    ['MU Venduti',     project.sold_person_months ?? '—'],
    ['Valore Venduto', project.total_value     ?? '—'],
    [],
  ];

  // ── Blocco 2: Venduto vs Pianificato ─────────────────────────
  const soldMU    = parseFloat(project.sold_person_months) || 0;
  const soldValue = parseFloat(project.total_value)        || 0;
  const planMU    = totals.totMU;
  const planValue = totals.costiPersonale;

  const vvpRows = [
    ['',           'Venduti',        'Pianificati',    'Delta'],
    ['Mesi (MU)',  n2(soldMU),       n2(planMU),       n2(planMU - soldMU)],
    ['Valore (€)', n2(soldValue),    n2(planValue),    n2(planValue - soldValue)],
    [],
  ];

  // ── Blocco 3: Tabella periodi ────────────────────────────────
  const ovhPct = Math.round((ovhRate || 0.25) * 100);

  const tableHeader = [
    'Periodo',
    'Durata (mesi)',
    ...consultants.map(c => c.name),
    'Tot MU',
    'Costo Int. €',
    'Costo Ext. €',
    'Costi Pers. €',
    'Travel €',
    'Other €',
    'Subcontr. €',
    '3rd Part. €',
    'Tot Diretti €',
    `Overhead ${ovhPct}% €`,
    'Gran Totale €',
  ];

  const tableRows = periodRows.map(({ period, consultantHours, totMU, costoInterno, costoEsterno, costiPersonale, travel, otherCosts, subcontr, thirdParties, totDiretti, overhead, granTotale }) => [
    period.label,
    period.duration_months,
    ...consultantHours.map(h => n2(h)),
    n2(totMU),
    n2(costoInterno),
    n2(costoEsterno),
    n2(costiPersonale),
    n2(travel),
    n2(otherCosts),
    n2(subcontr),
    n2(thirdParties),
    n2(totDiretti),
    n2(overhead),
    n2(granTotale),
  ]);

  const totalRow = [
    'TOTALE',
    '',
    ...consultants.map(c => n2(totals.cTot?.[c.id] || 0)),
    n2(totals.totMU),
    n2(totals.costoInterno),
    n2(totals.costoEsterno),
    n2(totals.costiPersonale),
    n2(totals.travel),
    n2(totals.otherCosts),
    n2(totals.subcontr),
    n2(totals.thirdParties),
    n2(totals.totDiretti),
    n2(totals.overhead),
    n2(totals.granTotale),
  ];

  // ── Assemble sheet ───────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet([
    ...headerRows,
    ...vvpRows,
    tableHeader,
    ...tableRows,
    totalRow,
  ]);

  const consultantColCount = consultants.length;
  ws['!cols'] = [
    { wch: 20 },                                        // Periodo
    { wch: 14 },                                        // Durata
    ...Array(consultantColCount).fill({ wch: 10 }),     // consultant hours
    ...Array(13).fill({ wch: 14 }),                     // numeric columns
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Piano Progetto');

  const safeName = (project.name || 'Project').replace(/[^a-z0-9]/gi, '_');
  const dateStr  = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${safeName}_Piano_${dateStr}.xlsx`);
};
