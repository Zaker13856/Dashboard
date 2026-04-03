import React, { useState, useMemo } from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Filter, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AdminExpensesList = () => {
  const { getUnifiedExpenses } = useExpenses();
  const { consultants } = useAuth();
  const { projects } = useTimesheet();

  const [filterConsultant, setFilterConsultant] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allCosts = getUnifiedExpenses();

  const filteredExpenses = useMemo(() => {
    return allCosts.filter(exp => {
      // Consultant Filter: Only applies if the item has a consultantId
      const matchConsultant = filterConsultant === 'all' || exp.consultantId === filterConsultant;
      const matchProject = filterProject === 'all' || exp.projectId === filterProject;
      
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = 
        (exp.description && exp.description.toLowerCase().includes(searchLower)) ||
        (exp.consultantName && exp.consultantName.toLowerCase().includes(searchLower)) || 
        (exp.category && exp.category.toLowerCase().includes(searchLower));

      return matchConsultant && matchProject && matchSearch;
    }).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }, [allCosts, filterConsultant, filterProject, searchQuery]);

  const totalFilteredAmount = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtra per Consulente
          </label>
          <Select value={filterConsultant} onValueChange={setFilterConsultant}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti i consulenti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i consulenti</SelectItem>
              {consultants.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtra per Progetto
          </label>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti i progetti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i progetti</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-2">
           <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
            <Search className="w-3 h-3" /> Cerca
          </label>
          <Input 
            placeholder="Cerca descrizione, tipo..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Progetto</TableHead>
              <TableHead>Fonte/Consulente</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead className="text-right">Importo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nessuna spesa trovata con i filtri selezionati.
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => {
                 const proj = projects.find(p => p.id === expense.projectId);
                 const projName = proj ? proj.name : 'Unknown';

                 return (
                    <TableRow key={expense.uniqueId}>
                      <TableCell className="font-medium text-xs text-gray-500">
                        {expense.date ? format(new Date(expense.date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {projName}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-700 text-sm">
                        {expense.consultantName || (expense.category === 'Subcontract' ? 'External Vendor' : 'System')}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-gray-500 text-sm" title={expense.description}>
                        {expense.description || '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-gray-900">
                        {new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(expense.amount)}
                      </TableCell>
                    </TableRow>
                 );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
        <span className="text-gray-600">
          Visualizzate <strong>{filteredExpenses.length}</strong> voci di costo
        </span>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 font-medium">Totale Filtrato:</span>
          <span className="text-xl font-bold text-gray-900">
            {new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(totalFilteredAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminExpensesList;