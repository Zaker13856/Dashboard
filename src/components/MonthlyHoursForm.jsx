import React, { useState } from 'react';
import { useTimesheet } from '@/context/TimesheetContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Save, Edit2, Trash2, History, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MonthlyHoursForm = () => {
  const { projects, addEntry, updateEntry, deleteEntry, validateEntry, getConsultantProjectsForMonth, history, loading: timesheetLoading } = useTimesheet();
  const { user } = useAuth();
  const { toast } = useToast();

  const [projectId, setProjectId] = useState('');
  const [hours, setHours] = useState('');
  
  // Edit State
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editHours, setEditHours] = useState('');
  
  // UI State
  const [showHistory, setShowHistory] = useState(false);

  // Safety first
  if (timesheetLoading || !user) {
    return <div className="p-4 text-center text-gray-500">Loading data...</div>;
  }

  const currentDate = new Date();
  // Ensure we fetch data specifically for the logged-in user
  const activeProjects = user ? getConsultantProjectsForMonth(currentDate.getFullYear(), currentDate.getMonth(), user.id) : [];

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!user) {
        toast({ title: "Error", description: "Session invalid", variant: "destructive" });
        return;
    }

    if (!projectId) {
      toast({ title: "Error", description: "Please select a project", variant: "destructive" });
      return;
    }
    if (!hours || parseFloat(hours) <= 0) {
      toast({ title: "Error", description: "Please enter valid hours", variant: "destructive" });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const validation = validateEntry(user.id, today, parseFloat(hours));

    if (!validation.isValid) {
      toast({ 
        title: "Limit Exceeded", 
        description: validation.errors.monthly || validation.errors.annual, 
        variant: "destructive" 
      });
      return;
    }

    const monthlyPercent = (validation.stats.newMonthlyTotal / validation.stats.monthlyLimit);
    if (monthlyPercent > 0.8 && monthlyPercent < 1) {
       toast({
         title: "Warning",
         description: `You are at ${(monthlyPercent * 100).toFixed(0)}% of your monthly limit.`,
         variant: "default"
       });
    }

    addEntry({
      date: today,
      projectId: projectId,
      hours: parseFloat(hours),
      consultantId: user.id // Explicitly enforce user ID
    });

    toast({
      title: "Success",
      description: `Logged ${hours} hours successfully.`,
      variant: "default"
    });

    setHours('');
    setProjectId('');
  };

  const handleStartEdit = (entry) => {
    setEditingEntryId(entry.id);
    setEditHours(entry.hours.toString());
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditHours('');
  };

  const handleSaveEdit = (entry) => {
    if (!editHours || parseFloat(editHours) <= 0) {
      toast({ title: "Error", description: "Please enter valid hours", variant: "destructive" });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const validation = validateEntry(user.id, today, parseFloat(editHours), entry.hours);

    if (!validation.isValid) {
       toast({ 
        title: "Limit Exceeded", 
        description: validation.errors.monthly || validation.errors.annual, 
        variant: "destructive" 
      });
      return;
    }

    updateEntry(entry.id, editHours);
    setEditingEntryId(null);
    setEditHours('');
    toast({ title: "Updated", description: "Hours updated successfully.", variant: "default" });
  };

  const handleDelete = (id) => {
    deleteEntry(id);
    toast({ title: "Deleted", description: "Entry removed successfully.", variant: "default" });
  };

  return (
    <div className="space-y-6">
      {/* Log Form */}
      <Card className="h-full border-l-4 border-l-blue-600 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            Log Monthly Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select existing project..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {projects && projects.length > 0 ? (
                    projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))
                  ) : (
                      <SelectItem value="none" disabled>No projects available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hours for this month</Label>
              <Input 
                type="number"
                step="0.01"
                min="0.1"
                placeholder="0.00"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              Save Hours
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Entries List with Edit/Delete */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase text-gray-500">Current Month Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeProjects.length === 0 && <p className="text-sm text-gray-400 italic">No entries for this month.</p>}
            
            {activeProjects.map(project => (
              <div key={project.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex justify-between items-center mb-2 border-b pb-2">
                  <span className="font-bold text-gray-700">{project.name}</span>
                  <span className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Total: {project.monthlyHours.toFixed(2)}h
                  </span>
                </div>
                <div className="space-y-2">
                  {project.entries.map(entry => (
                    <motion.div 
                      key={entry.id} 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between text-sm bg-white p-2 rounded shadow-sm"
                    >
                      {editingEntryId === entry.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <Input 
                            type="number" 
                            className="h-7 w-20 text-xs" 
                            value={editHours} 
                            onChange={(e) => setEditHours(e.target.value)}
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => handleSaveEdit(entry)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={handleCancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                           <div className="flex items-center gap-2">
                              <span className="font-mono text-gray-600">{entry.hours}h</span>
                              {entry.modifiedAt && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 text-orange-600 border-orange-200 bg-orange-50">
                                  Modified
                                </Badge>
                              )}
                           </div>
                           <div className="flex items-center gap-1">
                             <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600" onClick={() => handleStartEdit(entry)}>
                               <Edit2 className="w-3 h-3" />
                             </Button>
                             
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                   <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-red-600">
                                     <Trash2 className="w-3 h-3" />
                                   </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Sei sicuro di voler cancellare questa voce? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(entry.id)} className="bg-red-600">
                                      Confirm Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                           </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Changelog History */}
      <Card>
        <CardHeader className="py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setShowHistory(!showHistory)}>
          <CardTitle className="text-sm font-medium flex items-center justify-between text-gray-500">
            <div className="flex items-center gap-2">
               <History className="w-4 h-4" />
               Recent Activity Log
            </div>
            <Badge variant="secondary" className="font-normal">{showHistory ? 'Hide' : 'Show'}</Badge>
          </CardTitle>
        </CardHeader>
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0">
                <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-gray-50">
                  <div className="space-y-4">
                    {history && history.length === 0 ? (
                      <p className="text-xs text-center text-gray-400">No recent activity.</p>
                    ) : (
                      (history || []).map((item) => (
                        <div key={item.id} className="flex flex-col gap-1 border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded 
                              ${item.action === 'Created' ? 'bg-green-100 text-green-700' : 
                                item.action === 'Modified' ? 'bg-blue-100 text-blue-700' : 
                                'bg-red-100 text-red-700'}`}>
                              {item.action}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 pl-1">{item.details}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};

export default MonthlyHoursForm;