import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useExpenses } from '@/context/ExpenseContext';

const ExpensesQuickAddForm = ({ projectId }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addPlannedExpense } = useExpenses();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount) {
      toast({ title: "Error", description: "Description and amount are required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addPlannedExpense({
        projectId,
        description,
        amount: parseFloat(amount)
      });
      
      toast({ title: "Success", description: "Planned expense added successfully" });
      setDescription('');
      setAmount('');
    } catch (error) {
      toast({ title: "Error", description: "Failed to add expense", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex-1 space-y-1">
        <Label htmlFor="expDesc" className="text-xs">Expense Description</Label>
        <Input 
          id="expDesc" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="e.g. Travel to Brussels"
          className="h-9"
        />
      </div>
      <div className="w-32 space-y-1">
        <Label htmlFor="expAmount" className="text-xs">Amount (€)</Label>
        <Input 
          id="expAmount" 
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

export default ExpensesQuickAddForm;