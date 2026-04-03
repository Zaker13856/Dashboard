import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Save, Settings2, Euro, CalendarClock, PlusCircle, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const HoursLimitsManager = () => {
  const { consultants, updateConsultant, getConsultantHourlyRate } = useAuth();
  const { getConsultantLimits, updateConsultantLimits, years, ensureYearsExist } = useTimesheet();
  const { toast } = useToast();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [limitValues, setLimitValues] = useState({});
  const [rateValues, setRateValues] = useState({});
  const [newYearInput, setNewYearInput] = useState('');
  
  const [confirmDialog, setConfirmDialog] = useState({ open: false, consultantId: null, type: null, value: null });

  // Initialize values when year or consultants change
  useEffect(() => {
    const limits = {};
    const rates = {};
    consultants.forEach(c => {
      // Limits
      const cLimits = getConsultantLimits(c.id, parseInt(selectedYear));
      limits[c.id] = {
        monthly: cLimits.monthly,
        annual: cLimits.annual
      };
      
      // Rates
      const cRate = getConsultantHourlyRate(c.id, parseInt(selectedYear));
      rates[c.id] = cRate;
    });
    setLimitValues(limits);
    setRateValues(rates);
  }, [selectedYear, consultants, getConsultantLimits, getConsultantHourlyRate]);

  const handleLimitChange = (id, type, value) => {
    setLimitValues(prev => ({
      ...prev,
      [id]: { ...prev[id], [type]: value }
    }));
  };

  const handleRateChange = (id, value) => {
    setRateValues(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const initiateSaveLimits = (consultantId) => {
      const values = limitValues[consultantId];
      if (!values) return;
      
      // Check for zero or reduction (simple check for zero for now as per prompt)
      if (parseFloat(values.annual) === 0 || parseFloat(values.monthly) === 0) {
          setConfirmDialog({ open: true, consultantId, type: 'zero_warning' });
          return;
      }
      
      performSaveLimits(consultantId);
  };

  const performSaveLimits = (consultantId) => {
    const values = limitValues[consultantId];
    if (!values) return;
    updateConsultantLimits(consultantId, parseInt(selectedYear), values.monthly, values.annual);
    toast({ title: "Limits Updated", description: "Successfully updated hours limits." });
    setConfirmDialog({ open: false, consultantId: null });
  };

  const handleSaveRate = (consultantId) => {
    const value = rateValues[consultantId];
    if (value === undefined) return;
    
    // Update rate using AuthContext's updateConsultant to ensure data persistence
    const consultant = consultants.find(c => c.id === consultantId);
    const currentRates = consultant.hourlyRates || {};
    
    const newRates = {
        ...currentRates,
        [selectedYear]: parseFloat(value)
    };

    updateConsultant(consultantId, { hourlyRates: newRates });
    
    toast({ 
        title: "Rate Updated", 
        description: `Updated hourly rate for ${selectedYear} to €${value}.`, 
        variant: "default",
        className: "bg-green-50 border-green-200 text-green-900"
    });
  };

  const handleAddYear = () => {
    const yearToAdd = parseInt(newYearInput);
    if (isNaN(yearToAdd) || yearToAdd < 2020 || yearToAdd > 2050) {
      toast({ title: "Invalid Year", description: "Please enter a valid year between 2020 and 2050.", variant: "destructive" });
      return;
    }
    
    const added = ensureYearsExist([yearToAdd]);
    if (added) {
      toast({ title: "Year Added", description: `Year ${yearToAdd} has been added to configuration.` });
      setSelectedYear(yearToAdd.toString());
      setNewYearInput('');
    } else {
      toast({ title: "Year Exists", description: "This year is already configured.", variant: "secondary" });
    }
  };

  return (
    <>
    <Card className="border-t-4 border-t-purple-600 shadow-md">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-purple-600" />
          <CardTitle>Configuration Center</CardTitle>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-medium">Configuring for Year:</span>
            <div className="w-32">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="limits">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="limits">Hours Limits</TabsTrigger>
            <TabsTrigger value="rates">Hourly Rates</TabsTrigger>
            <TabsTrigger value="years">Years Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="limits">
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Consultant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Monthly (h)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Annual (h)</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {consultants.map((consultant) => (
                    <tr key={consultant.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-4 font-medium text-gray-900">{consultant.name}</td>
                      <td className="px-4 py-4">
                        <Input
                          type="number"
                          value={limitValues[consultant.id]?.monthly || ''}
                          onChange={(e) => handleLimitChange(consultant.id, 'monthly', e.target.value)}
                          className="w-32"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Input
                          type="number"
                          value={limitValues[consultant.id]?.annual || ''}
                          onChange={(e) => handleLimitChange(consultant.id, 'annual', e.target.value)}
                          className="w-32"
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button size="sm" onClick={() => initiateSaveLimits(consultant.id)} variant="outline">
                          <Save className="w-4 h-4 mr-2" /> Save
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="rates">
             <div className="overflow-x-auto rounded-md border">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Consultant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Hourly Rate (€)</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {consultants.map((consultant) => (
                    <tr key={consultant.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-4 font-medium text-gray-900">{consultant.name}</td>
                      <td className="px-4 py-4">
                        <div className="relative w-48">
                           <Euro className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                           <Input
                            type="number"
                            value={rateValues[consultant.id] || ''}
                            onChange={(e) => handleRateChange(consultant.id, e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button size="sm" onClick={() => handleSaveRate(consultant.id)} variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                          <Save className="w-4 h-4 mr-2" /> Save Rate
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          <TabsContent value="years">
             <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-md flex items-start gap-3">
                   <CalendarClock className="w-5 h-5 text-blue-600 mt-0.5" />
                   <div>
                      <h4 className="font-semibold text-blue-900">Automatic Year Management</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Years are automatically added to the system when you create or update projects with future end dates.
                        You can also manually add a year below if you need to configure rates in advance.
                      </p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Configured Years</h3>
                      <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                         {years.map(year => (
                           <div key={year} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                              <span className="font-medium">{year}</span>
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Active</span>
                           </div>
                         ))}
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Manually Add Year</h3>
                      <div className="flex gap-3">
                         <Input 
                            type="number" 
                            placeholder="YYYY" 
                            value={newYearInput}
                            onChange={(e) => setNewYearInput(e.target.value)}
                         />
                         <Button onClick={handleAddYear} className="whitespace-nowrap">
                            <PlusCircle className="w-4 h-4 mr-2" /> Add Year
                         </Button>
                      </div>
                   </div>
                </div>
             </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" /> Warning: Removing Limits
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are setting the hour limits to 0. This will effectively disable time logging for this consultant in {selectedYear}.
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={() => performSaveLimits(confirmDialog.consultantId)}
                className="bg-red-600 hover:bg-red-700"
            >
              Confirm Zero Limits
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default HoursLimitsManager;