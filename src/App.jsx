
import React from 'react';
import { Route, Routes, BrowserRouter as Router, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ProjectManagement from './pages/ProjectManagement';
import ConsultantsPage from './pages/ConsultantsPage';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';
import ConsultantHome from './pages/ConsultantHome';
import ConsultantExpensesPage from './pages/ConsultantExpensesPage';
import ConsultantTimesheetPage from './pages/ConsultantTimesheetPage';
import RepositoryPage from './pages/RepositoryPage';
import { AuthProvider } from './context/AuthContext';
import { TimesheetProvider } from './context/TimesheetContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { MissionProvider } from './context/MissionContext';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <TimesheetProvider>
            <ExpenseProvider>
              <MissionProvider>
              <ScrollToTop />
              <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/" element={<Navigate to="/login" replace />} />

                  {/* Admin routes */}
                  <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/projects" element={<ProtectedRoute allowedRoles={['admin']}><ProjectManagement /></ProtectedRoute>} />
                  <Route path="/admin/consultants" element={<ProtectedRoute allowedRoles={['admin']}><ConsultantsPage /></ProtectedRoute>} />
                  <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><ReportsPage /></ProtectedRoute>} />
                  <Route path="/admin/expenses" element={<ProtectedRoute allowedRoles={['admin']}><ExpensesPage /></ProtectedRoute>} />
                  <Route path="/admin/repository" element={<ProtectedRoute allowedRoles={['admin']}><RepositoryPage /></ProtectedRoute>} />

                  {/* Consultant routes */}
                  <Route path="/consultant" element={<ProtectedRoute allowedRoles={['consultant']}><ConsultantHome /></ProtectedRoute>} />
                  <Route path="/consultant/expenses" element={<ProtectedRoute allowedRoles={['consultant']}><ConsultantExpensesPage /></ProtectedRoute>} />
                  <Route path="/consultant/timesheet" element={<ProtectedRoute allowedRoles={['consultant']}><ConsultantTimesheetPage /></ProtectedRoute>} />

                  {/* Legacy redirects */}
                  <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
                  <Route path="/consultant-dashboard" element={<Navigate to="/consultant" replace />} />

                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>

                <Toaster />
              </div>
              </MissionProvider>
            </ExpenseProvider>
          </TimesheetProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
