import { useTimesheet } from '@/context/TimesheetContext';
import { useHourlyRates } from '@/hooks/useHourlyRates';
import { useExpenses } from '@/context/ExpenseContext';

export const useProjectFinancials = () => {
  const { projects, entries } = useTimesheet();
  const { getConsultantRate } = useHourlyRates();
  const { getExpensesByProjectId, getSubcontractsByProject, getOtherCostsByProject } = useExpenses();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const getProjectFinancials = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        return null;
    }

    if (projectId === 'p1') {
      console.group('🔍 SCAPE (p1) Financials Debug');
    }

    const PRODUCTIVE_HOURS_PER_MONTH = 143.33;
    const simulationDate = new Date();
    const start = new Date(project.startDate);
    
    let monthsElapsed = 0;
    if (start < simulationDate) {
      monthsElapsed = (simulationDate.getFullYear() - start.getFullYear()) * 12 + 
                      (simulationDate.getMonth() - start.getMonth()) + 
                      (simulationDate.getDate() - start.getDate()) / 30.44;
    }
    monthsElapsed = Math.max(0, monthsElapsed);

    // 1. Planned Labor (Assigned Budget)
    let laborBudget = 0; // This is "Assigned Value"
    let totalAssignedHours = 0;
    
    (project.assignedConsultants || []).forEach(assign => {
      const hours = parseFloat(assign.allocatedHours) || 0;
      const rate = parseFloat(assign.hourlyRate) || 0;
      totalAssignedHours += hours;
      laborBudget += (hours * rate);
    });

    // 2. Hard Budgets & Contract Value
    // FIX: Ensure budgets are numbers
    const expensesBudget = parseFloat(project.expensesBudget) || 0;
    const subcontractsBudget = parseFloat(project.subcontractsBudget) || 0;
    
    // FIX: Total Budget should be the Project Total Value (Contract), not just sum of components
    // If totalValue is missing, fallback to sum components, but usually totalValue is the truth
    const contractValue = parseFloat(project.totalValue) || (laborBudget + expensesBudget + subcontractsBudget);
    
    // Calculated Available Labor Budget (Contract - Ops)
    const contractLaborBudget = Math.max(0, contractValue - expensesBudget - subcontractsBudget);
    
    // 3. Consumed Labor (Actuals)
    const projectEntries = entries.filter(e => e.projectId === projectId);
    let consumedHours = 0;
    let laborConsumed = 0;

    projectEntries.forEach(entry => {
       const hours = parseFloat(entry.hours) || 0;
       
       // Guard against invalid hours
       if (hours === 0) return;

       consumedHours += hours;
       
       const entryYear = new Date(entry.date).getFullYear();
       const rate = getConsultantRate(entry.consultantId, entryYear);
       
       const cost = hours * rate;
       laborConsumed += cost;

       if (projectId === 'p1') {
          console.log(`Entry: ${entry.date} | ${hours}h * €${rate} = €${cost}`);
       }
    });

    // 4. Consumed Expenses
    const consultantExpenses = getExpensesByProjectId(projectId) || [];
    const projectOtherCosts = getOtherCostsByProject(projectId) || [];
    const projectSubcontracts = getSubcontractsByProject(projectId) || [];
    
    const expensesConsumed = consultantExpenses.reduce((sum, e) => sum + (parseFloat(e.amount)||0), 0) +
                             projectOtherCosts.reduce((sum, e) => sum + (parseFloat(e.amount)||0), 0);
    
    const subcontractsConsumed = projectSubcontracts.reduce((sum, e) => sum + (parseFloat(e.amount)||0), 0);

    // 5. Totals
    const totalConsumed = laborConsumed + expensesConsumed + subcontractsConsumed;
    
    if (projectId === 'p1') {
       console.log('--- Totals ---');
       console.log('Labor Consumed:', laborConsumed);
       console.log('Expenses Consumed:', expensesConsumed);
       console.log('Subcontracts Consumed:', subcontractsConsumed);
       console.log('TOTAL CONSUMED:', totalConsumed);
       console.log('Contract Value:', contractValue);
       console.log('Contract Labor Budget (Available):', contractLaborBudget);
       console.groupEnd();
    }

    // 6. Remaining & Percentages
    // FIX: Remaining Labor should be based on CONTRACT AVAILABLE labor, not Assigned Labor
    // If totalConsumed is 0, this should equal contractLaborBudget
    const laborRemaining = contractLaborBudget - laborConsumed;
    
    const allExpensesList = [
      ...consultantExpenses.map(e => ({ ...e, source: e.consultantName || 'Consultant', category: e.expenseType || 'Expense' })),
      ...projectOtherCosts.map(e => ({ ...e, source: 'Internal', category: 'Other Cost' })),
      ...projectSubcontracts.map(e => ({ ...e, source: 'Vendor', category: 'Subcontract' }))
    ].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    // Percentages
    // Assigned Consumption % (For "Planned Labor" bar)
    const laborConsumptionPercentage = laborBudget > 0 ? (laborConsumed / laborBudget) * 100 : 0;
    
    // Project/Contract Labor Consumption % (For "Remaining" bar)
    const contractLaborConsumptionPercentage = contractLaborBudget > 0 ? (laborConsumed / contractLaborBudget) * 100 : 0;

    const expensesConsumptionPercentage = expensesBudget > 0 ? (expensesConsumed / expensesBudget) * 100 : 0;
    const subcontractsConsumptionPercentage = subcontractsBudget > 0 ? (subcontractsConsumed / subcontractsBudget) * 100 : 0;
    const consumptionPercentage = contractValue > 0 ? (totalConsumed / contractValue) * 100 : 0;

    return {
      id: project.id,
      name: project.name,
      allocatedMonths: parseFloat(project.allocatedMonths) || 0,
      monthlyRate: parseFloat(project.monthlyRate) || 0,
      contractValue,
      monthsElapsed,
      
      // Budgets
      laborBudget, // Assigned
      contractLaborBudget, // Available
      expensesBudget, 
      subcontractsBudget, 
      totalBudget: contractValue, // Use Contract Value as total budget
      
      // Actuals
      consumedHours, 
      totalAssignedHours, 
      laborConsumed, 
      expensesConsumed, 
      subcontractsConsumed, 
      totalConsumed,
      
      // Analysis Data
      allExpensesList,
      
      // Percentages
      laborConsumptionPercentage, // Assigned %
      contractLaborConsumptionPercentage, // Available %
      expensesConsumptionPercentage,
      subcontractsConsumptionPercentage,
      consumptionPercentage, // Total Project %
      progressPercentage: consumptionPercentage,
      
      // Remaining values
      remainingValue: contractValue - totalConsumed, 
      laborRemaining, 
      
      isOverBudget: totalConsumed > contractValue,
      
      totalAssignedValue: laborBudget, 
      consumedValue: totalConsumed,
      totalValue: contractValue,
      plannedMonths: totalAssignedHours / PRODUCTIVE_HOURS_PER_MONTH
    };
  };

  const getPortfolioMetrics = () => {
    let totalAllocatedValue = 0;
    let totalConsumedValue = 0;
    const projectFinancials = projects.map(p => getProjectFinancials(p.id)).filter(Boolean);

    projectFinancials.forEach(stats => {
      totalAllocatedValue += stats.totalBudget;
      totalConsumedValue += stats.totalConsumed;
    });

    return {
      totalAllocatedValue, 
      totalConsumedValue,
      totalRemainingValue: totalAllocatedValue - totalConsumedValue,
      portfolioProgress: totalAllocatedValue > 0 ? (totalConsumedValue / totalAllocatedValue) * 100 : 0,
      projectFinancials
    };
  };

  return { getProjectFinancials, getPortfolioMetrics, formatCurrency };
};