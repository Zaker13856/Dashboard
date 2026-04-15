import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, Plane, Receipt, Euro, Trash2, Layers, MapPin, FileText, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

const fmt = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const TYPE_CONFIG = {
  travel:      { label: 'Travel',     color: 'bg-blue-100 text-blue-700 border-blue-200',   icon: Plane },
  other_cost:  { label: 'Other Cost', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Receipt },
  subcontract: { label: 'Subcontract', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: FileText },
};

const ExpensesPage = () => {
  const [expenses,  setExpenses]  = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: exp }, { data: prj }] = await Promise.all([
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('projects').select('id, name'),
      ]);
      setExpenses(exp || []);
      setProjects(prj || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const projectMap = useMemo(() => {
    const m = {};
    projects.forEach(p => { m[p.id] = p.name; });
    return m;
  }, [projects]);

  // Filter
  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const pName = (projectMap[e.project_id] || '').toLowerCase();
        const desc  = (e.description || '').toLowerCase();
        const place = (e.place || '').toLowerCase();
        if (!pName.includes(s) && !desc.includes(s) && !place.includes(s)) return false;
      }
      return true;
    });
  }, [expenses, typeFilter, search, projectMap]);

  // Group by project
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const pid = e.project_id;
      if (!map[pid]) map[pid] = { name: projectMap[pid] || 'Sconosciuto', items: [] };
      map[pid].items.push(e);
    });
    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, projectMap]);

  // Totali globali
  const totals = useMemo(() => {
    const t = { travel: 0, other: 0, iva: 0, eligible: 0 };
    filtered.forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      const iva = parseFloat(e.iva) || 0;
      const elig = parseFloat(e.eligible_amount) || 0;
      if (e.type === 'travel') t.travel += amt;
      else t.other += amt;
      t.iva += iva;
      t.eligible += elig;
    });
    return t;
  }, [filtered]);

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa spesa?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const exportToXLS = (projectName, items) => {
    const header = ['Data', 'Luogo', 'Descrizione', 'Tipo', 'Importo €', 'IVA €', 'Ammissibile €', 'Fattura', 'Pagato il'];
    const rows = items.map(e => [
      e.date_label || (e.date ? new Date(e.date).toLocaleDateString('it-IT') : ''),
      e.place || '',
      e.description || '',
      (TYPE_CONFIG[e.type] || {}).label || e.type,
      parseFloat(e.amount) || 0,
      parseFloat(e.iva) || 0,
      parseFloat(e.eligible_amount) || 0,
      e.invoice_ref || '',
      e.payment_date ? new Date(e.payment_date).toLocaleDateString('it-IT') : '',
    ]);
    // Riga totale
    const totAmt  = items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totIva  = items.reduce((s, e) => s + (parseFloat(e.iva) || 0), 0);
    const totElig = items.reduce((s, e) => s + (parseFloat(e.eligible_amount) || 0), 0);
    rows.push(['TOTALE', '', '', '', totAmt, totIva, totElig, '', '']);

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    // Larghezze colonne
    ws['!cols'] = [
      { wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Spese');
    XLSX.writeFile(wb, `Spese_${projectName.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Spese di Progetto</h1>
          <p className="text-gray-500 mt-1">Travel, costi, IVA e ammissibilità per progetto</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Travel',     value: totals.travel,   icon: Plane,   color: 'bg-blue-50 text-blue-700' },
            { label: 'Other Cost', value: totals.other,    icon: Receipt, color: 'bg-amber-50 text-amber-700' },
            { label: 'IVA (non amm.)', value: totals.iva,  icon: Euro,    color: 'bg-red-50 text-red-600' },
            { label: 'Tot. Ammissibile', value: totals.eligible, icon: Euro, color: 'bg-green-50 text-green-700' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-gray-100 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="text-lg font-bold text-gray-900">€ {fmt(value)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtri */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cerca per progetto, descrizione o luogo..."
              className="pl-8 text-gray-900"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tutti i tipi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="other_cost">Other Cost</SelectItem>
              <SelectItem value="subcontract">Subcontract</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} record</span>
        </div>

        {/* Tabella per progetto */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Caricamento...</div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
            Nessuna spesa trovata.
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={grouped.map(g => g.id)} className="space-y-3">
            {grouped.map(group => {
              const gTravel   = group.items.filter(e => e.type === 'travel').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
              const gOther    = group.items.filter(e => e.type !== 'travel').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
              const gEligible = group.items.reduce((s, e) => s + (parseFloat(e.eligible_amount) || 0), 0);

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
                      <div className="flex items-center gap-4 text-xs">
                        {gTravel > 0 && <span className="text-blue-600 font-semibold">Travel: € {fmt(gTravel)}</span>}
                        {gOther > 0 && <span className="text-amber-600 font-semibold">Other: € {fmt(gOther)}</span>}
                        <span className="text-green-700 font-bold">Amm: € {fmt(gEligible)}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <div className="flex justify-end px-5 -mt-2 mb-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs text-gray-600 border-gray-200 hover:bg-gray-50"
                      onClick={(e) => { e.stopPropagation(); exportToXLS(group.name, group.items); }}
                    >
                      <FileSpreadsheet className="w-3 h-3 mr-1" />Excel
                    </Button>
                  </div>
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
                            <th className="px-3 py-2 text-left font-medium">Fattura</th>
                            <th className="px-3 py-2 text-left font-medium">Pagato il</th>
                            <th className="px-3 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {group.items.map(e => {
                            const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.other_cost;
                            return (
                              <tr key={e.id} className="hover:bg-gray-50/50 group">
                                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                  {e.date_label || (e.date ? new Date(e.date).toLocaleDateString('it-IT') : '—')}
                                </td>
                                <td className="px-3 py-2 text-gray-700">
                                  {e.place ? (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-gray-400" />
                                      {e.place}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-3 py-2 text-gray-900 font-medium max-w-[200px] truncate" title={e.description}>
                                  {e.description}
                                </td>
                                <td className="px-3 py-2">
                                  <Badge variant="outline" className={cn("text-[10px] font-medium", cfg.color)}>
                                    {cfg.label}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(e.amount)}</td>
                                <td className="px-3 py-2 text-right text-red-600">
                                  {e.iva ? fmt(e.iva) : '—'}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-green-700">
                                  {e.eligible_amount ? fmt(e.eligible_amount) : '—'}
                                </td>
                                <td className="px-3 py-2 text-gray-500 text-[11px]">
                                  {e.invoice_ref || '—'}
                                </td>
                                <td className="px-3 py-2 text-gray-500 text-[11px] whitespace-nowrap">
                                  {e.payment_date ? new Date(e.payment_date).toLocaleDateString('it-IT') : '—'}
                                </td>
                                <td className="px-3 py-1">
                                  <button
                                    onClick={() => handleDelete(e.id)}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1 rounded"
                                    title="Elimina"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Totale progetto */}
                        <tfoot>
                          <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold text-xs">
                            <td colSpan={4} className="px-3 py-2 text-gray-700 uppercase tracking-wide">Totale {group.name}</td>
                            <td className="px-3 py-2 text-right text-gray-900">
                              {fmt(group.items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0))}
                            </td>
                            <td className="px-3 py-2 text-right text-red-600">
                              {fmt(group.items.reduce((s, e) => s + (parseFloat(e.iva) || 0), 0))}
                            </td>
                            <td className="px-3 py-2 text-right text-green-700">
                              {fmt(gEligible)}
                            </td>
                            <td colSpan={3}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </AdminLayout>
  );
};

export default ExpensesPage;
