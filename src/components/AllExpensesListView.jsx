import React, { useState } from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const AllExpensesListView = () => {
  const { getUnifiedExpenses, deleteExpense, deleteSubcontract, deleteOtherCost, removePlannedExpense } = useExpenses();
  const { projects } = useTimesheet();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const allExpenses = getUnifiedExpenses();

  const getProjectName = (pid) => {
    const p = projects.find(prj => prj.id === pid);
    return p ? p.name : 'Unknown Project';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getCategoryColor = (cat) => {
    switch(cat) {
      case 'Consultant': return 'bg-amber-100 text-amber-800 border-amber-200'; // Actuals mapped to amber in GroupedView
      case 'Planned Expense': return 'bg-blue-100 text-blue-800 border-blue-200'; // Planned mapped to blue
      case 'Subcontract': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Other Cost': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper to get display name for category
  const getCategoryDisplayName = (cat) => {
    switch(cat) {
      case 'Planned Expense': return 'Other Costs (Planned)';
      case 'Other Cost': return 'Other Costs (Actuals)';
      case 'Consultant': return 'Consultant Actual';
      default: return cat;
    }
  };

  const handleDelete = (item) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    
    if (item.category === 'Consultant') deleteExpense(item.uniqueId);
    if (item.category === 'Subcontract') deleteSubcontract(item.uniqueId);
    if (item.category === 'Other Cost') deleteOtherCost(item.uniqueId);
    if (item.category === 'Planned Expense') removePlannedExpense(item.uniqueId);
  };

  const filteredExpenses = allExpenses.filter(item => {
    const matchesSearch = 
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (getProjectName(item.projectId).toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by description or project..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
             <Filter className="w-4 h-4 text-gray-500" />
             <Select value={categoryFilter} onValueChange={setCategoryFilter}>
               <SelectTrigger className="w-[200px]">
                 <SelectValue placeholder="Filter Category" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Categories</SelectItem>
                 <SelectItem value="Planned Expense">Other Costs (Planned)</SelectItem>
                 <SelectItem value="Subcontract">Subcontracts</SelectItem>
                 <SelectItem value="Consultant">Consultant Actuals</SelectItem>
                 <SelectItem value="Other Cost">Other Costs (Actuals)</SelectItem>
               </SelectContent>
             </Select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Consulente</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((item) => (
                  <TableRow key={item.uniqueId} className="hover:bg-gray-50/50">
                    <TableCell className="text-gray-500 text-sm">
                      {item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {item.project_name || getProjectName(item.projectId || item.project_id)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-normal ${getCategoryColor(item.category)}`}>
                        {getCategoryDisplayName(item.category)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-700 text-sm">
                      {item.consultant_name || '—'}
                    </TableCell>
                    <TableCell className="text-gray-700 max-w-[300px] truncate" title={item.description}>
                      {item.description}
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>
                       <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-400 hover:text-red-600"
                          onClick={() => handleDelete(item)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                    No expenses found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AllExpensesListView;