import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings } from 'lucide-react';

const SettingsPage = () => {
  return (
    <AdminLayout>
       <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">System configuration and preferences</p>
        </div>

        <Card className="border-l-4 border-l-slate-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-slate-600" />
              Settings Module
            </CardTitle>
            <CardDescription>
              This section is under construction. Configuration options are currently split between Hours Limits and Security tabs on the Dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-gray-600">
              Future features will include: global rate management, notification settings, and system audit logs.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;