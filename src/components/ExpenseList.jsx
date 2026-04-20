import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useTimesheet } from '@/context/TimesheetContext';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Trash2, FileText, Layers, Plane, Receipt, MapPin, Briefcase, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const fmt = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const TYPE_CONFIG = {
  travel:        { label: 'Travel',      color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: Plane },
  other_cost:    { label: 'Other Cost',  color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Receipt },
  subcontract:   { label: 'Subcontract', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: FileText },
  third_parties: { label: '3rd Parties', color: 'bg-pink-100 text-pink-700 border-pink-200',     icon: Users },
};

const ExpenseList = () => {
  const { user } = useAuth();
  const { getExpensesByConsultant, deleteExpense, loading } = useExpenses();
  const { projects } = useTimesheet();
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const projectNameById = useMemo(() => {
    const map = {};
    (projects || []).forEach(p => { map[p.id] = p.name; });
    return map;
  }, [projects]);

  const expenses = user ? getExpensesByConsultant(user.id).sort((a, b) =>
    new Date(b.expenseDate) - new Date(a.expenseDate)
  ) : [];

  const grouped = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const pid = e.project_id;
      const name = e.project_name || projectNameById[pid] || 'Sconosciuto';
      if (!map[pid]) map[pid] = { name, items: [] };
      map[pid].items.push(e);
    });
    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [expenses, projectNameById]);

  const handleDelete = (id) => {
    deleteExpense(id);
    setExpenseToDelete(null);
  };

  if (loading) return <div className="p-4 text-center">Loading expenses...</div>;

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
    <Accordion type="multiple" className="space-y-3">
      {grouped.map(group => {
        const sumByType = t => group.items.filter(e => (e.expenseType || e.type) === t).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const gTravel = sumByType('travel');
        const gOther  = sumByType('other_cost');
        const gSub    = sumByType('subcontract');
        const gThird  = sumByType('third_parties');
        const gEligible = group.items
          .filter(e => { const t = e.expenseType || e.type; return t === 'travel' || t === 'other_cost'; })
          .reduce((s, e) => s + (parseFloat(e.eligible_amount) || 0), 0);

        return (
          <AccordionItem key={group.id} value={group.id} className="border rounded-xl bg-white shadow-sm">
            <AccordionTrigger className="px-5 py-4 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Layers className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">{group.name}</p>
                    <p className="text-xs text-gray-400">{group.items.length} voci</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs flex-wrap justify-end">
                  {gTravel > 0 && <span className="text-blue-600 font-semibold">Travel: € {fmt(gTravel)}</span>}
                  {gOther  > 0 && <span className="text-amber-600 font-semibold">Other: € {fmt(gOther)}</span>}
                  {gSub    > 0 && <span className="text-purple-600 font-semibold">Sub: € {fmt(gSub)}</span>}
                  {gThird  > 0 && <span className="text-pink-600 font-semibold">3rd: € {fmt(gThird)}</span>}
                  {gEligible > 0 && <span className="text-green-700 font-bold">Amm: € {fmt(gEligible)}</span>}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide text-[10px]">
                      <th className="px-3 py-2 text-left font-medium">Data</th>
                      <th className="px-3 py-2 text-left font-medium">Luogo</th>
                      <th className="px-3 py-2 text-left font-medium">Descrizione</th>
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="px-3 py-2 text-right font-medium">Importo €</th>
                      <th className="px-3 py-2 text-right font-medium">IVA €</th>
                      <th className="px-3 py-2 text-right font-medium">Ammissibile €</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.items.map(e => {
                      const t = e.expenseType || e.type;
                      const cfg = TYPE_CONFIG[t] || TYPE_CONFIG.other_cost;
                      return (
                        <tr key={e.id} className="hover:bg-gray-50/50 group">
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                            {e.date_label || (e.expenseDate ? (() => { try { return format(new Date(e.expenseDate), 'dd/MM/yyyy'); } catch { return '—'; } })() : '—')}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {e.place ? (
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" />{e.place}</span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2 text-gray-900 font-medium max-w-[240px] truncate" title={e.description}>
                            {e.description || '—'}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={cn("text-[10px] font-medium", cfg.color)}>
                              {cfg.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(e.amount)}</td>
                          <td className="px-3 py-2 text-right text-red-600">{e.iva ? fmt(e.iva) : '—'}</td>
                          <td className="px-3 py-2 text-right font-semibold text-green-700">{e.eligible_amount ? fmt(e.eligible_amount) : '—'}</td>
                          <td className="px-3 py-1">
                            <AlertDialog open={expenseToDelete === e.id} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => setExpenseToDelete(e.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
                                  <AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-red-600 hover:bg-red-700">
                                    Elimina Spesa
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold text-xs">
                      <td colSpan={4} className="px-3 py-2 text-gray-700 uppercase tracking-wide">Totale {group.name}</td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {fmt(group.items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600">
                        {fmt(group.items.reduce((s, e) => s + (parseFloat(e.iva) || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-green-700">{fmt(gEligible)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

export default ExpenseList;
