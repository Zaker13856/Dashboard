import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, CheckCircle, Lock } from 'lucide-react';

const AdminConsultantForm = () => {
  const { addConsultant, DEFAULT_PASSWORD } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    rate: '',
    password: DEFAULT_PASSWORD
  });
  
  const [lastAdded, setLastAdded] = useState(null);

  // Auto-generate username from surname when name changes
  useEffect(() => {
    if (formData.name) {
       const parts = formData.name.trim().split(' ');
       if (parts.length > 0) {
         // Set username to surname (last part of name)
         // This matches the requirement: "username = surname (cognome)"
         const surname = parts[parts.length - 1];
         // Only update if user hasn't manually changed it yet or it's empty
         // But based on requirement, we probably want to enforce this logic or suggest it strongly
         if (!formData.username || formData.username !== surname) {
            setFormData(prev => ({ ...prev, username: surname }));
         }
       }
    }
  }, [formData.name]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.username.trim()) {
      toast({ title: "Error", description: "Name and Username are required", variant: "destructive" });
      return;
    }
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      toast({ title: "Error", description: "Valid hourly rate is required", variant: "destructive" });
      return;
    }

    // Prepare data object
    const consultantData = {
      name: formData.name.trim(),
      // Ensure we extract surname properly if not explicitly handled elsewhere, 
      // but here we rely on the username field which we auto-filled with surname
      surname: formData.username.trim(), 
      username: formData.username.trim(),
      password: formData.password || DEFAULT_PASSWORD,
      hourlyRate: parseFloat(formData.rate),
      role: 'consultant'
    };

    console.log("📝 [AdminForm] Attempting to save consultant:", consultantData);

    try {
      const newConsultant = addConsultant(consultantData);

      console.log("✅ [AdminForm] Consultant saved successfully:", newConsultant);

      setLastAdded(newConsultant);
      toast({ 
        title: "Success", 
        description: `Consultant ${newConsultant.name} added.`, 
        variant: "default" 
      });
      
      // Reset form but keep default password
      setFormData({
        name: '',
        username: '',
        rate: '',
        password: DEFAULT_PASSWORD
      });
    } catch (error) {
      console.error("❌ [AdminForm] Error saving consultant:", error);
      toast({ title: "Error", description: "Failed to add consultant", variant: "destructive" });
    }
  };

  return (
    <Card className="border-l-4 border-l-purple-600">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-purple-600" />
          Add New Consultant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name"
                name="name"
                placeholder="e.g. Daniel Cassola" 
                value={formData.name} 
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Login Username (Surname)</Label>
              <Input 
                id="username"
                name="username"
                placeholder="e.g. Cassola" 
                value={formData.username} 
                onChange={handleChange}
                className="font-mono bg-slate-50"
              />
              <p className="text-xs text-muted-foreground">Auto-set to surname. Used for login.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rate">Hourly Rate (€)</Label>
              <Input 
                id="rate"
                name="rate"
                type="number" 
                step="0.01"
                placeholder="45.00" 
                value={formData.rate} 
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                  id="password"
                  name="password"
                  value={formData.password} 
                  onChange={handleChange}
                  className="pl-9"
                  readOnly // Make it effectively default unless they really want to change it via some override mechanism not shown here
                />
              </div>
              <p className="text-xs text-muted-foreground">Default: Sistina42@</p>
            </div>
          </div>

          <Button type="submit" className="w-full md:w-auto bg-purple-600 hover:bg-purple-700">
            Create Consultant
          </Button>
          
          {lastAdded && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-green-800">User Successfully Created!</p>
                <p className="text-green-700">
                  Login (Username): <strong>{lastAdded.username}</strong><br/>
                  Password: <strong>{lastAdded.password}</strong>
                </p>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminConsultantForm;