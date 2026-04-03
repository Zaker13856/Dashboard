import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Briefcase, TrendingUp, Users, Wallet, FileSpreadsheet, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { useTimesheet } from '@/context/TimesheetContext';
import { useExpenses } from '@/context/ExpenseContext';
import { cn } from '@/lib/utils';
import ProjectFinancialDetails from './ProjectFinancialDetails';
import EditablePlannedField from './EditablePlannedField';
import { exportSingleProjectExpenses } from '@/lib/excelExporter';
import { useToast } from '@/components/ui/use-toast';

const ProjectFinancialCard = ({ projectId, showDetails = true, interactive = false }) => {
  const { getProjectFinancials, formatCurrency } = useProjectFinancials();
  const { updateProjectExpensesBudget, updateProjectSubcontractsBudget } = useTimesheet();
  const { getExpensesByProjectId, getSubcontractsByProject, getOtherCostsByProject } = useExpenses();
  const { toast } = useToast();
  
  const [isExporting, setIsExporting] = useState(false);

  const financials = getProjectFinancials(projectId);

  if (!financials) {
    return (
      <Card className="h-full border-l-4 border-l-gray-300 shadow-sm p-4">
        <p className="text-sm text-gray-500">Loading financials...</p>
      </Card>
    );
  }

  const {
    name,
    allocatedMonths,
    laborBudget,
    expensesBudget,
    subcontractsBudget,
    laborConsumptionPercentage,
    contractLaborConsumptionPercentage,
    expensesConsumed,
    subcontractsConsumed,
    isOverBudget,
    monthlyRate,
  } = financials;

  // Task 5: Personal cost uses fresh rates from useProjectFinancials (which uses fresh data from AuthContext)
  const personalCost = monthlyRate * allocatedMonths;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const projectConsultantExpenses = getExpensesByProjectId(projectId);
      const projectSubcontracts = getSubcontractsByProject(projectId);
      const projectOtherCosts = getOtherCostsByProject(projectId);

      console.log(`📊 [ProjectFinancialCard] Exporting expenses for project: ${name} (${projectId})`);

      await new Promise(resolve => setTimeout(resolve, 500));

      exportSingleProjectExpenses({
        projectName: name,
        consultantExpenses: projectConsultantExpenses,
        subcontracts: projectSubcontracts,
        otherCosts: projectOtherCosts
      });

      toast({
        title: "Esportazione completata",
        description: `Il file Excel per ${name} è stato generato con successo.`,
        className: "bg-green-50 border-green-200 text-green-900"
      });
    } catch (error) {
      console.error("❌ [ProjectFinancialCard] Export failed:", error);
      toast({
        title: "Errore Esportazione",
        description: "Impossibile generare il file Excel.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const BudgetSection = ({ icon: Icon, title, amount, percentage, colorClass, barColorClass }) => (
    <div className="w-full">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("w-3.5 h-3.5", colorClass)} />
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">{title}</p>
      </div>
      <div className="flex justify-between items-baseline mb-1 h-8">
        <p className="text-sm font-bold text-gray-900">
          {amount > 0 ? formatCurrency(amount) : "-"}
        </p>
        <span className={cn("text-[10px] font-medium", percentage > 100 ? "text-red-600" : "text-gray-500")}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", percentage > 100 ? "bg-red-500" : barColorClass)} 
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );

  const CostBox = ({ title, icon: Icon, planned, actual, colorClass, borderClass, bgClass, onSavePlanned, isEditable }) => {
    const isOver = actual > planned;
    return (
      <div className={cn("rounded-lg border p-3 flex-1", borderClass, bgClass)}>
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("p-1.5 rounded-full bg-white", colorClass)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className={cn("text-xs font-bold uppercase tracking-wider", colorClass.replace('bg-', 'text-').replace('100', '700'))}>
            {title}
          </span>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Planned:</span>
            {isEditable ? (
                <EditablePlannedField 
                    value={planned} 
                    onSave={onSavePlanned} 
                    label="Planned" 
                    formatter={formatCurrency}
                    className="font-semibold text-gray-700"
                />
            ) : (
                <span className="font-semibold text-gray-700">{planned > 0 ? formatCurrency(planned) : "-"}</span>
            )}
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Actual:</span>
            <span className={cn("font-bold", isOver ? "text-red-600" : "text-gray-900")}>
              {formatCurrency(actual)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!interactive ? { y: -5 } : {}}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn("h-full border-l-4 shadow-sm relative overflow-hidden group transition-shadow bg-white", isOverBudget ? "border-l-red-500" : "border-l-blue-500", !interactive && "hover:shadow-md")}>
        {(isOverBudget || contractLaborConsumptionPercentage > 100) && (
          <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
            <AlertTriangle className="w-24 h-24 text-red-500" />
          </div>
        )}
        
        <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/30">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0 mr-2">
                  <CardTitle className="text-lg font-bold text-gray-900 truncate" title={name}>
                    {name}
                  </CardTitle>
                  
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2"
                    onClick={handleExport}
                    disabled={isExporting}
                    title="Esporta spese in Excel"
                  >
                    {isExporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    )}
                    Esporta in Excel
                  </Button>
                </div>
                
                <div className="flex-shrink-0">
                  <ProjectFinancialDetails projectId={projectId} />
                </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal bg-blue-50 text-blue-700 border-blue-200">
                {allocatedMonths} mo. allocated
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                {formatCurrency(personalCost)} Personal Cost
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4 space-y-6">
          <div className="flex gap-4 justify-between flex-wrap">
            <BudgetSection 
              icon={Briefcase} 
              title="PLANNED LABOR" 
              amount={laborBudget} 
              percentage={laborConsumptionPercentage} 
              colorClass="text-blue-600" 
              barColorClass="bg-blue-500"
            />
          </div>

          {showDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CostBox 
                title="Other Costs"
                icon={TrendingUp}
                planned={expensesBudget}
                actual={expensesConsumed}
                colorClass="bg-amber-100 text-amber-700"
                borderClass="border-amber-100"
                bgClass="bg-amber-50/30"
                isEditable={interactive}
                onSavePlanned={(val) => updateProjectExpensesBudget(projectId, val)}
              />

              <CostBox 
                title="Subcontracts"
                icon={Users}
                planned={subcontractsBudget}
                actual={subcontractsConsumed}
                colorClass="bg-purple-100 text-purple-700"
                borderClass="border-purple-100"
                bgClass="bg-purple-50/30"
                isEditable={interactive}
                onSavePlanned={(val) => updateProjectSubcontractsBudget(projectId, val)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProjectFinancialCard;