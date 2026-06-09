import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  adminOnly?: boolean;
  userOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false, userOnly = false }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-humbee-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Verifying secure session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = user?.role === 'admin';

  // Admin attempting a user-only route → send to /admin
  if (userOnly && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Non-admin attempting an admin-only route → send to /submission
  if (adminOnly && !isAdmin) {
    return <Navigate to="/submission" replace />;
  }

  return children;
};

export default ProtectedRoute;
