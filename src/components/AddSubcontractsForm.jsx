import React, { useState } from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarPlus as CalendarIcon, BadgeEuro as EuroIcon, Briefcase as BriefcaseIcon, UserCog as UserIcon } from 'lucide-react';

const AddSubcontractsForm = ({ defaultProjectId, onSuccess }) => {
  const { addSubcontract } = useExpenses();
  const { projects } = useTimesheet();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    projectId: defaultProjectId || '',
    date: new Date().toISOString().split('T')[0],
    providerName: '',
    description: '',
    amount: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.projectId || !formData.amount || !formData.description || !formData.providerName) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    addSubcontract({
      projectId: formData.projectId,
      date: formData.date,
      providerName: formData.providerName,
      description: formData.description,
      amount: parseFloat(formData.amount)
    });

    toast({
      title: "Subcontract Added",
      description: "Subcontract expense has been successfully recorded.",
      variant: "success"
    });

    setFormData({
      projectId: defaultProjectId || '',
      date: new Date().toISOString().split('T')[0],
      providerName: '',
      description: '',
      amount: ''
    });

    if (onSuccess) onSuccess();
  };

  return (
    <Card className="border shadow-sm bg-white">
      <CardHeader className="pb-3 border-b bg-gray-50/50">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800">
          <BriefcaseIcon className="w-4 h-4 text-purple-600" />
          Register Subcontract (Actual)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {!defaultProjectId && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500">Project</Label>
              <Select 
                value={formData.projectId} 
                onValueChange={(val) => setFormData({...formData, projectId: val})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500">Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                  type="date" 
                  className="pl-9"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-500">Amount (€)</Label>
              <div className="relative">
                <EuroIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  className="pl-9 font-bold text-gray-900"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
             <Label className="text-xs font-semibold text-gray-500">Vendor / Provider Name</Label>
             <div className="relative">
                <UserIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="e.g. Acme Corp, John Doe..."
                  className="pl-9"
                  value={formData.providerName}
                  onChange={(e) => setFormData({...formData, providerName: e.target.value})}
                  required
                />
             </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-500">Description</Label>
            <Input 
              placeholder="e.g. Legal Services, Phase 1 Delivery..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>

          <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
            Record Subcontract
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddSubcontractsForm;