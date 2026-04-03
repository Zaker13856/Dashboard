import React, { useState } from 'react';
import { useTimesheet } from '@/context/TimesheetContext';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Clock, Wallet, Users, BarChart, ArrowUpDown, ChevronDown, ChevronUp, Briefcase, Activity, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ProjectStats = ({ stats: propStats, project: propProject }) => {
  const { getProjectsSortedByValue, projects, deleteProject } = useTimesheet();
  const { getPortfolioMetrics, getProjectFinancials, formatCurrency } = useProjectFinancials();
  const [sortDirection, setSortDirection] = useState('desc');
  const { toast } = useToast();
  
  const portfolioMetrics = getPortfolioMetrics();

  // Calculate Portfolio Value for 2026 projects only
  // Filters projects that have a start date in 2026 and sums their total value
  const portfolioValue2026 = projects
    .filter(p => {
      if (!p.startDate) return false;
      return new Date(p.startDate).getFullYear() === 2026;
    })
    .reduce((sum, p) => sum + (parseFloat(p.totalValue) || 0), 0);

  const handleDeleteProject = (projectId) => {
    try {
      deleteProject(projectId);
      toast({
        title: "Progetto Cancellato",
        description: "Progetto cancellato con successo.",
        variant: "success", // or default if success variant not defined in theme
        className: "bg-green-50 border-green-200 text-green-900" 
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile cancellare il progetto.",
        variant: "destructive"
      });
    }
  };

  // Legacy Single Project Card View (for Detail Pages)
  if (propProject) {
    const liveStats = getProjectFinancials(propProject.id);
    if (!liveStats) return null;

    const getStatusColor = (status) => {
      switch(status) {
        case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
        case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
      }
    };

    // Safe access for progress percentage
    const progressValue = liveStats.progressPercentage || 0;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card className="bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Status</span>
              <BarChart className="w-4 h-4 text-gray-400" />
            </div>
            <span className={`px-2 py-1 rounded text-xs font-semibold w-fit ${getStatusColor(propProject.status)}`}>
              {propProject.status}
            </span>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Financial Progress</span>
              <span className="text-xs font-bold text-blue-600">{progressValue.toFixed(0)}%</span>
            </div>
            <Progress value={progressValue} className="h-2" />
             <p className="text-xs text-gray-400 mt-2">
              {formatCurrency(liveStats.consumedValue)} / {formatCurrency(liveStats.totalValue)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Planned Spend</span>
              <Wallet className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(liveStats.totalAssignedValue)}
            </p>
            <p className="text-xs text-gray-400">Committed to consultants</p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Team Size</span>
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-lg font-bold text-gray-900">
              {new Set((propProject.assignedConsultants || []).map(a => a.consultantId)).size}
            </p>
            <p className="text-xs text-gray-400">Consultants Assigned</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // FINANCIAL OVERVIEW SECTION (Portfolio Dashboard)
  const FinancialOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* Portfolio Value 2026 (Updated) */}
      <Card className="bg-white border-l-4 border-l-purple-500 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Wallet className="w-6 h-6 text-purple-600" />
            </div>
            <span className="font-medium text-gray-600">Portfolio Value 2026</span>
          </div>
          <h3 className="text-3xl font-bold mb-1 text-gray-900">{formatCurrency(portfolioValue2026)}</h3>
          <p className="text-xs text-gray-400">Total value of 2026 projects</p>
        </CardContent>
      </Card>

      {/* Planned Spend (Assignments) */}
      <Card className="bg-white border-l-4 border-l-blue-500 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <span className="font-medium text-gray-600">Planned Spend</span>
          </div>
          <h3 className="text-3xl font-bold mb-1 text-gray-900">{formatCurrency(portfolioMetrics.projectFinancials.reduce((sum, p) => sum + p.totalAssignedValue, 0))}</h3>
          <p className="text-xs text-gray-400">Committed via assignments</p>
        </CardContent>
      </Card>

      {/* Consumed Value (Actuals + Expenses) */}
      <Card className="bg-white border-l-4 border-l-orange-500 shadow-lg">
        <CardContent className="p-6">
           <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
            <span className="font-medium text-gray-600">Consumed Value</span>
          </div>
          <h3 className="text-3xl font-bold mb-1 text-gray-900">{formatCurrency(portfolioMetrics.totalConsumedValue)}</h3>
          <div className="flex items-center gap-2 mt-2">
             <span className="text-xs font-bold text-orange-600">{portfolioMetrics.portfolioProgress.toFixed(1)}%</span>
             <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
               <div className="h-full bg-orange-500" style={{ width: `${Math.min(portfolioMetrics.portfolioProgress, 100)}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

       {/* Remaining Value */}
       <Card className="bg-white border-l-4 border-l-green-500 shadow-lg">
        <CardContent className="p-6">
           <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Briefcase className="w-6 h-6 text-green-600" />
            </div>
            <span className="font-medium text-gray-600">Remaining Budget</span>
          </div>
          <h3 className="text-3xl font-bold mb-1 text-gray-900">{formatCurrency(portfolioMetrics.totalRemainingValue)}</h3>
           <p className="text-xs text-gray-400">Available to spend</p>
        </CardContent>
      </Card>
    </div>
  );

  // Default Dashboard View Table
  const projectList = getProjectsSortedByValue().map(p => ({
    ...p,
    // Enrich with financial hook data for consistent columns
    financials: getProjectFinancials(p.id)
  }));
  
  const sortedProjects = [...projectList].sort((a, b) => {
    const valA = a.financials?.totalValue || 0;
    const valB = b.financials?.totalValue || 0;
    return sortDirection === 'desc' ? valB - valA : valA - valB;
  });

  const toggleSort = () => {
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  return (
    <div className="space-y-6">
      <FinancialOverview />
      
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Project Performance List</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Detailed breakdown by project</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleSort}
            className="flex items-center gap-2"
          >
            <ArrowUpDown className="w-4 h-4" />
            Sort by Value
            {sortDirection === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr className="text-xs text-gray-500 font-medium border-b border-gray-100">
                  <th className="px-6 py-4 text-left uppercase tracking-wider">Project Name</th>
                  <th className="px-6 py-4 text-left uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-center uppercase tracking-wider">Team</th>
                  <th className="px-6 py-4 text-right uppercase tracking-wider">Planned Spend</th>
                  <th className="px-6 py-4 text-right uppercase tracking-wider">Consumed (Labor+Exp)</th>
                  <th className="px-6 py-4 text-center uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedProjects.map((proj) => {
                  // Safe access for table row progress
                  const rowProgress = proj.financials?.progressPercentage || 0;
                  
                  return (
                    <motion.tr 
                      key={proj.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileHover={{ backgroundColor: "rgba(249, 250, 251, 0.5)" }}
                      className="group transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{proj.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={
                          proj.status === 'Completed' ? 'success' : 
                          proj.status === 'In Progress' ? 'default' : 'secondary'
                        } className={`
                          ${proj.status === 'Completed' ? 'bg-green-100 text-green-700' : ''}
                          ${proj.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : ''}
                        `}>
                          {proj.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 w-48">
                        <div className="flex items-center gap-3">
                          <Progress value={rowProgress} className="h-2 w-24" />
                          <span className="text-sm font-medium text-gray-700">
                              {rowProgress.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">
                              {new Set((proj.assignedConsultants || []).map(a => a.consultantId)).size}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-gray-700">
                            {formatCurrency(proj.financials?.totalAssignedValue || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-green-600">
                          {formatCurrency(proj.financials?.consumedValue || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sei sicuro di voler cancellare questo progetto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Questa azione non può essere annullata. Il progetto "{proj.name}" verrà rimosso permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteProject(proj.id)}
                                className="bg-red-600 hover:bg-red-700 text-white border-none"
                              >
                                Cancella
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectStats;