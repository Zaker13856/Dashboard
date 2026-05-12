import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { UserPlus, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import { exportConsultantTimesheet } from '@/lib/timesheetExport';

const MU_HOURS = 143.33;

const STATUS_COLORS = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
};

const EMPTY_ADD_FORM = { name: '', email: '', role: 'consultant', status: 'active' };

const ConsultantsPage = () => {
  const { consultants, rates, addConsultant, updateConsultant, deleteConsultant, upsertRate } = useAuth();
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const [maxProjectYear, setMaxProjectYear] = useState(currentYear);

  useEffect(() => {
    supabase.from('project_periods').select('year').then(({ data }) => {
      if (data && data.length > 0) {
        const max = Math.max(...data.map(r => r.year));
        setMaxProjectYear(max);
      }
    });
  }, []);

  const yearFrom = currentYear - 4;
  const yearTo   = Math.max(maxProjectYear, currentYear);
  const years    = Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => yearFrom + i);

  // ── Dialog state ────────────────────────────────────────────────
  const [addOpen,            setAddOpen]            = useState(false);
  const [editingConsultant,  setEditingConsultant]  = useState(null);
  const [deletingConsultant, setDeletingConsultant] = useState(null);

  const [addForm,  setAddForm]  = useState(EMPTY_ADD_FORM);
  const [editForm, setEditForm] = useState({});

  // ── Cell draft state for inline rate editing ─────────────────────
  // key: `${consultantId}_${year}`  value: { costo_aziendale, ore_max }
  const [cellDraft, setCellDraft] = useState({});

  // ── Helpers ─────────────────────────────────────────────────────
  const getRateForYear = (consultantId, year) =>
    rates.find(r => r.consultant_id === consultantId && r.year === year);

  const getDraft = (consultantId, year) => {
    const key  = `${consultantId}_${year}`;
    const rate = getRateForYear(consultantId, year);
    return cellDraft[key] ?? {
      costo_aziendale: rate?.costo_aziendale ?? '',
      ore_max:         rate?.ore_max         ?? '',
    };
  };

  const updateDraft = (consultantId, year, field, value) => {
    const key = `${consultantId}_${year}`;
    setCellDraft(prev => ({
      ...prev,
      [key]: { ...getDraft(consultantId, year), [field]: value },
    }));
  };

  // ── Handlers ────────────────────────────────────────────────────
  const handleAddSave = async () => {
    if (!addForm.name.trim()) {
      toast({ title: 'Errore', description: 'Il nome è obbligatorio', variant: 'destructive' });
      return;
    }
    const result = await addConsultant(addForm);
    if (result.error) {
      toast({ title: 'Errore', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: `Consulente ${addForm.name} aggiunto` });
    setAddForm(EMPTY_ADD_FORM);
    setAddOpen(false);
  };

  const handleExportConsultant = async (c) => {
    try {
      const year = new Date().getFullYear();
      const res = await exportConsultantTimesheet({
        consultantId:   c.id,
        consultantName: c.name,
        year,
      });
      if (res.ok) toast({ title: 'Export completato', description: res.filename });
      else        toast({ title: 'Errore export', description: res.message, variant: 'destructive' });
    } catch (err) {
      toast({ title: 'Errore export', description: err.message || 'Errore', variant: 'destructive' });
    }
  };

  const handleEditSave = async () => {
    if (!editForm.name?.trim()) {
      toast({ title: 'Errore', description: 'Il nome è obbligatorio', variant: 'destructive' });
      return;
    }
    const result = await updateConsultant(editingConsultant.id, editForm);
    if (result.error) {
      toast({ title: 'Errore', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Consulente aggiornato' });
    setEditingConsultant(null);
  };

  const handleDeleteConfirm = async () => {
    const result = await deleteConsultant(deletingConsultant.id);
    if (result.error) {
      toast({ title: 'Errore', description: result.error, variant: 'destructive' });
      setDeletingConsultant(null);
      return;
    }
    toast({ title: `${deletingConsultant.name} eliminato` });
    setDeletingConsultant(null);
  };

  const handleCellBlur = async (consultantId, year) => {
    const draft = getDraft(consultantId, year);
    const costo = parseFloat(draft.costo_aziendale) || 0;
    const ore   = parseInt(draft.ore_max)           || 0;
    if (costo === 0 && ore === 0) return; // nessun valore, non salvare
    const result = await upsertRate(consultantId, year, { costo_aziendale: costo, ore_max: ore });
    if (result.error) {
      toast({ title: 'Errore salvataggio tariffa', description: result.error, variant: 'destructive' });
      return;
    }
    // remove draft so cell re-reads from rates state
    setCellDraft(prev => {
      const next = { ...prev };
      delete next[`${consultantId}_${year}`];
      return next;
    });
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* ── Blocco A: Anagrafica ── */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Consulenti</h1>
              <p className="text-sm text-gray-500 mt-0.5">Gestione anagrafica e tariffe</p>
            </div>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => { setAddForm(EMPTY_ADD_FORM); setAddOpen(true); }}
            >
              <UserPlus className="w-4 h-4 mr-1.5" />+ Consulente
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {consultants.map(c => (
              <div key={c.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                  {c.role && <p className="text-xs text-gray-400 mt-0.5 capitalize">{c.role}</p>}
                  <span className={cn('text-[11px] px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium', STATUS_COLORS[c.status] || STATUS_COLORS.inactive)}>
                    {c.status || 'active'}
                  </span>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => handleExportConsultant(c)}
                    className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600"
                    title={`Esporta timesheet ${new Date().getFullYear()} di ${c.name}`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setEditingConsultant(c); setEditForm({ name: c.name, email: c.email || '', role: c.role || 'consultant', status: c.status || 'active' }); }}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    title="Modifica"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingConsultant(c)}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    title="Elimina"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Blocco B: Storico Tariffe ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Storico Tariffe per Anno</h2>
          <div className="relative overflow-auto rounded-lg border border-gray-200 max-h-[70vh]">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky top-0 left-0 z-30 bg-gray-50 px-4 py-3 text-left font-medium text-gray-700 border-r border-b border-gray-200 min-w-[180px]">
                    Consulente
                  </th>
                  {years.map(year => (
                    <th key={year} colSpan={4} className="sticky top-0 z-20 bg-gray-50 px-2 py-3 text-center font-semibold text-gray-700 border-r border-b border-gray-200 last:border-r-0">
                      {year}
                    </th>
                  ))}
                </tr>
                <tr className="bg-gray-50/95 text-[11px] text-gray-500">
                  <th className="sticky left-0 z-30 bg-gray-50/95 px-4 py-2 border-r border-b border-gray-200"
                      style={{ top: '45px' }} />
                  {years.flatMap(year =>
                    ['Costo Az. €', 'Ore Max', 'MU', 'Tariffa €'].map(h => (
                      <th key={`${year}-${h}`}
                          className="sticky z-20 bg-gray-50/95 px-2 py-2 text-center font-normal border-r border-b border-gray-200 last:border-r-0 min-w-[72px]"
                          style={{ top: '45px' }}>
                        {h}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {consultants.map((c, idx) => {
                  const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                  return (
                  <tr key={c.id} className={cn('hover:bg-yellow-50/40 transition-colors group', rowBg)}>
                    <td className={cn('sticky left-0 z-10 px-4 py-2 font-medium text-gray-900 border-r border-b border-gray-200 text-sm group-hover:bg-yellow-50/40', rowBg)}>
                      {c.name}
                    </td>
                    {years.flatMap(year => {
                      const draft   = getDraft(c.id, year);
                      const costo   = parseFloat(draft.costo_aziendale) || 0;
                      const ore     = parseInt(draft.ore_max)           || 0;
                      const mu      = ore > 0 ? (ore / MU_HOURS).toFixed(2) : '—';
                      const tariffa = ore > 0 && costo > 0 ? (costo / ore).toFixed(2) : '—';

                      return [
                        <td key={`${year}-costo`} className="px-1 py-1 border-r border-b border-gray-200 bg-blue-50/40">
                          <input
                            type="number"
                            inputMode="decimal"
                            className="no-spinner w-full px-1.5 py-1 text-xs text-center rounded border border-transparent hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:outline-none bg-transparent"
                            value={draft.costo_aziendale}
                            onChange={e => updateDraft(c.id, year, 'costo_aziendale', e.target.value)}
                            onBlur={() => handleCellBlur(c.id, year)}
                            placeholder="—"
                          />
                        </td>,
                        <td key={`${year}-ore`} className="px-1 py-1 border-r border-b border-gray-200 bg-blue-50/40">
                          <input
                            type="number"
                            inputMode="decimal"
                            className="no-spinner w-full px-1.5 py-1 text-xs text-center rounded border border-transparent hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:outline-none bg-transparent"
                            value={draft.ore_max}
                            onChange={e => updateDraft(c.id, year, 'ore_max', e.target.value)}
                            onBlur={() => handleCellBlur(c.id, year)}
                            placeholder="—"
                          />
                        </td>,
                        <td key={`${year}-mu`} className="px-2 py-2 text-center text-xs text-gray-500 border-r border-b border-gray-200">
                          {mu}
                        </td>,
                        <td key={`${year}-tariffa`} className="px-2 py-2 text-center text-xs text-gray-500 border-r border-b border-gray-200 last:border-r-0">
                          {tariffa}
                        </td>,
                      ];
                    })}
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            MU = Ore Max ÷ 143,33 &nbsp;·&nbsp; Tariffa = Costo Az. ÷ Ore Max &nbsp;·&nbsp; Modifiche salvate automaticamente all'uscita dalla cella
          </p>
        </div>

      </div>

      {/* ── Dialog: Aggiungi consulente ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Aggiungi Consulente</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="es. Mario Rossi" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="mario.rossi@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ruolo</Label>
                <Select value={addForm.role} onValueChange={v => setAddForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stato</Label>
                <Select value={addForm.status} onValueChange={v => setAddForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Attivo</SelectItem>
                    <SelectItem value="inactive">Inattivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annulla</Button>
            <Button onClick={handleAddSave}>Aggiungi</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Modifica consulente ── */}
      <Dialog open={!!editingConsultant} onOpenChange={open => !open && setEditingConsultant(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Modifica Consulente</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ruolo</Label>
                <Select value={editForm.role || 'consultant'} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stato</Label>
                <Select value={editForm.status || 'active'} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Attivo</SelectItem>
                    <SelectItem value="inactive">Inattivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditingConsultant(null)}>Annulla</Button>
            <Button onClick={handleEditSave}>Salva</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Conferma eliminazione ── */}
      <Dialog open={!!deletingConsultant} onOpenChange={() => setDeletingConsultant(null)}>
        <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>Eliminare {deletingConsultant?.name}?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 py-2">
              Verranno cancellate anche tutte le tariffe associate. Le allocazioni nei progetti rimarranno.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingConsultant(null)}>Annulla</Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>Elimina</Button>
            </div>
          </DialogContent>
        </Dialog>

    </AdminLayout>
  );
};

export default ConsultantsPage;
