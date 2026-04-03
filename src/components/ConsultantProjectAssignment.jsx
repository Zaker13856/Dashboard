import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { useHourlyRates } from '@/hooks/useHourlyRates';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, UserPlus, Save, Edit2, AlertTriangle, CheckCircle2, AlertCircle, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const ConsultantProjectAssignment = ({ project }) => {
  const { consultants, ratesVersion } = useAuth();
  const { assignConsultant, removeAssignment, getConsultantLimits, getConsultantAllocatedHours } = useTimesheet();
  const { getConsultantRateForYear, formatCurrency, validateRateSync } = useHourlyRates();
  const { toast } = useToast();
  
  const getProjectYears = () => {
    const startYear = project.startDate ? new Date(project.startDate).getFullYear() : new Date().getFullYear();
    const endYear = project.endDate ? new Date(project.endDate).getFullYear() : startYear + 3;
    
    const years = [];
    if (!isNaN(startYear) && !isNaN(endYear) && startYear <= endYear) {
        for (let y = startYear; y <= endYear; y++) {
            years.push(y);
        }
    } else {
        years.push(new Date().getFullYear(), new Date().getFullYear() + 1);
    }
    return years;
  };

  const projectYears = getProjectYears();
  const currentYear = new Date().getFullYear();
  
  const safeDefaultYear = projectYears.includes(currentYear) 
    ? currentYear.toString() 
    : (projectYears.length > 0 ? projectYears[0].toString() : '2026');

  const [selectedConsultant, setSelectedConsultant] = useState('');
  const [allocatedHours, setAllocatedHours] = useState('');
  const [selectedYear, setSelectedYear] = useState(safeDefaultYear);
  const [hourlyRate, setHourlyRate] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [rateError, setRateError] = useState(null);

  // Real-time Capacity Calculations
  const selectedYearInt = parseInt(selectedYear) || currentYear;
  
  const limits = selectedConsultant ? getConsultantLimits(selectedConsultant, selectedYearInt) : { annual: 1720 };
  const annualLimit = limits.annual;

  // Task 2: Calculate total allocated across all projects
  const totalAllocated = selectedConsultant ? getConsultantAllocatedHours(selectedConsultant, selectedYearInt) : 0;
  
  const currentAssignment = (project.assignedConsultants || []).find(
    a => a.consultantId === selectedConsultant && (a.year || 2026) === selectedYearInt
  );
  
  // This project's saved hours
  const currentProjectHours = currentAssignment ? (parseFloat(currentAssignment.allocatedHours) || 0) : 0;
  
  // ALTRI PROG: Total minus this project's saved hours
  const otherProjectsAllocated = totalAllocated - currentProjectHours;
  
  const inputHours = parseFloat(allocatedHours) || 0;
  
  // Task 1 & 5: If typing, use input, otherwise fallback to saved hours to prevent flickering to 0 after save
  const isTyping = allocatedHours !== '';
  const displayThisProject = isTyping ? inputHours : currentProjectHours;
  
  const projectedTotal = otherProjectsAllocated + displayThisProject;
  
  // Task 3: Calculate RIMANENTI
  const remainingCapacity = annualLimit - projectedTotal;
  const isOverLimit = remainingCapacity < 0;
  
  // The absolute max they can assign to THIS project
  const availableToAssign = annualLimit - otherProjectsAllocated;

  // Validate year when project changes
  useEffect(() => {
    const yearInt = parseInt(selectedYear);
    const validYears = getProjectYears();
    if (!validYears.includes(yearInt) && validYears.length > 0) {
        setSelectedYear(validYears[0].toString());
    }
  }, [project.id, project.startDate, project.endDate]);

  // Fetch rates immediately and synchronously
  useEffect(() => {
    if (selectedConsultant && selectedYear && !isEditing) {
      setRateError(null);
      
      const yearInt = parseInt(selectedYear);
      const consultant = consultants.find(c => c.id === selectedConsultant);
      const consultantName = consultant?.name || 'Consulente';
      
      const systemRate = getConsultantRateForYear(selectedConsultant, yearInt);
      
      if (systemRate !== null && systemRate > 0) {
        setHourlyRate(systemRate.toString());
        setRateError(null);
        
        const validation = validateRateSync(selectedConsultant, yearInt, systemRate);
        if (!validation.isValid) {
          toast({
            title: "⚠️ Attenzione: Possibile Disallineamento Tariffa",
            description: `La tariffa potrebbe non essere sincronizzata correttamente. Verifica in Dashboard/Tariffe.`,
            variant: "destructive"
          });
        }
      } else {
        setHourlyRate('');
        const errorMsg = `Tariffa non trovata per ${consultantName} nell'anno ${yearInt}. Configura la tariffa in Dashboard/Tariffe prima di assegnare il consulente.`;
        setRateError(errorMsg);
        toast({
          title: "⚠️ Tariffa Non Configurata",
          description: errorMsg,
          variant: "destructive",
          duration: 6000
        });
      }
    }
  }, [selectedConsultant, selectedYear, isEditing, ratesVersion, getConsultantRateForYear, consultants, toast, validateRateSync]);

  const assignedList = project.assignedConsultants || [];
  
  const handleAssign = () => {
    if (!selectedConsultant || !allocatedHours) {
      toast({ 
        title: "❌ Campi Obbligatori Mancanti", 
        description: "Seleziona un consulente e inserisci le ore da assegnare.", 
        variant: "destructive" 
      });
      return;
    }

    const yearInt = parseInt(selectedYear);
    const hoursFloat = parseFloat(allocatedHours);
    const consultantName = consultants.find(c => c.id === selectedConsultant)?.name || 'Il consulente';

    if (!hourlyRate || parseFloat(hourlyRate) <= 0) {
      toast({ 
        title: "❌ Tariffa Non Trovata", 
        description: `Tariffa non trovata per ${consultantName} nell'anno ${yearInt}. Configura la tariffa in Dashboard/Tariffe prima di assegnare il consulente.`, 
        variant: "destructive",
        duration: 7000
      });
      return;
    }

    // Task 4: Custom Validation Error Message
    if (isOverLimit) {
        toast({ 
            title: "❌ Limite Superato", 
            description: `${consultantName} ha solo ${availableToAssign} ore disponibili nel ${yearInt}, non puoi allocarne ${hoursFloat}`, 
            variant: "destructive" 
        });
        return;
    }
    
    const rateFloat = parseFloat(hourlyRate);
    
    if (isNaN(hoursFloat) || hoursFloat <= 0) {
        toast({ title: "❌ Ore Non Valide", description: "Le ore devono essere un numero positivo maggiore di zero.", variant: "destructive" });
        return;
    }

    try {
        assignConsultant(project.id, selectedConsultant, hoursFloat, yearInt, rateFloat);
        
        toast({
          title: isEditing ? "✅ Assegnazione Aggiornata" : "✅ Assegnazione Aggiunta",
          description: `Assegnate ${hoursFloat}h a ${consultantName} per il ${yearInt} a €${rateFloat.toFixed(2)}/h`,
          className: "bg-green-50 border-green-200 text-green-900",
        });

        // Clear input hours but KEEP selectedConsultant so UI updates instantly
        setAllocatedHours('');
        setIsEditing(false);
    } catch (error) {
        console.error("❌ [ConsultantProjectAssignment] Assignment Error:", error);
        toast({
            title: "Errore",
            description: "Impossibile salvare l'assegnazione. Riprova.",
            variant: "destructive"
        });
    }
  };

  const handleEditClick = (assignment) => {
    setSelectedConsultant(assignment.consultantId);
    setSelectedYear(assignment.year.toString());
    setAllocatedHours(assignment.allocatedHours.toString());
    setHourlyRate(assignment.hourlyRate.toString());
    setRateError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setSelectedConsultant('');
    setAllocatedHours('');
    setHourlyRate('');
    setRateError(null);
    setIsEditing(false);
  };

  const getConsultantName = (id) => consultants.find(c => c.id === id)?.name || 'Unknown';

  return (
    <Card className="h-full border-gray-200 shadow-none">
      <CardHeader className="pb-3 px-0 border-b mb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-600" />
          Assegnazione Team
          {ratesVersion > 0 && (
            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
              <RefreshCw className="w-2.5 h-2.5 mr-1" />
              Sync v{ratesVersion}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="bg-gray-50 p-4 rounded-lg border mb-6 space-y-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex justify-between items-center">
            <span>{isEditing ? 'Modifica Assegnazione' : 'Aggiungi Assegnazione'}</span>
            {isEditing && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Modalità Modifica
              </Badge>
            )}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
             <div className="col-span-1">
                <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isEditing}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="Anno" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
             <div className="col-span-1 md:col-span-3">
                <Select value={selectedConsultant} onValueChange={setSelectedConsultant} disabled={isEditing}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="Seleziona consulente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {consultants.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="col-span-1 md:col-span-2">
               <div className="relative">
                 <Input 
                  type="number" 
                  placeholder="Ore Assegnate" 
                  className="h-9 bg-white pr-8 text-gray-900"
                  value={allocatedHours}
                  onChange={(e) => setAllocatedHours(e.target.value)}
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">h</span>
               </div>
            </div>
            
            <div className="col-span-1 md:col-span-1">
               <div className="relative group flex items-center">
                 <Input 
                  type="text" 
                  placeholder="Tariffa" 
                  className={cn(
                    "h-9 pr-6 transition-colors font-semibold",
                    rateError 
                      ? "bg-red-50 border-red-300 text-red-700 cursor-not-allowed"
                      : "bg-gray-100 border-gray-200 text-gray-900 cursor-not-allowed"
                  )}
                  value={hourlyRate ? `${parseFloat(hourlyRate).toFixed(2)}` : ''}
                  disabled={true}
                  readOnly
                  title={rateError || "La tariffa viene precompilata automaticamente dal sistema (Dashboard/Tariffe)."}
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">€</span>
                
                {hourlyRate && !rateError && (
                  <div className="absolute -top-2 -right-1 z-10">
                       <div className="bg-blue-100 text-blue-600 rounded-full p-0.5 border border-blue-200" title="Sincronizzata con Dashboard/Tariffe">
                         <LinkIcon className="w-3 h-3" />
                       </div>
                  </div>
                )}
                
                {rateError && (
                  <div className="absolute -top-2 -right-1 z-10">
                       <div className="bg-red-100 text-red-600 rounded-full p-0.5 border border-red-200" title="Tariffa non configurata">
                         <AlertCircle className="w-3 h-3" />
                       </div>
                  </div>
                )}
               </div>
            </div>

            <div className="col-span-1 flex gap-2">
               <Button 
                onClick={handleAssign} 
                disabled={!selectedConsultant || !allocatedHours || !hourlyRate || !!rateError} 
                className={cn(
                    "h-9 flex-1 transition-all",
                    rateError
                        ? "bg-gray-300 hover:bg-gray-300 text-gray-500 cursor-not-allowed" 
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
               >
                 <Save className="w-4 h-4 mr-1" /> {isEditing ? 'Aggiorna' : 'Aggiungi'}
               </Button>
               {isEditing && (
                 <Button onClick={handleCancelEdit} variant="outline" className="h-9 px-3 hover:bg-red-50 hover:text-red-600 hover:border-red-200 bg-white text-gray-700">
                   <X className="w-4 h-4" />
                 </Button>
               )}
            </div>
          </div>

          {rateError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{rateError}</span>
              </p>
            </div>
          )}

          {selectedConsultant && !rateError && (
             <div className={cn(
                 "mt-3 p-3 rounded-lg border transition-all duration-300",
                 remainingCapacity < 0 ? "bg-red-50 border-red-200" :
                 remainingCapacity < 50 ? "bg-amber-50 border-amber-200" :
                 "bg-emerald-50 border-emerald-200"
             )}>
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-black/5">
                    {remainingCapacity < 0 ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : remainingCapacity < 50 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <h5 className={cn("text-xs font-bold uppercase tracking-wider",
                        remainingCapacity < 0 ? "text-red-800" :
                        remainingCapacity < 50 ? "text-amber-800" :
                        "text-emerald-800"
                    )}>
                        Controllo Capacità ({selectedYearInt})
                    </h5>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-gray-500 font-semibold">Totale</span>
                        <span className="text-sm font-bold text-gray-900">{annualLimit}</span>
                    </div>
                    <div className="flex flex-col relative">
                        <span className="text-[10px] uppercase text-gray-500 font-semibold">Altri Prog.</span>
                        <span className="text-sm font-bold text-gray-700">-{otherProjectsAllocated}</span>
                         <span className="absolute -right-1 top-4 text-gray-400">-</span>
                    </div>
                    <div className="flex flex-col relative">
                        <span className="text-[10px] uppercase text-gray-500 font-semibold">Questo Prog.</span>
                        <span className="text-sm font-bold text-blue-700">{displayThisProject}</span>
                        <span className="absolute -right-1 top-4 text-gray-400">=</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-gray-500 font-semibold">Rimanenti</span>
                        <span className={cn("text-sm font-extrabold",
                            remainingCapacity < 0 ? "text-red-600" :
                            remainingCapacity < 50 ? "text-amber-600" :
                            "text-emerald-600"
                        )}>
                            {remainingCapacity}
                        </span>
                    </div>
                </div>
                 {isOverLimit && (
                    <p className="text-[11px] font-medium text-red-600 mt-2 text-center bg-red-100/50 py-1 rounded">
                        ⚠️ Attenzione: stai assegnando più ore di quelle disponibili!
                    </p>
                )}
             </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-medium text-gray-500 uppercase px-2 mb-2">
             <span className="w-1/3">Consulente</span>
             <span className="w-1/6 text-center">Anno</span>
             <span className="w-1/6 text-center">Ore</span>
             <span className="w-1/6 text-right">Valore</span>
             <span className="w-1/6 text-right">Azioni</span>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {assignedList.length === 0 ? (
               <div className="text-center py-6 bg-gray-50 border border-dashed rounded-md">
                 <p className="text-sm text-gray-500">Nessun consulente ancora assegnato.</p>
               </div>
            ) : (
               assignedList
                 .sort((a,b) => (a.year||2026) - (b.year||2026))
                 .map((assignment, idx) => (
                <div 
                  key={`${assignment.consultantId}-${assignment.year || idx}`} 
                  className="flex justify-between items-center text-sm p-3 bg-white rounded-md border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group"
                >
                  <div className="w-1/3 font-medium text-gray-800 truncate pr-2">
                    {getConsultantName(assignment.consultantId)}
                  </div>
                  
                  <div className="w-1/6 text-center">
                    <Badge variant="secondary" className="font-normal text-xs bg-gray-100">
                       {assignment.year || 2026}
                    </Badge>
                  </div>
                  
                  <div className="w-1/6 text-center font-mono text-gray-600">
                    {assignment.allocatedHours}h
                  </div>
                  
                  <div className="w-1/6 text-right font-medium text-gray-900">
                    {formatCurrency(assignment.allocatedHours * (assignment.hourlyRate || 0))}
                  </div>
                  
                  <div className="w-1/6 flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 hover:text-blue-600 hover:bg-blue-50"
                      onClick={() => handleEditClick(assignment)}
                      title="Modifica assegnazione"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeAssignment(project.id, assignment.consultantId, assignment.year)}
                      title="Rimuovi assegnazione"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsultantProjectAssignment;