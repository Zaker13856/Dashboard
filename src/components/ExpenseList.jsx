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
import { Trash2, FileText, Layers, Plane, Receipt, MapPin, Briefcase, Users, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const fmt = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const TYPE_CONFIG = {
  travel:        { label: 'Travel',      color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: Plane },
  other_cost:    { label: 'Other Cost',  color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Receipt },
  subcontract:   { label: 'Subcontract', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: FileText },
  third_parties: { label: '3rd Parties', color: 'bg-pink-100 text-pink-700 border-pink-200',     icon: Users },
};

const ExpenseList = () => {
  const { user } = useAuth();
  const { getExpensesByConsultant, getExpensesByProjectId, getAllExpenses, deleteExpense, loading } = useExpenses();
  const { projects } = useTimesheet();
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  // Project IDs dove il consulente ha spese proprie
  const myProjectIds = useMemo(() => {
    if (!user) return new Set();
    return new Set(getExpensesByConsultant(user.id).map(e => e.project_id).filter(Boolean));
  }, [getExpensesByConsultant, user]);

  // Tutte le spese di quei progetti (tutti i consulenti + admin)
  const grouped = useMemo(() => {
    if (!user || myProjectIds.size === 0) return [];
    const all = getAllExpenses();
    const map = {};
    all
      .filter(e => myProjectIds.has(e.project_id))
      .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
      .forEach(e => {
        const pid = e.project_id;
        const name = e.project_name || (projects || []).find(p => p.id === pid)?.name || 'Sconosciuto';
        if (!map[pid]) map[pid] = { name, items: [] };
        map[pid].items.push({ ...e, expenseType: e.type, expenseDate: e.date, amount: parseFloat(e.amount) || 0 });
      });
    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [getAllExpenses, myProjectIds, projects, user]);

  const handleDelete = (id) => {
    deleteExpense(id);
    setExpenseToDelete(null);
  };

  const exportToXLS = (items, projectName) => {
    if (!items || items.length === 0) return;
    const rows = items.map(e => {
      const t = e.expenseType || e.type;
      const cfg = TYPE_CONFIG[t] || TYPE_CONFIG.other_cost;
      let dataStr = e.date_label || '';
      if (!dataStr && e.expenseDate) {
        try { dataStr = format(new Date(e.expenseDate), 'dd/MM/yyyy'); } catch { dataStr = ''; }
      }
      return {
        'Data': dataStr,
        'Luogo': e.place || '',
        'Descrizione': e.description || '',
        'Tipo': cfg.label,
        'Importo €': parseFloat(e.amount) || 0,
        'IVA €': parseFloat(e.iva) || 0,
        'Eleggibile €': parseFloat(e.eligible_amount) || 0,
        'Fattura': e.invoice_ref || '',
        'Pagato il': e.payment_date ? (() => { try { return format(new Date(e.payment_date), 'dd/MM/yyyy'); } catch { return ''; } })() : '',
      };
    });
    // Totale row
    rows.push({
      'Data': 'TOTALE',
      'Luogo': '',
      'Descrizione': '',
      'Tipo': '',
      'Importo €': items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
      'IVA €': items.reduce((s, e) => s + (parseFloat(e.iva) || 0), 0),
      'Eleggibile €': items.reduce((s, e) => s + (parseFloat(e.eligible_amount) || 0), 0),
      'Fattura': '',
      'Pagato il': '',
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const safeName = (projectName || 'Spese').replace(/[\\/\?\*\[\]:]/g, '').substring(0, 28);
    XLSX.utils.book_append_sheet(wb, ws, safeName || 'Spese');
    const stamp = format(new Date(), 'yyyyMMdd');
    XLSX.writeFile(wb, `Spese_${safeName}_${stamp}.xlsx`);
  };

  if (loading) return <div className="p-4 text-center">Loading expenses...</div>;

  if (grouped.length === 0) {
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
        const proj = (projects || []).find(p => p.id === group.id);
        const soldTravel = parseFloat(proj?.sold_travel) || 0;
        const soldOther  = parseFloat(proj?.sold_other_costs) || 0;
        // Budget totale progetto (tutti i consulenti)
        const allProjExpenses = getExpensesByProjectId(group.id);
        const totalEligByType = t => allProjExpenses.filter(e => (e.expenseType || e.type) === t).reduce((s, e) => s + (parseFloat(e.eligible_amount) || 0), 0);
        const travelElig = totalEligByType('travel');
        const otherElig  = totalEligByType('other_cost');
        const gSub   = group.items.filter(e => (e.expenseType || e.type) === 'subcontract').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const gThird = group.items.filter(e => (e.expenseType || e.type) === 'third_parties').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const gEligible = travelElig + otherElig;
        const travelOver = soldTravel > 0 && travelElig > soldTravel;
        const otherOver  = soldOther  > 0 && otherElig  > soldOther;

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
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={cn("font-semibold", travelOver ? "text-red-600" : "text-blue-600")}>
                      Travel eleg: € {fmt(travelElig)}{soldTravel > 0 ? ` / € ${fmt(soldTravel)}` : ''} <span className="text-gray-400 font-normal">(tot. progetto)</span>
                    </span>
                    <span className={cn("font-semibold", otherOver ? "text-red-600" : "text-amber-600")}>
                      Other eleg: € {fmt(otherElig)}{soldOther > 0 ? ` / € ${fmt(soldOther)}` : ''} <span className="text-gray-400 font-normal">(tot. progetto)</span>
                    </span>
                  </div>
                  {gSub   > 0 && <span className="text-purple-600 font-semibold">Sub: € {fmt(gSub)}</span>}
                  {gThird > 0 && <span className="text-pink-600 font-semibold">3rd: € {fmt(gThird)}</span>}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(ev) => { ev.stopPropagation(); exportToXLS(group.items, group.name); }}
                    onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.stopPropagation(); exportToXLS(group.items, group.name); } }}
                    className="inline-flex items-center gap-1 text-green-700 hover:text-green-800 hover:bg-green-50 border border-green-200 rounded px-2 py-1 text-[11px] font-medium cursor-pointer"
                    title="Esporta in Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Excel
                  </span>
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
                      <th className="px-3 py-2 text-right font-medium">Eleggibile €</th>
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
                            {e.consultant_id === user?.id && (
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
                            )}
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
