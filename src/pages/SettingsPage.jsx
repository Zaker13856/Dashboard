import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AdminPasswordReset from '@/components/AdminPasswordReset';

const SettingsPage = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
          <p className="text-gray-500">Configurazione sistema e gestione credenziali</p>
        </div>
        <AdminPasswordReset />
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;