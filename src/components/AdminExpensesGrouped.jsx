import React, { useMemo } from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { useTimesheet } from '@/context/TimesheetContext';
import ProjectExpensesSection from './ProjectExpensesSection';
import { AlertCircle } from 'lucide-react';

const AdminExpensesGrouped = () => {
  const { getAllExpenses, subcontracts, otherCosts } = useExpenses();
  const { projects } = useTimesheet();
  const expenses = getAllExpenses();

  // Determine active project IDs based on what has data
  const projectIdsWithData = useMemo(() => {
    const ids = new Set();
    
    // Add IDs from expenses
    expenses.forEach(e => {
      if (e.projectId) ids.add(e.projectId);
    });

    // Add IDs from subcontracts
    if (subcontracts) {
      subcontracts.forEach(s => {
        if (s.projectId) ids.add(s.projectId);
      });
    }

    // Add IDs from otherCosts
    if (otherCosts) {
      otherCosts.forEach(o => {
        if (o.projectId) ids.add(o.projectId);
      });
    }

    return Array.from(ids);
  }, [expenses, subcontracts, otherCosts]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 bg-blue-50 text-blue-800 p-4 rounded-lg border border-blue-100">
        <AlertCircle className="w-5 h-5" />
        <p className="text-sm">
          Questa sezione raggruppa tutti i costi (Spese Consulenti, Subcontratti, Other Costs) per singolo progetto.
        </p>
      </div>

      {projectIdsWithData.length > 0 ? (
        projectIdsWithData.map(projectId => {
          // Find project name safely
          const projectObj = projects.find(p => p.id === projectId);
          const projectName = projectObj ? projectObj.name : `Progetto Sconosciuto (${projectId})`;

          return (
            <ProjectExpensesSection 
              key={projectId} 
              projectId={projectId} 
              projectName={projectName} 
            />
          );
        })
      ) : (
        <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-xl">
          <p>Nessuna spesa o costo registrato nel sistema.</p>
        </div>
      )}
    </div>
  );
};

export default AdminExpensesGrouped;