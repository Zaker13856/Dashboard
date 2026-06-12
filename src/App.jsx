
import React, { lazy, Suspense } from 'react';
import { Route, Routes, BrowserRouter as Router, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

// Lazy loading: ogni pagina diventa un chunk separato, il bundle iniziale
// contiene solo login + shell. Riduce drasticamente il primo caricamento.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ProjectManagement = lazy(() => import('./pages/ProjectManagement'));
const ConsultantsPage = lazy(() => import('./pages/ConsultantsPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ConsultantHome = lazy(() => import('./pages/ConsultantHome'));
const ConsultantExpensesPage = lazy(() => import('./pages/ConsultantExpensesPage'));
const ConsultantTimesheetPage = lazy(() => import('./pages/ConsultantTimesheetPage'));
const RepositoryPage = lazy(() => import('./pages/RepositoryPage'));
const TimesheetsPage = lazy(() => import('./pages/TimesheetsPage'));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-500" />
  </div>
);
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
                <Suspense fallback={<PageLoader />}>
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
                  <Route path="/admin/timesheets" element={<ProtectedRoute allowedRoles={['admin']}><TimesheetsPage /></ProtectedRoute>} />

                  {/* Consultant routes */}
                  <Route path="/consultant" element={<ProtectedRoute allowedRoles={['consultant']}><ConsultantHome /></ProtectedRoute>} />
                  <Route path="/consultant/expenses" element={<ProtectedRoute allowedRoles={['consultant']}><ConsultantExpensesPage /></ProtectedRoute>} />
                  <Route path="/consultant/timesheet" element={<ProtectedRoute allowedRoles={['consultant']}><ConsultantTimesheetPage /></ProtectedRoute>} />

                  {/* Legacy redirects */}
                  <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
                  <Route path="/consultant-dashboard" element={<Navigate to="/consultant" replace />} />

                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
                </Suspense>

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
