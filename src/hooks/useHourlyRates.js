import { useAuth } from '@/context/AuthContext';

export const useHourlyRates = () => {
  const { consultants, updateConsultant, getConsultantHourlyRate, incrementRatesVersion } = useAuth();

  // Fetches directly and synchronously from AuthContext cache
  const getConsultantRate = (consultantId, year) => {
    if (!consultantId) return 0;
    
    const consultant = consultants.find(c => c.id === consultantId);
    
    if (!consultant) return 0;

    if (consultant.hourlyRates && consultant.hourlyRates[year] !== undefined && consultant.hourlyRates[year] !== null) {
      return parseFloat(consultant.hourlyRates[year]);
    }
    
    return parseFloat(consultant.hourlyRate) || 0;
  };

  const getConsultantRateForYear = (consultantIdOrName, year) => {
    let consultantId = consultantIdOrName;
    const cByName = consultants.find(c => c.name === consultantIdOrName);
    if (cByName) {
      consultantId = cByName.id;
    }
    
    return getConsultantRate(consultantId, year);
  };

  const saveConsultantRate = (consultantId, year, rate) => {
    if (!consultantId || !year) return false;

    const rateFloat = parseFloat(rate);
    if (isNaN(rateFloat) || rateFloat < 0) return false;

    try {
      const consultant = consultants.find(c => c.id === consultantId);
      if (!consultant) return false;

      const updatedRates = { 
        ...(consultant.hourlyRates || {}),
        [year]: rateFloat
      };
      
      updateConsultant(consultantId, { hourlyRates: updatedRates });

      if (typeof incrementRatesVersion === 'function') {
        incrementRatesVersion();
      }
      
      return true;
    } catch (e) {
      console.error("❌ [useHourlyRates] Failed to save rate:", e);
      return false;
    }
  };

  const getConsultantRateHistory = (consultantId) => {
    const consultant = consultants.find(c => c.id === consultantId);
    if (!consultant) return {};
    return consultant.hourlyRates || {};
  };

  const getAllConsultantsRates = (year) => {
    return consultants.map(c => ({
      id: c.id,
      name: c.name,
      rate: getConsultantRate(c.id, year)
    }));
  };

  const validateRateSync = (consultantId, year, expectedRate) => {
    const actualRate = getConsultantRate(consultantId, year);
    const isValid = Math.abs(actualRate - expectedRate) < 0.01;
    return { isValid, actualRate, expectedRate };
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return {
    getConsultantRate,
    getConsultantRateForYear,
    saveConsultantRate,
    getConsultantRateHistory,
    getAllConsultantsRates,
    validateRateSync,
    formatCurrency
  };
};