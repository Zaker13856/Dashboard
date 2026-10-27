// Centri di costo delle note spese: progetto oppure Tender/Promozione (senza progetto)
export const COST_CENTERS = [
  { value: 'progetto', label: 'Progetto' },
  { value: 'tender', label: 'Tender' },
  { value: 'promozione', label: 'Promozione' },
];

export const COST_CENTER_LABELS = { tender: 'TENDER', promozione: 'PROMOZIONE' };

// Nome da mostrare al posto del progetto (lista, Excel, email)
export const missionHeading = (mission, projectName) => {
  const cc = mission?.cost_center;
  if (cc && cc !== 'progetto') {
    const base = COST_CENTER_LABELS[cc] || cc.toUpperCase();
    return mission.cost_center_note ? `${base} – ${mission.cost_center_note}` : base;
  }
  return projectName || null;
};
