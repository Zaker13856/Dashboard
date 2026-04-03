import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Shield, Lock, Key, CheckCircle2, AlertTriangle, RefreshCcw } from 'lucide-react';

const AdminPasswordReset = () => {
  const { consultants, resetAllConsultantPasswords } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleResetAll = () => {
    setLoading(true);
    // Simulate slight network delay for better UX
    setTimeout(() => {
      const result = resetAllConsultantPasswords();
      setLoading(false);
      
      if (result.success) {
        toast({
          title: "Password Reset Successful",
          description: `Successfully updated passwords for ${result.count} consultants to 'Sistina42@'.`,
          className: "bg-green-50 border-green-200 text-green-900",
        });
      } else {
        toast({
          title: "Reset Failed",
          description: "An error occurred while resetting passwords.",
          variant: "destructive",
        });
      }
    }, 800);
  };

  const hasPasswordSet = (consultant) => {
    return !!consultant.password;
  };

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-red-500 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" />
            <CardTitle>Global Password Management</CardTitle>
          </div>
          <CardDescription>
            Manage authentication credentials for all consultants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex gap-3">
              <div className="p-2 bg-red-100 rounded-full h-fit">
                 <Key className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-900">Bulk Password Reset</h3>
                <p className="text-sm text-red-700 mt-1">
                  Reset all consultant passwords to the default: <code className="bg-white px-2 py-0.5 rounded border border-red-200 font-mono text-xs font-bold">Sistina42@</code>
                </p>
                <p className="text-xs text-red-600 mt-1">
                  This allows all users to log in using their first name (lowercase) as username.
                </p>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="whitespace-nowrap shadow-sm" disabled={loading}>
                  {loading ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                  Reset All Passwords
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" /> Confirm Bulk Reset
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will <strong>overwrite existing passwords</strong> for all {consultants.length} consultants.
                    <br /><br />
                    Everyone will be able to log in with:
                    <br />
                    Username: <span className="font-mono">firstname (lowercase)</span>
                    <br />
                    Password: <span className="font-mono">Sistina42@</span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetAll} className="bg-red-600 hover:bg-red-700">
                    Yes, Reset All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-700">Consultant Account Status</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-white text-gray-500 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Consultant Name</th>
                    <th className="px-4 py-2 text-left font-medium">Username (Derived)</th>
                    <th className="px-4 py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {consultants.map((consultant) => (
                    <tr key={consultant.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{consultant.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {consultant.username || consultant.name.split(' ')[0].toLowerCase()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasPasswordSet(consultant) ? (
                           <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                             <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                           </Badge>
                        ) : (
                           <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                             Pending Reset
                           </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPasswordReset;