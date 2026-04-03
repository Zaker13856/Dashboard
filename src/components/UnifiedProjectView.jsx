import React from 'react';
import { useTimesheet } from '@/context/TimesheetContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Briefcase, Calendar, Users, Layers, CreditCard, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProjectFieldEditor from './ProjectFieldEditor';
import ConsultantProjectAssignment from './ConsultantProjectAssignment';
import ProjectFinancialCard from './ProjectFinancialCard';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const UnifiedProjectView = ({ projectId }) => {
  const { projects, updateProject } = useTimesheet();
  const { 
    getSubcontractsByProject, 
    getPlannedExpensesByProject, 
    deleteSubcontract, 
    removePlannedExpense 
  } = useExpenses();
  const { formatCurrency } = useProjectFinancials();
  const { toast } = useToast();

  const project = projects.find(p => p.id === projectId);
  if (!project) return <div className="p-8 text-center text-gray-500">Project not found</div>;

  const subcontracts = getSubcontractsByProject(projectId);
  const plannedExpenses = getPlannedExpensesByProject(projectId);

  const handleUpdate = async (field, value) => {
    updateProject(projectId, { [field]: value });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'On Hold': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header / Main Info */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 bg-white p-6 rounded-lg border shadow-sm">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <ProjectFieldEditor 
              value={project.name}
              label="Project Name"
              onSave={(val) => handleUpdate('name', val)}
              className="text-2xl font-bold text-gray-900 px-0 -ml-0 hover:bg-transparent hover:text-blue-700"
            />
            <Badge variant="outline" className={cn("ml-2 whitespace-nowrap", getStatusColor(project.status))}>
              {project.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
             <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div className="flex items-center gap-1">
                  <ProjectFieldEditor 
                    value={project.startDate}
                    type="date"
                    label="Start Date"
                    onSave={(val) => handleUpdate('startDate', val)}
                    formatter={formatDate}
                  />
                  <span className="text-gray-300 mx-1">→</span>
                  <ProjectFieldEditor 
                    value={project.endDate}
                    type="date"
                    label="End Date"
                    onSave={(val) => handleUpdate('endDate', val)}
                    formatter={formatDate}
                  />
                </div>
             </div>
             <Separator orientation="vertical" className="h-4" />
             <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span className="flex items-center gap-1">
                  <ProjectFieldEditor 
                    value={project.allocatedMonths}
                    type="number"
                    label="Months"
                    onSave={(val) => handleUpdate('allocatedMonths', val)}
                    formatter={(val) => `${val} mo`}
                  />
                </span>
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Financial Overview (Editable) */}
        <div className="h-auto">
           <ProjectFinancialCard projectId={projectId} interactive={true} showDetails={true} />
        </div>

        {/* Team Allocation */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b bg-gray-50/50">
             <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Team Allocation
             </h3>
          </div>
          <div className="p-4">
             <ConsultantProjectAssignment project={project} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedProjectView;