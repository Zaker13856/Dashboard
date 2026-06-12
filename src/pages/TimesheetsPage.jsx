import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Calendar, Clock, ShieldAlert } from 'lucide-react';
import { useTimesheet } from '@/context/TimesheetContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { exportAdminTimesheets } from '@/lib/timesheetExport';

// ── Costanti ────────────────────────────────────────────────────────────────
const MONTH_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const MONTH_FULL = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const AVAILABLE_YEARS = [2024, 2025, 2026, 2027];
const FALLBACK_MONTHLY_LIMIT = 143; // ore — usato se ore_max non configurato

// Categoria/etichetta per ogni activity_type, ordine = file XLS individuali
const TYPE_META = {
  ferie:                    { cat: 'Ferie/Malattia', label: 'Ferie',           order: 1 },
  malattia:                 { cat: 'Ferie/Malattia', label: 'Malattia',        order: 2 },
  isinnova_comunicazione:   { cat: 'ISINNOVA',       label: 'Comunicazione',   order: 3 },
  isinnova_amministrazione: { cat: 'ISINNOVA',       label: 'Amministrazione', order: 4 },
  isinnova_altro:           { cat: 'ISINNOVA',       label: 'Altro',           order: 5 },
  project:                  { cat: 'Progetto',       order: 6 },
  proposta:                 { cat: 'Proposta',       order: 7 },
  tender_sub:               { cat: 'Tender-Sub',     order: 8 },
  consulenza:               { cat: 'Consulenza',     order: 9 },
  altro:                    { cat: 'Altro',          order: 10 },
};

// Ore → giorni (÷8), stringa per la UI. '-' se zero.
const fmtDays = (hours) => (hours > 0 ? (+(hours / 8).toFixed(2)).toString() : '-');

