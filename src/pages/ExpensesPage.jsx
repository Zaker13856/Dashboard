import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AdminExpensesSection from '@/components/AdminExpensesSection';

const ExpensesPage = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses Management</h1>
          <p className="text-gray-500">Track and manage all project costs, planned expenses, and subcontractors.</p>
        </div>

        <AdminExpensesSection />
      </div>
    </AdminLayout>
  );
};

export default ExpensesPage;