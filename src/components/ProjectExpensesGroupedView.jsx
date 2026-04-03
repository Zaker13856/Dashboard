import React from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { Layers, Briefcase, Receipt, CreditCard } from 'lucide-react';

const ProjectExpensesGroupedView = () => {
  const { getUnifiedExpenses } = useExpenses();
  const { projects } = useTimesheet();
  const allExpenses = getUnifiedExpenses();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Group expenses by project
  const groupedData = projects.map(project => {
    const projectItems = allExpenses.filter(e => e.projectId === project.id);
    
    // MAPPING:
    // Subcontracts -> From Subcontractors
    const subcontractItems = projectItems.filter(e => e.category === 'Subcontract');
    
    // Other Costs -> From Actual Expenses (Consultant + Other Costs)
    const actualItems = projectItems.filter(e => e.category === 'Consultant' || e.category === 'Other Cost');
    
    const totalSubcontract = parseFloat(project.subcontractsBudget) || 0;
    
    // Actuals are always sum of Actuals
    const totalActual = actualItems.reduce((sum, e) => sum + e.amount, 0);
    
    // We display items if they exist
    const hasData = projectItems.length > 0 || totalSubcontract > 0;

    return {
      ...project,
      hasData,
      breakdown: {
        subcontract: { items: subcontractItems, total: totalSubcontract },
        actual: { items: actualItems, total: totalActual }
      }
    };
  }).filter(p => p.hasData); 

  if (groupedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-50 border rounded-lg border-dashed">
        <Receipt className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No expenses or budgets recorded.</p>
      </div>
    );
  }

  const ExpenseTable = ({ items, emptyText }) => (
    <div className="border rounded-md overflow-hidden bg-white mt-2 shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-left border-b">
           <tr>
             <th className="p-2 pl-3 font-medium text-xs uppercase w-24">Date</th>
             <th className="p-2 font-medium text-xs uppercase">Description</th>
             <th className="p-2 pr-3 font-medium text-xs uppercase text-right w-24">Amount</th>
           </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map(item => (
              <tr key={item.uniqueId} className="border-b last:border-0 hover:bg-gray-50/50">
                <td className="p-2 pl-3 text-gray-500 text-xs whitespace-nowrap">
                  {item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'}
                </td>
                <td className="p-2 text-gray-700 text-xs">
                  <div className="font-medium truncate max-w-[180px]" title={item.description}>{item.description}</div>
                  {item.category === 'Consultant' && <span className="text-[10px] text-gray-400 block">{item.consultantName}</span>}
                </td>
                <td className="p-2 pr-3 text-right font-medium text-gray-900 text-xs">{formatCurrency(item.amount)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="p-4 text-center text-xs text-gray-400 italic bg-gray-50/30">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="w-full space-y-4">
        {groupedData.map((project) => (
          <AccordionItem key={project.id} value={project.id} className="border rounded-lg bg-white shadow-sm px-4">
            <AccordionTrigger className="hover:no-underline py-4">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full pr-4 gap-2">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-100 rounded-md">
                     <Layers className="w-5 h-5 text-blue-600" />
                   </div>
                   <div className="text-left">
                     <h4 className="font-bold text-gray-900">{project.name}</h4>
                     <p className="text-xs text-gray-500">
                       Budget Breakdown
                     </p>
                   </div>
                 </div>
               </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t mt-2">
                  
                  {/* Column 1: Subcontracts - SHOWING BUDGET TOTAL */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-purple-50 p-3 rounded-t-lg border-b border-purple-100">
                       <span className="text-sm font-bold text-purple-800 flex items-center gap-2">
                         <Briefcase className="w-4 h-4" /> Subcontracts <span className="text-[10px] font-normal opacity-70">(Planned)</span>
                       </span>
                       <span className="font-bold text-purple-900">{formatCurrency(project.breakdown.subcontract.total)}</span>
                    </div>
                    <ExpenseTable items={project.breakdown.subcontract.items} emptyText="No subcontractors assigned." />
                  </div>

                  {/* Column 2: Other Costs (Actuals) - SHOWING ACTUAL TOTAL */}
                  <div className="space-y-2">
                     <div className="flex justify-between items-center bg-amber-50 p-3 rounded-t-lg border-b border-amber-100">
                       <span className="text-sm font-bold text-amber-800 flex items-center gap-2">
                         <Receipt className="w-4 h-4" /> Other Costs <span className="text-[10px] font-normal opacity-70">(Actuals)</span>
                       </span>
                       <span className="font-bold text-amber-900">{formatCurrency(project.breakdown.actual.total)}</span>
                    </div>
                    <ExpenseTable items={project.breakdown.actual.items} emptyText="No actual expenses recorded." />
                  </div>

               </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default ProjectExpensesGroupedView;