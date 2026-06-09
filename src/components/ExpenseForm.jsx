import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { useExpenses } from '@/context/ExpenseContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, PlusCircle, Euro, Calendar, Calculator } from 'lucide-react';

const EXPENSE_TYPES = [
  'Transportation',
  'Lodging',
  'Meals'
];

const ExpenseForm = () => {
  const { user } = useAuth();
  const { projects } = useTimesheet();
  const { addExpense } = useExpenses();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    type: '',
    amount: '',
    iva: '',
    eligibleCosts: 0,
    description: '',
    days: '',
  });

  // Calculate Eligible Costs whenever Amount or IVA changes
  useEffect(() => {
    const totalAmount = parseFloat(formData.amount) || 0;
    const vatAmount = parseFloat(formData.iva) || 0;
    
    // Ensure Eligible Cost is not negative if VAT > Amount (though we'll validate this on submit)
    const calculatedEligible = Math.max(0, totalAmount - vatAmount);
    
    setFormData(prev => ({
      ...prev,
      eligibleCosts: parseFloat(calculatedEligible.toFixed(2))
    }));
  }, [formData.amount, formData.iva]);

  // Safe filter
  const activeProjects = Array.isArray(projects) ? projects.filter(p => p.status !== 'Completed') : [];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
        toast({ title: "Errore", description: "Sessione scaduta", variant: "destructive" });
        return;
    }

    if (!formData.projectId || !formData.date || !formData.type || !formData.amount) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori.",
        variant: "destructive"
      });
      return;
    }

    const totalAmount = parseFloat(formData.amount);
    const vatAmount = parseFloat(formData.iva) || 0;

    if (totalAmount <= 0) {
      toast({
        title: "Errore",
        description: "L'importo deve essere maggiore di zero.",
        variant: "destructive"
      });
      return;
    }

    if (vatAmount > totalAmount) {
      toast({
        title: "Errore",
        description: "L'IVA non può essere superiore all'importo totale.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 600));

        const selectedProject = projects.find(p => p.id === formData.projectId);

        const descWithCategory = formData.description
          ? `[${formData.type}] ${formData.description}`
          : `[${formData.type}]`;

        const result = await addExpense({
          consultantId: user.id,
          projectId: formData.projectId,
          date: formData.date,
          type: 'travel',
          amount: totalAmount,
          iva: vatAmount,
          eligibleAmount: formData.eligibleCosts,
          description: descWithCategory,
          days: parseInt(formData.days) || null,
        });

        if (result?.error) {
          toast({
            title: "Errore salvataggio",
            description: result.error.message || String(result.error),
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Successo",
          description: "Spesa registrata correttamente.",
        });

        setFormData({
          projectId: '',
          date: new Date().toISOString().split('T')[0],
          type: '',
          amount: '',
          iva: '',
          eligibleCosts: 0,
          description: '',
          days: '',
        });
    } catch (e) {
        console.error("Expense submission failed", e);
        toast({
            title: "Errore",
            description: "Si è verificato un errore durante il salvataggio.",
            variant: "destructive"
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card className="border-t-4 border-t-purple-500 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-purple-600" />
          Nuova Spesa
        </CardTitle>
        <CardDescription>
          Compila il modulo per registrare una nuova spesa di trasferta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Project */}
            <div className="space-y-2">
              <Label htmlFor="project">Progetto *</Label>
              <Select 
                value={formData.projectId} 
                onValueChange={(val) => handleChange('projectId', val)}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Seleziona progetto" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.length > 0 ? (
                    activeProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Nessun progetto attivo</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Data Spesa *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* 3. Expense Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo Spesa *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(val) => handleChange('type', val)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Total Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Importo Totale (€) *</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* 5. VAT (IVA) */}
            <div className="space-y-2">
              <Label htmlFor="iva">IVA (€)</Label>
              <div className="relative">
                <Input
                  id="iva"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.iva}
                  onChange={(e) => handleChange('iva', e.target.value)}
                />
              </div>
            </div>

            {/* 5b. Days */}
            <div className="space-y-2">
              <Label htmlFor="days">Giorni missione</Label>
              <Input
                id="days"
                type="number"
                min="1"
                placeholder="es. 2"
                value={formData.days}
                onChange={(e) => handleChange('days', e.target.value)}
              />
            </div>

            {/* 6. Eligible Costs (Read Only) */}
            <div className="space-y-2">
              <Label htmlFor="eligible" className="text-purple-700 font-semibold">Eligible Costs (€)</Label>
              <div className="relative">
                <Calculator className="absolute left-3 top-2.5 h-4 w-4 text-purple-600" />
                <Input
                  id="eligible"
                  type="number"
                  value={formData.eligibleCosts}
                  readOnly
                  className="pl-9 bg-purple-50 font-medium text-purple-900 border-purple-200"
                />
              </div>
              <p className="text-xs text-gray-500">Calcolato come: Importo Totale - IVA</p>
            </div>
          </div>

          {/* 7. Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione / Note</Label>
            <Textarea
              id="description"
              placeholder="Dettagli aggiuntivi (es. nome ristorante, tratta viaggio...)"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              'Registra Spesa'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;