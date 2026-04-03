import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useExpenses } from '@/context/ExpenseContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
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
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, FileText, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

const ExpenseList = () => {
  const { user } = useAuth();
  const { getExpensesByConsultant, deleteExpense, loading } = useExpenses();
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  if (loading) {
    return <div className="p-4 text-center">Loading expenses...</div>;
  }

  // Strictly filter by current user's ID
  const expenses = user ? getExpensesByConsultant(user.id).sort((a, b) => 
    new Date(b.expenseDate) - new Date(a.expenseDate)
  ) : [];

  const handleDelete = (id) => {
    deleteExpense(id);
    setExpenseToDelete(null);
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  if (expenses.length === 0) {
    return (
      <Card className="bg-gray-50 border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-10 text-gray-500">
          <FileText className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-medium">Nessuna spesa registrata</p>
          <p className="text-sm">Utilizza il modulo per caricare le tue spese di trasferta.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[120px]">Data</TableHead>
                <TableHead>Progetto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead className="w-[80px] text-center">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-medium">
                    {(() => {
                        try {
                            return format(new Date(expense.expenseDate), 'dd/MM/yyyy');
                        } catch (e) {
                            return 'Data Errata';
                        }
                    })()}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {expense.projectName}
                    </span>
                  </TableCell>
                  <TableCell>{expense.expenseType}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-gray-500" title={expense.description}>
                    {expense.description || '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-gray-900">
                    € {parseFloat(expense.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <AlertDialog open={expenseToDelete === expense.id} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setExpenseToDelete(expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Questa azione non può essere annullata. La spesa verrà rimossa permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(expense.id)} className="bg-red-600 hover:bg-red-700">
                            Elimina Spesa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="bg-purple-50 px-6 py-3 rounded-lg border border-purple-100 flex items-center gap-4">
          <span className="text-purple-700 font-medium">Totale Spese:</span>
          <span className="text-2xl font-bold text-purple-900">€ {totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default ExpenseList;