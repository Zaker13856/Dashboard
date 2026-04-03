
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to login but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.warn(`⛔ [Auth] Access Denied. User role '${user.role}' not in allowed list:`, allowedRoles);
    
    // Redirect to the appropriate dashboard based on their ACTUAL role
    if (user.role === 'admin') {
      return <Navigate to="/admin-dashboard" replace />;
    }
    
    if (user.role === 'consultant') {
      return <Navigate to="/consultant" replace />;
    }
    
    // Fallback
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
