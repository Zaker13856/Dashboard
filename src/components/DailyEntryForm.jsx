import React, { useState, useEffect } from 'react';
import { useTimesheet } from '@/context/TimesheetContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Clock, AlertTriangle, Coins } from 'lucide-react';
import { motion } from 'framer-motion';

const DailyEntryForm = () => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [selectedProject, setSelectedProject] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const { user, getConsultantHourlyRate } = useAuth();
  const { projects, addEntry, validateEntry } = useTimesheet();
  const { toast } = useToast();

  // Get year from selected date
  const selectedYear = new Date(date).getFullYear();
  // Ensure we are getting the rate for the CURRENT user
  const currentRate = user ? getConsultantHourlyRate(user.id, selectedYear) : 0;

  // Filter projects to only show those assigned to the current consultant
  const assignedProjects = projects.filter(p => 
    p.assignedConsultants?.some(a => a.consultantId === user?.id)
  );

  useEffect(() => {
    if (date && hours && user) {
      // Validate specifically for current user
      const result = validateEntry(user.id, date, parseFloat(hours) || 0);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [date, hours, user, validateEntry]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!user) {
        toast({ title: "Error", description: "User session invalid.", variant: "destructive" });
        return;
    }

    if (!selectedProject) {
      toast({ title: "Validation Error", description: "Please select a project.", variant: "destructive" });
      return;
    }

    if (!hours || parseFloat(hours) <= 0) {
      toast({ title: "Validation Error", description: "Please enter valid hours (greater than 0).", variant: "destructive" });
      return;
    }

    const validation = validateEntry(user.id, date, parseFloat(hours));
    
    if (!validation.isValid) {
      toast({
        title: "Limits Exceeded",
        description: validation.errors.monthly || validation.errors.annual,
        variant: "destructive"
      });
      return;
    }

    addEntry({
      date,
      projectId: selectedProject,
      hours: parseFloat(hours),
      notes: notes.trim(),
      consultantId: user.id // Explicitly passing user ID
    });

    toast({
      title: "Success!",
      description: `Logged ${hours} hours to the selected project.`,
      variant: "default"
    });

    // Reset form
    setDate(today);
    setSelectedProject('');
    setHours('');
    setNotes('');
  };

  const calculatedCost = parseFloat(hours || 0) * (currentRate || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="bg-gradient-to-br from-white to-blue-50 border-blue-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Log Daily Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-100">
               <Coins className="w-4 h-4 text-blue-500" />
               <span>Tariffa oraria: <strong>€ {currentRate.toFixed(2)}</strong> (anno {selectedYear})</span>
            </div>
            
            {validationResult && !validationResult.isValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Limit Exceeded</AlertTitle>
                <AlertDescription className="text-xs">
                  {validationResult.errors.monthly && <div>• {validationResult.errors.monthly}</div>}
                  {validationResult.errors.annual && <div>• {validationResult.errors.annual}</div>}
                </AlertDescription>
              </Alert>
            )}

            {validationResult && validationResult.isValid && parseFloat(hours) > 0 && (
              <div className="text-xs space-y-1 bg-blue-100 p-3 rounded text-blue-800">
                <div className="font-semibold">Usage Preview:</div>
                <div className="flex justify-between">
                  <span>Monthly:</span>
                  <span>{(validationResult.stats.usedMonthly + parseFloat(hours)).toFixed(1)} / {validationResult.stats.monthlyLimit} h</span>
                </div>
                <div className="flex justify-between">
                  <span>Annual:</span>
                  <span>{(validationResult.stats.usedAnnual + parseFloat(hours)).toFixed(1)} / {validationResult.stats.annualLimit} h</span>
                </div>
                <div className="flex justify-between pt-1 mt-1 border-t border-blue-200">
                  <span>Estimated Cost:</span>
                  <span className="font-bold">€ {calculatedCost.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={today}
                className="transition-all duration-200 hover:border-blue-400 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {assignedProjects.length === 0 ? (
                    <SelectItem value="none" disabled>No assigned projects</SelectItem>
                  ) : (
                    assignedProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g., 8.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="transition-all duration-200 hover:border-blue-400 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this work..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="transition-all duration-200 hover:border-blue-400 focus:border-blue-500"
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:shadow-md"
              disabled={assignedProjects.length === 0 || (validationResult && !validationResult.isValid)}
            >
              <Clock className="w-4 h-4 mr-2" />
              Log Hours
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DailyEntryForm;