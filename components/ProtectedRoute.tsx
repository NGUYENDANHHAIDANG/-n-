import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-messenger-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-messenger-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;