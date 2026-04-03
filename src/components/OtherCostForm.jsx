import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const OtherCostForm = ({ 
  projectId, 
  initialData = null, 
  onSubmit, 
  onCancel,
  labels = {
    description: "Cost Description",
    amount: "Amount (€)",
    submit: "Save",
    placeholder: "E.g. Software licenses, equipment..."
  }
}) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialData) {
      setFormData({
        description: initialData.description || '',
        amount: initialData.amount || ''
      });
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    onSubmit({
      projectId,
      description: formData.description,
      amount: parseFloat(formData.amount)
    });
    
    setIsSubmitting(false);
    if (!initialData) {
      setFormData({ description: '', amount: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm animate-in fade-in-50">
      <div className="space-y-2">
        <Label htmlFor="other-desc" className="text-sm font-semibold text-gray-700">{labels.description}</Label>
        <Textarea
          id="other-desc"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder={labels.placeholder}
          className="bg-white resize-none"
          rows={2}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="other-amount" className="text-sm font-semibold text-gray-700">{labels.amount}</Label>
        <Input
          id="other-amount"
          type="number"
          step="0.01"
          min="0"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
          placeholder="0.00"
          className="bg-white"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-8">Cancel</Button>
        )}
        <Button type="submit" size="sm" disabled={isSubmitting} className="h-8 bg-blue-600 hover:bg-blue-700 text-white">
          {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
          {initialData ? 'Update Expense' : labels.submit}
        </Button>
      </div>
    </form>
  );
};

export default OtherCostForm;