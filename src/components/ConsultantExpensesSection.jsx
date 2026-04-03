import React, { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Wallet, ListChecks, Plus, Briefcase, CreditCard, TrendingUp, Users } from 'lucide-react';

const ConsultantExpensesSection = () => {
  const { user } = useAuth();
  const { getConsultantExpenseStats } = useExpenses();
  const { projects } = useTimesheet();
  const { getProjectFinancials, formatCurrency } = useProjectFinancials();
  
  // Get projects assigned to this consultant
  // Moved useMemo before the conditional return to comply with React Hook rules
  const assignedProjects = useMemo(() => {
     if (!user) return [];
     return projects.filter(p => 
        (p.assignedConsultants || []).some(a => a.consultantId === user.id)
     ).map(p => getProjectFinancials(p.id)).filter(Boolean);
  }, [projects, user, getProjectFinancials]);

  if (!user) return null;

  const stats = getConsultantExpenseStats(user.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-full">
            <Wallet className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Totale Rimborsi</p>
            <h3 className="text-2xl font-bold text-gray-900">€ {stats.totalAmount.toFixed(2)}</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <ListChecks className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Numero Spese</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.count}</h3>
          </div>
        </div>
      </div>

      {assignedProjects.length > 0 && (
         <div className="space-y-4">
             <h3 className="font-bold text-gray-800 text-lg">Assigned Project Financials</h3>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                 {assignedProjects.map(proj => (
                    <Card key={proj.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold text-gray-900">{proj.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 flex items-center gap-1"><CreditCard className="w-3 h-3"/> Other Costs (Pln)</p>
                                    <p className="font-bold text-amber-700">{formatCurrency(proj.expensesBudget)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Other Costs (Act)</p>
                                    <p className="font-bold text-amber-600">{formatCurrency(proj.expensesConsumed)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 flex items-center gap-1"><Briefcase className="w-3 h-3"/> Subcontracts (Pln)</p>
                                    <p className="font-bold text-purple-700">{formatCurrency(proj.subcontractsBudget)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3"/> Subcontracts (Act)</p>
                                    <p className="font-bold text-purple-600">{formatCurrency(proj.subcontractsConsumed)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                 ))}
             </div>
         </div>
      )}

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Le Mie Spese
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Carica Spesa
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-4">
          <ExpenseList />
        </TabsContent>
        
        <TabsContent value="add" className="mt-4">
          <ExpenseForm />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default ConsultantExpensesSection;