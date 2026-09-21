import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        background: '#f4f6f8',
        color: '#32363a'
      }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/branding/prodops-icon-transparent.png" alt="ProdOps" style={{ width: '44px', height: '44px', marginBottom: '10px' }} />
          <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px', color: '#082641' }}>ProdOps</div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Initializing Production Operations Session...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
