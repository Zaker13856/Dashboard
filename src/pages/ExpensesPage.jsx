import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, Plane, Receipt, Euro, Trash2, Layers, MapPin, FileText, FileSpreadsheet, PlusCircle, Briefcase, UserCog, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';

const fmt = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const TYPE_CONFIG = {
  travel:        { label: 'Travel',      color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: Plane },
  other_cost:    { label: 'Other Cost',  color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Receipt },
  subcontract:   { label: 'Subcontract', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: FileText },
  third_parties: { label: '3rd Parties', color: 'bg-pink-100 text-pink-700 border-pink-200',     icon: Users },
};

// ─── Quick Add Form ──────────────────────────────────────────
const QuickAddForm = ({ projects, type, onSaved }) => {
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ project_id: '', date: today, description: '', amount: '', place: '', invoice_ref: '', provider: '', iva: '', eligible_amount: '' });
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.project_id || !form.amount || !form.description) {
      toast({ title: 'Campi obbligatori', description: 'Progetto, descrizione e importo sono richiesti.', variant: 'destructive' });
      return;
    }
    const amt  = parseFloat(form.amount) || 0;
    const iva  = parseFloat(form.iva) || null;
    const elig = form.eligible_amount ? parseFloat(form.eligible_amount) : (iva != null ? Math.round((amt - iva) * 100) / 100 : amt);

    const record = {
      project_id:      form.project_id,
      type,
      date:            form.date || null,
      description:     ((type === 'subcontract' || type === 'third_parties') && form.provider) ? `${form.provider}: ${form.description}` : form.description,
      amount:          amt,
      place:           type === 'travel' ? (form.place || null) : null,
      invoice_ref:     form.invoice_ref || null,
      iva:             iva,
      eligible_amount: elig,
    };

    const { error } = await supabase.from('expenses').insert(record);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Spesa registrata' });
    setForm({ project_id: form.project_id, date: today, description: '', amount: '', place: '', invoice_ref: '', provider: '', iva: '', eligible_amount: '' });
    window.dispatchEvent(new CustomEvent('expenses:updated'));
    onSaved();
  };

  const labels = {
    travel:        { title: 'Travel',      color: 'bg-blue-600 hover:bg-blue-700' },
    other_cost:    { title: 'Other Cost',  color: 'bg-amber-600 hover:bg-amber-700' },
    subcontract:   { title: 'Subcontract', color: 'bg-purple-600 hover:bg-purple-700' },
    third_parties: { title: '3rd Parties', color: 'bg-pink-600 hover:bg-pink-700' },
  };
  const cfg = labels[type];

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs font-semibold text-gray-500">Progetto *</Label>
        <Select value={form.project_id} onValueChange={v => f('project_id', v)}>
          <SelectTrigger><SelectValue placeholder="Seleziona progetto" /></SelectTrigger>
          <SelectContent>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-gray-500">Data</Label>
          <Input type="date" value={form.date} onChange={e => f('date', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-gray-500">Importo € *</Label>
          <Input type="number" step="0.01" placeholder="0.00" className="font-bold" value={form.amount} onChange={e => f('amount', e.target.value)} required />
        </div>
      </div>

      {type === 'travel' && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-gray-500">Luogo</Label>
          <Input placeholder="es. Dublino, Bruxelles..." value={form.place} onChange={e => f('place', e.target.value)} />
        </div>
      )}

      {(type === 'subcontract' || type === 'third_parties') && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-gray-500">Fornitore *</Label>
          <Input placeholder="es. Acme Corp, Mario Rossi..." value={form.provider} onChange={e => f('provider', e.target.value)} required />
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs font-semibold text-gray-500">Descrizione *</Label>
        <Input placeholder={type === 'travel' ? "es. Missione WP3 meeting" : type === 'subcontract' ? "es. Consulenza legale" : type === 'third_parties' ? "es. Prestazione terza parte" : "es. Licenza software, hosting..."} value={form.description} onChange={e => f('description', e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-gray-500">IVA €</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={form.iva} onChange={e => f('iva', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-gray-500">Rif. Fattura</Label>
          <Input placeholder="es. fatt. 123/2026" value={form.invoice_ref} onChange={e => f('invoice_ref', e.target.value)} />
        </div>
      </div>

      <Button type="submit" className={cn("w-full text-white", cfg.color)}>
        Registra {cfg.title}
      </Button>
    </form>
  );
};

// ─── Main Page ───────────────────────────────────────────────
const ExpensesPage = () => {
  const [expenses,  setExpenses]  = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchAll = useCallback(async () => {
    const [{ data: exp }, { data: prj }] = await Promise.all([
      supabase.from('expenses').select('*, consultant:consultants(name)').order('date', { ascending: false }),
      supabase.from('projects').select('id, name').order('name'),
    ]);
    setExpenses(exp || []);
    setProjects(prj || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
    const t = { travel: 0, other: 0, subcontract: 0, third_parties: 0 };
    filtered.forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      if (e.type === 'travel')             t.travel        += amt;
      else if (e.type === 'subcontract')   t.subcontract   += amt;
      else if (e.type === 'third_parties') t.third_parties += amt;
      else                                 t.other         += amt;
    });
    return t;
  }, [filtered]);

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa spesa?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      window.dispatchEvent(new CustomEvent('expenses:updated'));
    }
  };

  const handleChangeType = async (id, newType) => {
    const { error } = await supabase.from('expenses').update({ type: newType }).eq('id', id);
    if (error) { alert('Errore aggiornamento tipo: ' + error.message); return; }
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, type: newType } : e));
    // Notifica ProjectManagement di ricaricare i "Fatti"
    window.dispatchEvent(new CustomEvent('expenses:updated'));
  };

  const exportToXLS = (projectName, items) => {
    const header = ['Data', 'Luogo', 'Descrizione', 'Tipo', 'Consulente', 'Importo €', 'IVA €', 'Ammissibile €'];
    const rows = items.map(e => [
      e.date_label || (e.date ? new Date(e.date).toLocaleDateString('it-IT') : ''),
      e.place || '',
      e.description || '',
      (TYPE_CONFIG[e.type] || {}).label || e.type,
      e.consultant?.name || e.consultant_name || '',
      parseFloat(e.amount) || 0,
      parseFloat(e.iva) || 0,
      parseFloat(e.eligible_amount) || 0,
    ]);
    // Riga totale
    const totAmt  = items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totIva  = items.reduce((s, e) => s + (parseFloat(e.iva) || 0), 0);
    const totElig = items
      .filter(e => e.type === 'travel' || e.type === 'other_cost')
      .reduce((s, e) => s + (parseFloat(e.eligible_amount) || 0), 0);
    rows.push(['TOTALE', '', '', '', '', totAmt, totIva, totElig]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    // Larghezze colonne
    ws['!cols'] = [
      { wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 12 },
      { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
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
            { label: 'Travel',      value: totals.travel,        icon: Plane,    color: 'bg-blue-50 text-blue-700' },
            { label: 'Other Cost',  value: totals.other,         icon: Receipt,  color: 'bg-amber-50 text-amber-700' },
            { label: 'Subcontract', value: totals.subcontract,   icon: FileText, color: 'bg-purple-50 text-purple-700' },
            { label: '3rd Parties', value: totals.third_parties, icon: Users,    color: 'bg-pink-50 text-pink-700' },
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

        {/* Aggiungi spesa */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <PlusCircle className="w-5 h-5 text-gray-600" />
              <h3 className="font-bold text-gray-900">Aggiungi Spesa</h3>
            </div>
            <Tabs defaultValue="travel" className="w-full">
              <TabsList className="bg-gray-100 p-1 w-full sm:w-auto">
                <TabsTrigger value="travel" className="flex-1 gap-1"><Plane className="w-3 h-3" />Travel</TabsTrigger>
                <TabsTrigger value="other_cost" className="flex-1 gap-1"><Receipt className="w-3 h-3" />Other Cost</TabsTrigger>
                <TabsTrigger value="subcontract" className="flex-1 gap-1"><Briefcase className="w-3 h-3" />Subcontract</TabsTrigger>
                <TabsTrigger value="third_parties" className="flex-1 gap-1"><Users className="w-3 h-3" />3rd Parties</TabsTrigger>
              </TabsList>
              <TabsContent value="travel" className="mt-4">
                <QuickAddForm projects={projects} type="travel" onSaved={fetchAll} />
              </TabsContent>
              <TabsContent value="other_cost" className="mt-4">
                <QuickAddForm projects={projects} type="other_cost" onSaved={fetchAll} />
              </TabsContent>
              <TabsContent value="subcontract" className="mt-4">
                <QuickAddForm projects={projects} type="subcontract" onSaved={fetchAll} />
              </TabsContent>
              <TabsContent value="third_parties" className="mt-4">
                <QuickAddForm projects={projects} type="third_parties" onSaved={fetchAll} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

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
              <SelectItem value="third_parties">3rd Parties</SelectItem>
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
          <Accordion type="multiple" className="space-y-3">
            {grouped.map(group => {
              const sumByType = t => group.items.filter(e => e.type === t).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
              const gTravel   = sumByType('travel');
              const gOther    = sumByType('other_cost');
              const gSub      = sumByType('subcontract');
              const gThird    = sumByType('third_parties');
              const gEligible = group.items
                .filter(e => e.type === 'travel' || e.type === 'other_cost')
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
                      <div className="flex items-center gap-4 text-xs">
                        {gTravel > 0 && <span className="text-blue-600 font-semibold">Travel: € {fmt(gTravel)}</span>}
                        {gOther  > 0 && <span className="text-amber-600 font-semibold">Other: € {fmt(gOther)}</span>}
                        {gSub    > 0 && <span className="text-purple-600 font-semibold">Sub: € {fmt(gSub)}</span>}
                        {gThird  > 0 && <span className="text-pink-600 font-semibold">3rd: € {fmt(gThird)}</span>}
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
                            <th className="px-3 py-2 text-left font-medium">Consulente</th>
                            <th className="px-3 py-2 text-right font-medium">Importo €</th>
                            <th className="px-3 py-2 text-right font-medium">IVA €</th>
                            <th className="px-3 py-2 text-right font-medium">Ammissibile €</th>
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
                                  <Select value={e.type} onValueChange={(v) => handleChangeType(e.id, v)}>
                                    <SelectTrigger
                                      className={cn(
                                        "h-6 px-2 py-0 text-[10px] font-medium border rounded-full w-auto gap-1 [&>svg]:h-3 [&>svg]:w-3",
                                        cfg.color
                                      )}
                                      title="Clicca per cambiare tipo"
                                    >
                                      <SelectValue>{cfg.label}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="travel">Travel</SelectItem>
                                      <SelectItem value="other_cost">Other Cost</SelectItem>
                                      <SelectItem value="subcontract">Subcontract</SelectItem>
                                      <SelectItem value="third_parties">3rd Parties</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-3 py-2 text-gray-700 text-[11px]">
                                  {e.consultant?.name || e.consultant_name || '—'}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(e.amount)}</td>
                                <td className="px-3 py-2 text-right text-red-600">
                                  {e.iva ? fmt(e.iva) : '—'}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-green-700">
                                  {e.eligible_amount ? fmt(e.eligible_amount) : '—'}
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
                            <td colSpan={5} className="px-3 py-2 text-gray-700 uppercase tracking-wide">Totale {group.name}</td>
                            <td className="px-3 py-2 text-right text-gray-900">
                              {fmt(group.items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0))}
                            </td>
                            <td className="px-3 py-2 text-right text-red-600">
                              {fmt(group.items.reduce((s, e) => s + (parseFloat(e.iva) || 0), 0))}
                            </td>
                            <td className="px-3 py-2 text-right text-green-700">
                              {fmt(gEligible)}
                            </td>
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
        )}
      </div>
    </AdminLayout>
  );
};

export default ExpensesPage;