// ── Pagina ──────────────────────────────────────────────────────────────────
const TimesheetsPage = () => {
  const { entries, projects } = useTimesheet();
  const { consultants, getOreMaxByConsultantAndYear } = useAuth();
  const { toast } = useToast();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedConsultant, setSelectedConsultant] = useState('all');

  const year = parseInt(selectedYear);
  const month = parseInt(selectedMonth);

  const sortedConsultants = useMemo(
    () => [...(consultants || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [consultants]
  );

  const yearEntries = useMemo(
    () => (entries || []).filter(e => {
      try { return new Date(e.date).getFullYear() === year; } catch { return false; }
    }),
    [entries, year]
  );

  const monthlyLimitFor = (consultantId) => {
    const oreMax = getOreMaxByConsultantAndYear(consultantId, year);
    return oreMax > 0 ? Math.round(oreMax / 12) : FALLBACK_MONTHLY_LIMIT;
  };

  // ── Tab 1: Raccolta mensile — consulente × attività × mese (giorni) ──────
  const raccoltaRows = useMemo(() => {
    const grouped = {};
    yearEntries.forEach(e => {
      const meta = TYPE_META[e.activity_type];
      if (!meta) return;
      const consultant = sortedConsultants.find(c => c.id === e.consultant_id);
      if (!consultant) return;
      if (selectedConsultant !== 'all' && e.consultant_id !== selectedConsultant) return;

      let name;
      if (e.activity_type === 'project') {
        name = projects?.find(p => p.id === e.project_id)?.name || 'Progetto sconosciuto';
      } else if (meta.label) {
        name = meta.label;
      } else {
        name = e.activity_note || 'Descrizione attività';
      }

      const key = `${e.consultant_id}|${e.activity_type}|${name}`;
      if (!grouped[key]) {
        grouped[key] = {
          consultantName: consultant.name,
          category: meta.cat,
          order: meta.order,
          name,
          months: Array(12).fill(0),
          total: 0,
        };
      }
      const m = new Date(e.date).getMonth();
      const h = parseFloat(e.hours || 0);
      grouped[key].months[m] += h;
      grouped[key].total += h;
    });

    return Object.values(grouped).sort((a, b) => {
      if (a.consultantName !== b.consultantName) return a.consultantName.localeCompare(b.consultantName);
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
  }, [yearEntries, sortedConsultants, projects, selectedConsultant]);

  // ── Tab 2: Vista per mese — tutti i consulenti, tutti i tipi (giorni) ────
  const monthRows = useMemo(() => {
    const monthEntries = yearEntries.filter(e => new Date(e.date).getMonth() === month);
    const byConsultant = {};

    monthEntries.forEach(e => {
      const consultant = sortedConsultants.find(c => c.id === e.consultant_id);
      if (!consultant) return;
      if (!byConsultant[e.consultant_id]) {
        byConsultant[e.consultant_id] = {
          id: e.consultant_id,
          name: consultant.name,
          ferie: 0, malattia: 0, isinnova: 0, progetti: 0, altre: 0, total: 0,
        };
      }
      const row = byConsultant[e.consultant_id];
      const h = parseFloat(e.hours || 0);
      if (e.activity_type === 'ferie') row.ferie += h;
      else if (e.activity_type === 'malattia') row.malattia += h;
      else if (e.activity_type?.startsWith('isinnova_')) row.isinnova += h;
      else if (e.activity_type === 'project') row.progetti += h;
      else row.altre += h;
      row.total += h;
    });

    return Object.values(byConsultant)
      .map(row => {
        const limit = monthlyLimitFor(row.id);
        const ratio = limit > 0 ? row.total / limit : 0;
        return { ...row, limit, ratio };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [yearEntries, month, sortedConsultants, year]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab 3: Controllo limiti — ore mensili/annuali vs ore_max ─────────────
  const limitRows = useMemo(() => {
    return sortedConsultants
      .map(c => {
        const cEntries = yearEntries.filter(e => e.consultant_id === c.id);
        if (cEntries.length === 0) return null;
        const months = Array(12).fill(0);
        cEntries.forEach(e => { months[new Date(e.date).getMonth()] += parseFloat(e.hours || 0); });
        const total = months.reduce((s, h) => s + h, 0);
        const oreMax = getOreMaxByConsultantAndYear(c.id, year);
        const monthlyLimit = oreMax > 0 ? Math.round(oreMax / 12) : FALLBACK_MONTHLY_LIMIT;
        return { id: c.id, name: c.name, months, total, oreMax, monthlyLimit };
      })
      .filter(Boolean);
  }, [sortedConsultants, yearEntries, getOreMaxByConsultantAndYear, year]);

  // ── Export aggregato ──────────────────────────────────────────────────────
  const handleExport = () => {
    const result = exportAdminTimesheets({
      year,
      consultants: sortedConsultants,
      entries,
      projects,
      getOreMax: getOreMaxByConsultantAndYear,
    });
    if (result.ok) {
      toast({ title: 'Export completato', description: `Scaricato ${result.filename}` });
    } else {
      toast({ title: 'Export non riuscito', description: result.message, variant: 'destructive' });
    }
  };

  const semaforo = (ratio) => {
    if (ratio > 1) return 'bg-red-100 text-red-700 border-red-200';
    if (ratio > 0.9) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
            <p className="text-gray-500">Raccolta mensile, vista per mese e controllo limiti. Valori in giorni (ore ÷ 8) salvo dove indicato.</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[110px] bg-white">
                <SelectValue placeholder="Anno" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_YEARS.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
        </div>

        <Tabs defaultValue="raccolta" className="w-full">
          <TabsList className="bg-white border rounded-md p-1 mb-4">
            <TabsTrigger value="raccolta" className="data-[state=active]:bg-gray-100">Raccolta mensile</TabsTrigger>
            <TabsTrigger value="mese" className="data-[state=active]:bg-gray-100">Vista per mese</TabsTrigger>
            <TabsTrigger value="limiti" className="data-[state=active]:bg-gray-100">Controllo limiti</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Raccolta mensile ── */}
          <TabsContent value="raccolta" className="m-0">
            <Card className="border shadow-sm">
              <CardHeader className="bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Raccolta mensile dati ({selectedYear})
                  </CardTitle>
                  <CardDescription>Consulente × attività × mese, in giorni. Replica il foglio "Raccolta mensile dati" del tool Excel.</CardDescription>
                </div>
                <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
                  <SelectTrigger className="w-[220px] bg-white">
                    <SelectValue placeholder="Consulente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i consulenti</SelectItem>
                    {sortedConsultants.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700 min-w-[160px]">Consulente</TableHead>
                        <TableHead className="font-semibold text-gray-700 min-w-[120px]">Tipo</TableHead>
                        <TableHead className="font-semibold text-gray-700 min-w-[200px]">Nome attività</TableHead>
                        {MONTH_SHORT.map(m => (
                          <TableHead key={m} className="font-semibold text-gray-700 text-center">{m}</TableHead>
                        ))}
                        <TableHead className="font-semibold text-gray-900 text-right bg-blue-50/50">Totale</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {raccoltaRows.length > 0 ? (
                        raccoltaRows.map((row, idx) => {
                          const firstOfConsultant = idx === 0 || raccoltaRows[idx - 1].consultantName !== row.consultantName;
                          return (
                            <TableRow key={idx} className={`hover:bg-gray-50 transition-colors ${firstOfConsultant ? 'border-t-2 border-gray-200' : ''}`}>
                              <TableCell className="font-medium text-gray-900">
                                {firstOfConsultant ? row.consultantName : ''}
                              </TableCell>
                              <TableCell className="text-gray-600">{row.category}</TableCell>
                              <TableCell className="text-gray-600">{row.name}</TableCell>
                              {row.months.map((h, mIdx) => (
                                <TableCell key={mIdx} className="text-center text-gray-500 tabular-nums">
                                  {fmtDays(h)}
                                </TableCell>
                              ))}
                              <TableCell className="text-right font-bold text-gray-900 bg-blue-50/20 tabular-nums">
                                {fmtDays(row.total)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={16} className="text-center py-8 text-gray-500">
                            Nessun dato timesheet per il {selectedYear}.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: Vista per mese ── */}
          <TabsContent value="mese" className="m-0">
            <Card className="border shadow-sm">
              <CardHeader className="bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Vista per mese — {MONTH_FULL[month]} {selectedYear}
                  </CardTitle>
                  <CardDescription>Tutti i consulenti, tutti i tipi di attività, in giorni. Semaforo sul limite mensile.</CardDescription>
                </div>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[150px] bg-white">
                    <SelectValue placeholder="Mese" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_FULL.map((m, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700 min-w-[180px]">Consulente</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Ferie</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Malattia</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">ISINNOVA</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Progetti</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Altre attività</TableHead>
                        <TableHead className="font-semibold text-gray-900 text-center bg-blue-50/50">Totale gg</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Limite gg</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Stato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthRows.length > 0 ? (
                        monthRows.map(row => (
                          <TableRow key={row.id} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="font-medium text-gray-900">{row.name}</TableCell>
                            <TableCell className="text-center text-gray-500 tabular-nums">{fmtDays(row.ferie)}</TableCell>
                            <TableCell className="text-center text-gray-500 tabular-nums">{fmtDays(row.malattia)}</TableCell>
                            <TableCell className="text-center text-gray-500 tabular-nums">{fmtDays(row.isinnova)}</TableCell>
                            <TableCell className="text-center text-gray-500 tabular-nums">{fmtDays(row.progetti)}</TableCell>
                            <TableCell className="text-center text-gray-500 tabular-nums">{fmtDays(row.altre)}</TableCell>
                            <TableCell className="text-center font-bold text-gray-900 bg-blue-50/20 tabular-nums">{fmtDays(row.total)}</TableCell>
                            <TableCell className="text-center text-gray-400 tabular-nums">{(row.limit / 8).toFixed(1)}</TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${semaforo(row.ratio)}`}>
                                {(row.ratio * 100).toFixed(0)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            Nessuna riga per {MONTH_FULL[month]} {selectedYear}.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: Controllo limiti ── */}
          <TabsContent value="limiti" className="m-0">
            <Card className="border shadow-sm">
              <CardHeader className="bg-gray-50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  Controllo limiti ({selectedYear})
                </CardTitle>
                <CardDescription>
                  Valori in ORE per confronto diretto con ore_max. Limite mensile = ore_max ÷ 12 (fallback {FALLBACK_MONTHLY_LIMIT}h).
                  Cella rossa = limite mensile superato.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700 min-w-[160px]">Consulente</TableHead>
                        {MONTH_SHORT.map(m => (
                          <TableHead key={m} className="font-semibold text-gray-700 text-center">{m}</TableHead>
                        ))}
                        <TableHead className="font-semibold text-gray-900 text-right bg-blue-50/50">Totale ore</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-right">Ore max</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Stato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {limitRows.length > 0 ? (
                        limitRows.map(row => {
                          const annualRatio = row.oreMax > 0 ? row.total / row.oreMax : 0;
                          return (
                            <TableRow key={row.id} className="hover:bg-gray-50 transition-colors">
                              <TableCell className="font-medium text-gray-900">{row.name}</TableCell>
                              {row.months.map((h, mIdx) => {
                                const over = h > row.monthlyLimit;
                                return (
                                  <TableCell
                                    key={mIdx}
                                    className={`text-center tabular-nums ${over ? 'bg-red-100 text-red-700 font-semibold' : 'text-gray-500'}`}
                                  >
                                    {h > 0 ? h.toFixed(1) : '-'}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-right font-bold text-gray-900 bg-blue-50/20 tabular-nums">
                                {row.total.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right text-gray-500 tabular-nums">
                                {row.oreMax > 0 ? row.oreMax : '—'}
                              </TableCell>
                              <TableCell className="text-center">
                                {row.oreMax > 0 ? (
                                  <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${semaforo(annualRatio)}`}>
                                    {(annualRatio * 100).toFixed(0)}%
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">no ore_max</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={16} className="text-center py-8 text-gray-500">
                            Nessun dato timesheet per il {selectedYear}.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default TimesheetsPage;
