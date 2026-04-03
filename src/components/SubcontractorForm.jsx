import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useExpenses } from '@/context/ExpenseContext';

const SubcontractorForm = ({ projectId }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addSubcontract } = useExpenses();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !amount) {
      toast({ title: "Error", description: "Name and amount are required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addSubcontract({
        projectId,
        providerName: name, // Using providerName to distinguish from description
        description: name, // Fallback
        amount: parseFloat(amount)
      });
      
      toast({ title: "Success", description: "Subcontractor added successfully" });
      setName('');
      setAmount('');
    } catch (error) {
      toast({ title: "Error", description: "Failed to add subcontractor", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex-1 space-y-1">
        <Label htmlFor="subName" className="text-xs">Subcontractor Name</Label>
        <Input 
          id="subName" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="e.g. Acme Corp"
          className="h-9"
        />
      </div>
      <div className="w-32 space-y-1">
        <Label htmlFor="subAmount" className="text-xs">Amount (€)</Label>
        <Input 
          id="subAmount" 
          type="number" 
          min="0"
          value={amount} 
          onChange={(e) => setAmount(e.target.value)} 
          placeholder="0.00"
          className="h-9"
        />
      </div>
      <Button type="submit" size="sm" className="h-9" disabled={isLoading}>
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      </Button>
    </form>
  );
};

export default SubcontractorForm;