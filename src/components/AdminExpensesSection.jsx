import React from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import ProjectExpensesGroupedView from './ProjectExpensesGroupedView';
import AllExpensesListView from './AllExpensesListView';
import AddOtherCostsForm from './AddOtherCostsForm';
import AddSubcontractsForm from './AddSubcontractsForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Briefcase, Calculator, PlusCircle } from 'lucide-react';

const AdminExpensesSection = () => {
  const { getAllExpenses, subcontracts, otherCosts } = useExpenses();
  const { getPortfolioMetrics, formatCurrency } = useProjectFinancials();
  
  const expenses = getAllExpenses();
  const portfolioMetrics = getPortfolioMetrics();
  
  const totalSubcontractsActual = (subcontracts || []).reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
  
  const totalConsultants = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  const totalOtherCosts = (otherCosts || []).reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
  const totalActuals = totalConsultants + totalOtherCosts;
  
  const totalLabor = portfolioMetrics.projectFinancials.reduce((sum, p) => sum + p.laborConsumed, 0);
  const grandTotalActual = totalActuals + totalSubcontractsActual + totalLabor;
  const totalExpensesOnly = totalActuals + totalSubcontractsActual;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Expenses Overview</h2>
          <p className="text-gray-500">Manage and track all project-related costs.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-white to-green-50 border-green-100 shadow-sm md:col-span-2 lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Actual Cost</p>
                <h3 className="text-xl font-bold text-gray-900">{formatCurrency(grandTotalActual)}</h3>
                <p className="text-[10px] text-gray-400">All Project Costs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Calculator className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Labor Cost</p>
                <h3 className="text-lg font-bold text-gray-900">{formatCurrency(totalLabor)}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Briefcase className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Subcontracts (Act)</p>
                <h3 className="text-lg font-bold text-gray-900">{formatCurrency(totalSubcontractsActual)}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Other Costs (Act)</p>
                <h3 className="text-lg font-bold text-gray-900">{formatCurrency(totalActuals)}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border flex justify-between items-center">
         <div>
            <h4 className="font-semibold text-gray-700">Total Non-Labor Actual Expenses</h4>
            <p className="text-sm text-gray-500">Sum of Subcontracts and Actual Expenses</p>
         </div>
         <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpensesOnly)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border shadow-sm p-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-amber-600" /> Quick Add Other Cost (Actual)
              </h3>
              <AddOtherCostsForm />
          </div>
          <div className="bg-white rounded-lg border shadow-sm p-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-purple-600" /> Quick Add Subcontract (Actual)
              </h3>
              <AddSubcontractsForm />
          </div>
      </div>

      <Tabs defaultValue="grouped" className="w-full">
        <TabsList className="bg-gray-100 p-1 w-full sm:w-auto flex">
          <TabsTrigger value="grouped" className="flex-1 sm:w-[200px]">Project Breakdown</TabsTrigger>
          <TabsTrigger value="all" className="flex-1 sm:w-[200px]">All Expenses List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grouped" className="mt-6 animate-in fade-in-50">
          <ProjectExpensesGroupedView />
        </TabsContent>

        <TabsContent value="all" className="mt-6 animate-in fade-in-50">
          <AllExpensesListView />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default AdminExpensesSection;