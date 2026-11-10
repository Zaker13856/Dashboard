import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Archive, Search, RotateCcw, Briefcase, Calendar, Euro, Gavel, Eye, EyeOff } from 'lucide-react';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { TenderDetail } from '@/pages/TenderManagement';

const fmt = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const fmtDate = d => { try { return new Date(d).toLocaleDateString('it-IT'); } catch { return '—'; } };

const RepositoryPage = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [totalsByProject, setTotalsByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tenders, setTenders] = useState([]);
  const [tenderHours, setTenderHours] = useState({});
  const [openTenderId, setOpenTenderId] = useState(null);

  const fetchArchived = useCallback(async () => {
    const [{ data: prj }, { data: exp }, { data: tnd }, { data: tsh }] = await Promise.all([
      supabase.from('projects').select('*').eq('status', 'archived').order('name'),
      fetchAllRows(() => supabase.from('expenses').select('project_id, tender_id, amount, eligible_amount').order('id')),
      supabase.from('tenders').select('*').eq('status', 'archived').order('name'),
      fetchAllRows(() => supabase.from('timesheets').select('tender_id, hours').not('tender_id', 'is', null).order('id')),
    ]);
    setProjects(prj || []);
    setTenders(tnd || []);
    const th = {};
    (tsh || []).forEach(r => { th[r.tender_id] = (th[r.tender_id] || 0) + (parseFloat(r.hours) || 0); });
    (exp || []).forEach(e => {
      if (!e.tender_id) return;
      th[`exp_${e.tender_id}`] = (th[`exp_${e.tender_id}`] || 0) + (parseFloat(e.amount) || 0);
    });
    setTenderHours(th);
    const totals = {};
    (exp || []).forEach(e => {
      if (!totals[e.project_id]) totals[e.project_id] = { amount: 0, elig: 0 };
      totals[e.project_id].amount += parseFloat(e.amount) || 0;
      totals[e.project_id].elig += parseFloat(e.eligible_amount) || 0;
    });
    setTotalsByProject(totals);
    setLoading(false);
  }, []);

  useEffect(() => { fetchArchived(); }, [fetchArchived]);

  const handleRestore = async (p) => {
    const { error } = await supabase.from('projects').update({ status: 'completed' }).eq('id', p.id);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Progetto ripristinato', description: `${p.name} è tornato nella lista progetti come Completato.` });
    fetchArchived();
  };

  const handleRestoreTender = async (t) => {
    const { error } = await supabase.from('tenders').update({ status: 'active' }).eq('id', t.id);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Tender ripristinato', description: `${t.name} è tornato nella pagina Tender e nell'elenco dei consulenti.` });
    setOpenTenderId(null);
    fetchArchived();
  };

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredTenders = tenders.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Archive className="w-7 h-7 text-gray-500" />
            Repository
          </h1>
          <p className="text-gray-500 mt-1">Progetti archiviati — fuori dalle liste operative ma consultabili</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca progetto archiviato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Caricamento...</div>
        ) : filtered.length === 0 ? (
          <Card className="bg-gray-50 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Archive className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-medium">Nessun progetto archiviato</p>
              <p className="text-sm">Imposta lo status "Archiviato" su un progetto per spostarlo qui.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => {
              const tot = totalsByProject[p.id] || { amount: 0, elig: 0 };
              return (
                <Card key={p.id} className="border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Briefcase className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.client || p.type || '—'}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">Archiviato</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {p.start_date ? fmtDate(p.start_date) : '—'} → {p.end_date ? fmtDate(p.end_date) : '—'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Euro className="w-3.5 h-3.5 text-gray-400" />
                        Valore: € {fmt(p.total_value)}
                      </span>
                      <span>Spese totali: <b>€ {fmt(tot.amount)}</b></span>
                      <span>Eleggibile: <b className="text-green-700">€ {fmt(tot.elig)}</b></span>
                    </div>

                    <div className="pt-2 border-t flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(p)}
                        className="text-xs gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Ripristina
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tender archiviati */}
        {!loading && (
          <div className="space-y-4 pt-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-orange-500" />
              Tender archiviati
            </h2>
            {filteredTenders.length === 0 ? (
              <p className="text-sm text-gray-400">Nessun Tender archiviato. Nella pagina Tender: Modifica → Stato "Archiviato".</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTenders.map(t => (
                  <Card key={t.id} className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-50 rounded-lg">
                            <Gavel className="w-4 h-4 text-orange-500" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{t.name}</p>
                            <p className="text-xs text-gray-400">{t.client || t.type || '—'}</p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">Archiviato</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {t.start_date ? fmtDate(t.start_date) : '—'} → {t.end_date ? fmtDate(t.end_date) : '—'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Euro className="w-3.5 h-3.5 text-gray-400" />
                          Valore: € {fmt(t.total_value)}
                        </span>
                        <span>Ore vere: <b>{fmt(tenderHours[t.id])}</b></span>
                        <span>Spese: <b>€ {fmt(tenderHours[`exp_${t.id}`])}</b></span>
                      </div>
                      <div className="pt-2 border-t flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setOpenTenderId(openTenderId === t.id ? null : t.id)} className="text-xs gap-1.5">
                          {openTenderId === t.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {openTenderId === t.id ? 'Chiudi' : 'Apri'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRestoreTender(t)} className="text-xs gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Ripristina
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {openTenderId && tenders.find(t => t.id === openTenderId) && (
              <TenderDetail key={openTenderId} tender={tenders.find(t => t.id === openTenderId)} readOnly />
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RepositoryPage;
