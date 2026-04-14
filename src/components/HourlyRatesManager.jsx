import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useHourlyRates } from '@/hooks/useHourlyRates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, Euro, Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const HourlyRatesManager = () => {
  const { consultants, cleanupStaleRatesData } = useAuth();
  const { saveConsultantRate, getAllConsultantsRates, validateRateSync } = useHourlyRates();
  const { toast } = useToast();
  
  const [localRates, setLocalRates] = useState({});
  const [originalRates, setOriginalRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syncChecking, setSyncChecking] = useState(false);

  const years = [2022, 2023, 2024, 2025, 2026, 2027];

  // Initialize state from context/storage
  useEffect(() => {
    console.log('🔄 [HourlyRatesManager] Initializing rates from consultants');
    const ratesMap = {};
    consultants.forEach(c => {
      ratesMap[c.id] = { ...c.hourlyRates };
      console.log(`📊 [HourlyRatesManager] Loaded rates for ${c.name}:`, c.hourlyRates);
    });
    setLocalRates(JSON.parse(JSON.stringify(ratesMap)));
    setOriginalRates(JSON.parse(JSON.stringify(ratesMap)));
    setHasUnsavedChanges(false);
  }, [consultants]);

  const handleRateChange = (consultantId, year, value) => {
    setLocalRates(prev => {
      const newState = {
        ...prev,
        [consultantId]: {
          ...prev[consultantId],
          [year]: value
        }
      };
      
      setHasUnsavedChanges(true);
      return newState;
    });
  };

  const isCellModified = (consultantId, year) => {
    const current = localRates[consultantId]?.[year];
    const original = originalRates[consultantId]?.[year];
    
    if (!current && !original) return false;
    
    return current != original;
  };

  // Task 4: Sync Check function
  const handleSyncCheck = async () => {
    setSyncChecking(true);
    console.log('🔍 [HourlyRatesManager] Starting sync check...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let issues = 0;
      const issuesList = [];
      
      consultants.forEach(c => {
        years.forEach(year => {
          const expectedRate = localRates[c.id]?.[year];
          if (expectedRate) {
            const validation = validateRateSync(c.id, year, parseFloat(expectedRate));
            if (!validation.isValid) {
              issues++;
              issuesList.push(`${c.name} (${year}): Expected €${validation.expectedRate}, got €${validation.actualRate}`);
            }
          }
        });
      });
      
      if (issues === 0) {
        toast({
          title: "✅ Sincronizzazione Verificata",
          description: "Tutte le tariffe sono correttamente sincronizzate.",
          className: "bg-green-50 border-green-200 text-green-900"
        });
      } else {
        toast({
          title: "⚠️ Problemi di Sincronizzazione Rilevati",
          description: (
            <div className="space-y-1">
              <p>{issues} tariffe non sincronizzate:</p>
              <ul className="text-xs mt-2 space-y-1">
                {issuesList.slice(0, 3).map((issue, idx) => (
                  <li key={idx}>• {issue}</li>
                ))}
                {issuesList.length > 3 && <li>... e {issuesList.length - 3} altre</li>}
              </ul>
            </div>
          ),
          variant: "destructive",
          duration: 8000
        });
      }
      
      console.log(`✅ [HourlyRatesManager] Sync check complete: ${issues} issues found`);
    } finally {
      setSyncChecking(false);
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    let successCount = 0;
    let errorCount = 0;
    const savedRates = [];

    try {
      console.log('💾 [HourlyRatesManager] Starting save operation...');
      await new Promise(resolve => setTimeout(resolve, 600));

      for (const consultantId in localRates) {
        const rates = localRates[consultantId];
        const consultant = consultants.find(c => c.id === consultantId);
        const consultantName = consultant?.name || 'Unknown';
        
        for (const year of years) {
            if (isCellModified(consultantId, year)) {
                 const val = rates[year];
                 const numVal = parseFloat(val);
                 
                 if (!isNaN(numVal)) {
                     console.log(`💾 [HourlyRatesManager] Saving: ${consultantName} (${year}): €${numVal}`);
                     const success = saveConsultantRate(consultantId, parseInt(year), numVal);
                     if (success) {
                       successCount++;
                       savedRates.push({ name: consultantName, year, rate: numVal });
                     } else {
                       errorCount++;
                     }
                 }
            }
        }
      }

      setOriginalRates(JSON.parse(JSON.stringify(localRates)));
      setHasUnsavedChanges(false);

      if (errorCount === 0) {
        const ratesPreview = savedRates.slice(0, 3).map(r => 
          `${r.name} (${r.year}): €${r.rate.toFixed(2)}`
        ).join(', ');
        
        const moreCount = savedRates.length > 3 ? ` +${savedRates.length - 3} altre` : '';
        
        console.log(`✅ [HourlyRatesManager] Successfully saved ${successCount} rates`);
        
        toast({
            title: "✅ Tariffe Salvate con Successo",
            description: (
              <div className="space-y-2">
                <p>Aggiornate {successCount} tariffe nel sistema.</p>
                <p className="text-xs text-gray-600 mt-2">{ratesPreview}{moreCount}</p>
                <p className="text-xs font-semibold text-blue-600 mt-2">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Tutte le assegnazioni progetti verranno sincronizzate automaticamente.
                </p>
              </div>
            ),
            className: "bg-green-50 border-green-200 text-green-900",
            duration: 6000
        });
      } else {
         toast({
            title: "Salvataggio Parziale",
            description: `Salvate ${successCount} tariffe, ma ${errorCount} hanno fallito.`,
            variant: "warning"
        }); 
      }
      
    } catch (error) {
      console.error("❌ [HourlyRatesManager] Save error:", error);
      toast({
        title: "Errore di Salvataggio",
        description: "Si è verificato un errore inaspettato durante il salvataggio.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm("Sei sicuro di voler annullare tutte le modifiche non salvate?")) {
        setLocalRates(JSON.parse(JSON.stringify(originalRates)));
        setHasUnsavedChanges(false);
    }
  };

  // Task 3: Manual cleanup trigger
  const handleCleanupCache = () => {
    if (confirm("Vuoi rimuovere tutti i dati di cache delle tariffe da localStorage? Questa operazione non modificherà le tariffe salvate.")) {
      const removedCount = cleanupStaleRatesData();
      toast({
        title: "🧹 Cache Pulita",
        description: `Rimossi ${removedCount} elementi di cache obsoleti.`,
        className: "bg-blue-50 border-blue-200 text-blue-900"
      });
    }
  };

  return (
    <Card className="border-t-4 border-t-purple-600 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            Gestione Tariffe Orarie
            {hasUnsavedChanges && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                    Modifiche non salvate
                </span>
            )}
          </CardTitle>
          <CardDescription>
            Gestisci le tariffe orarie dei consulenti. Le tariffe verranno utilizzate automaticamente nelle assegnazioni dei progetti e sincronizzate in tempo reale.
          </CardDescription>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncCheck}
                disabled={syncChecking}
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
                {syncChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Verifica Sync
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCleanupCache}
                className="gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
                <AlertCircle className="w-4 h-4" />
                Pulisci Cache
            </Button>
            {hasUnsavedChanges && (
                <Button variant="outline" size="sm" onClick={handleReset} disabled={loading}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Annulla
                </Button>
            )}
            <Button 
                onClick={handleSaveAll} 
                disabled={loading || !hasUnsavedChanges} 
                className={cn(
                    "transition-all",
                    hasUnsavedChanges ? "bg-purple-600 hover:bg-purple-700 shadow-lg scale-105" : "bg-gray-400"
                )}
            >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
              <tr>
                <th scope="col" className="px-4 py-3 sticky left-0 bg-gray-100 z-20 border-r-2 border-r-gray-300 w-48 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]">Consulente</th>
                {years.map(year => (
                  <th key={year} scope="col" className="px-2 py-3 text-center min-w-[100px] border-r last:border-0">{year}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {consultants.map((consultant) => (
                <tr key={consultant.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-slate-50 border-r-2 border-r-gray-300 z-20 shadow-[3px_0_8px_-2px_rgba(0,0,0,0.18)]">
                    <div className="flex flex-col">
                        <span>{consultant.name}</span>
                        <span className="text-[10px] text-gray-400 font-normal">Base: €{consultant.hourlyRate}</span>
                    </div>
                  </td>
                  {years.map(year => {
                    const isModified = isCellModified(consultant.id, year);
                    return (
                        <td key={year} className={cn("px-2 py-2 border-r last:border-0", isModified ? "bg-amber-50" : "")}>
                        <div className="relative group">
                            <Euro className={cn(
                                "absolute left-2 top-2.5 h-3 w-3 transition-colors",
                                isModified ? "text-amber-600" : "text-gray-400 group-hover:text-gray-500"
                            )} />
                            <Input
                            type="number"
                            step="0.01"
                            className={cn(
                                "pl-7 h-8 text-xs w-full text-center transition-all border-transparent hover:border-gray-300 focus:border-blue-500",
                                isModified ? "bg-white font-semibold text-amber-900 shadow-sm border-amber-300" : "bg-transparent"
                            )}
                            value={localRates[consultant.id]?.[year] ?? ''}
                            onChange={(e) => handleRateChange(consultant.id, year, e.target.value)}
                            placeholder="-"
                            />
                        </div>
                        </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-gray-500 flex justify-between items-center">
            <p>💡 Tip: Le tariffe vengono sincronizzate automaticamente con i form di assegnazione progetti in tempo reale.</p>
            <p className="text-gray-400">Ultimo caricamento: {new Date().toLocaleTimeString()}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HourlyRatesManager;