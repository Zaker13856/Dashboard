import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { useTimesheet } from '@/context/TimesheetContext';
import { cn } from '@/lib/utils';
import { Info, AlertTriangle, Receipt, Briefcase, CreditCard, Users, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import AddOtherCostsForm from './AddOtherCostsForm';
import AddSubcontractsForm from './AddSubcontractsForm';
import EditablePlannedField from './EditablePlannedField';

const ProjectFinancialDetails = ({ projectId }) => {
  const { getProjectFinancials, formatCurrency } = useProjectFinancials();
  const { updateProjectExpensesBudget, updateProjectSubcontractsBudget } = useTimesheet();
  
  const [showAddOther, setShowAddOther] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);

  const financials = getProjectFinancials(projectId);
  
  if (!financials) return null;

  const {
    name,
    contractValue, 
    contractLaborBudget, 
    expensesBudget, 
    subcontractsBudget, 
    laborConsumed,
    expensesConsumed,
    subcontractsConsumed,
    consumptionPercentage,
    contractLaborConsumptionPercentage,
    expensesConsumptionPercentage,
    subcontractsConsumptionPercentage,
    remainingValue,
    isOverBudget,
    allExpensesList
  } = financials;

  const BudgetRow = ({ icon: Icon, title, consumed, budget, percentage, colorClass, barColorClass, onSaveBudget, isEditable = false }) => (
    <div className="space-y-2">
       <div className="flex justify-between items-center text-sm">
         <span className="flex items-center gap-2 font-medium text-gray-700">
            <Icon className={cn("w-4 h-4", colorClass)} />
            {title}
         </span>
         <div className="flex items-center gap-1 text-gray-500">
            <span className="font-medium text-gray-900">{formatCurrency(consumed)}</span>
            <span className="text-gray-400">/</span>
            {isEditable ? (
                <EditablePlannedField 
                    value={budget} 
                    onSave={onSaveBudget}
                    label={title}
                    formatter={formatCurrency}
                    className="font-medium text-gray-700"
                />
            ) : (
                <span className="font-medium text-gray-700">
                  {budget > 0 ? formatCurrency(budget) : "-"}
                </span>
            )}
         </div>
       </div>
       <Progress 
          value={Math.min(percentage, 100)} 
          className={cn("h-2 bg-gray-100")} 
          indicatorClassName={percentage > 100 ? "bg-red-500" : barColorClass} 
       />
       <p className="text-xs text-right text-gray-500">{percentage.toFixed(1)}% used</p>
    </div>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0">
        <div className="p-6 pb-2 border-b bg-gray-50/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {name} <span className="text-gray-400 font-normal">| Financial Details</span>
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <ScrollArea className="flex-1 px-6 pb-6 pt-6">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isOverBudget ? (
                <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Budget Overrun</AlertTitle>
                  <AlertDescription>
                    This project has exceeded its total budget by {formatCurrency(Math.abs(remainingValue))}.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle>On Track</AlertTitle>
                  <AlertDescription>
                    Project consumption is within the allocated budget ({consumptionPercentage.toFixed(1)}%).
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Total Contract Value</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(contractValue)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Remaining (Total)</p>
                  <p className={`text-xl font-bold ${remainingValue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(remainingValue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-5 shadow-sm">
                <h4 className="font-bold text-gray-900 border-b pb-3 mb-4 text-lg">Budget Consumption Analysis</h4>
                <div className="space-y-8">
                  <BudgetRow 
                     icon={Briefcase} title="Labor (Project Budget vs Actuals)" 
                     consumed={laborConsumed} budget={contractLaborBudget} percentage={contractLaborConsumptionPercentage}
                     colorClass="text-blue-500" barColorClass="bg-blue-500"
                     isEditable={false}
                  />
                  
                  <BudgetRow 
                     icon={CreditCard} title="Other Costs (Actuals vs Planned)" 
                     consumed={expensesConsumed} budget={expensesBudget} percentage={expensesConsumptionPercentage}
                     colorClass="text-amber-500" barColorClass="bg-amber-500"
                     isEditable={true}
                     onSaveBudget={(newVal) => updateProjectExpensesBudget(projectId, newVal)}
                  />

                  <BudgetRow 
                     icon={Users} title="Subcontracts (Actuals vs Planned)" 
                     consumed={subcontractsConsumed} budget={subcontractsBudget} percentage={subcontractsConsumptionPercentage}
                     colorClass="text-purple-500" barColorClass="bg-purple-500"
                     isEditable={true}
                     onSaveBudget={(newVal) => updateProjectSubcontractsBudget(projectId, newVal)}
                  />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { setShowAddOther(!showAddOther); setShowAddSub(false); }}
                        className={cn("gap-2 border-amber-200 text-amber-700 hover:bg-amber-50", showAddOther && "bg-amber-50")}
                    >
                        <PlusCircle className="w-4 h-4" /> {showAddOther ? "Cancel Adding Cost" : "Add Other Cost"}
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { setShowAddSub(!showAddSub); setShowAddOther(false); }}
                        className={cn("gap-2 border-purple-200 text-purple-700 hover:bg-purple-50", showAddSub && "bg-purple-50")}
                    >
                        <PlusCircle className="w-4 h-4" /> {showAddSub ? "Cancel Adding Subcontract" : "Add Subcontract"}
                    </Button>
                </div>

                {showAddOther && (
                    <div className="animate-in slide-in-from-top-2 border rounded-lg p-4 bg-amber-50/50">
                        <AddOtherCostsForm defaultProjectId={projectId} onSuccess={() => setShowAddOther(false)} />
                    </div>
                )}

                {showAddSub && (
                    <div className="animate-in slide-in-from-top-2 border rounded-lg p-4 bg-purple-50/50">
                        <AddSubcontractsForm defaultProjectId={projectId} onSuccess={() => setShowAddSub(false)} />
                    </div>
                )}

                <div className="bg-white rounded-lg border p-5 shadow-sm">
                    <h5 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                        <Receipt className="w-5 h-5 text-gray-600" />
                        All Recorded Actuals
                    </h5>
                    
                    {allExpensesList.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 italic bg-gray-50 rounded-lg border border-dashed">
                        No actual expenses recorded for this project yet.
                    </div>
                    ) : (
                    <div className="border rounded-md overflow-hidden text-xs">
                        <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 border-b">
                            <tr>
                            <th className="p-3 font-medium">Date</th>
                            <th className="p-3 font-medium">Category</th>
                            <th className="p-3 font-medium">Description</th>
                            <th className="p-3 font-medium text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {allExpensesList.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-gray-50/50">
                                <td className="p-3 text-gray-500">
                                {item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'}
                                </td>
                                <td className="p-3 font-medium text-gray-800">
                                <span className={cn(
                                    "px-2 py-1 rounded text-[10px] uppercase font-bold",
                                    item.category === 'Subcontract' ? "bg-purple-100 text-purple-700" : 
                                    item.category === 'Other Cost' ? "bg-amber-100 text-amber-700" :
                                    "bg-blue-100 text-blue-700"
                                )}>
                                    {item.category}
                                </span>
                                </td>
                                <td className="p-3 text-gray-500 truncate max-w-[200px]">{item.description}</td>
                                <td className="p-3 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</td>
                            </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold text-gray-900">
                            <tr>
                                <td colSpan={3} className="p-3 text-right">TOTAL ACTUALS:</td>
                                <td className="p-3 text-right">{formatCurrency(expensesConsumed + subcontractsConsumed)}</td>
                            </tr>
                        </tfoot>
                        </table>
                    </div>
                    )}
                </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectFinancialDetails;