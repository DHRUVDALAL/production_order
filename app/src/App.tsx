import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RouteGuard } from './components/RouteGuard';
import { ShellBar } from './components/ShellBar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ProductionOrders } from './pages/ProductionOrders';
import { ProductionOrderDetail } from './pages/ProductionOrderDetail';
import { Operations } from './pages/Operations';
import { QualityInspection } from './pages/QualityInspection';
import { Inventory } from './pages/Inventory';
import { Admin } from './pages/Admin';
import { Unauthorized } from './pages/Unauthorized';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ShellBar />
      <main style={{ flex: 1, backgroundColor: '#f4f6fa' }}>
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <RouteGuard>
              <AppLayout><Dashboard /></AppLayout>
            </RouteGuard>
          } />

          <Route path="/orders" element={
            <RouteGuard allowedRoles={['SYS_ADMIN', 'PROD_PLANNER', 'INV_MANAGER', 'PLANT_SUPV', 'PLANT_MGR', 'QUAL_INSPECTOR', 'PROD_OPERATOR']}>
              <AppLayout><ProductionOrders /></AppLayout>
            </RouteGuard>
          } />

          <Route path="/orders/:id" element={
            <RouteGuard allowedRoles={['SYS_ADMIN', 'PROD_PLANNER', 'INV_MANAGER', 'PLANT_SUPV', 'PLANT_MGR', 'QUAL_INSPECTOR', 'PROD_OPERATOR']}>
              <AppLayout><ProductionOrderDetail /></AppLayout>
            </RouteGuard>
          } />

          <Route path="/operations" element={
            <RouteGuard allowedRoles={['SYS_ADMIN', 'PROD_OPERATOR', 'PLANT_SUPV']}>
              <AppLayout><Operations /></AppLayout>
            </RouteGuard>
          } />

          <Route path="/quality" element={
            <RouteGuard allowedRoles={['SYS_ADMIN', 'QUAL_INSPECTOR', 'PLANT_SUPV']}>
              <AppLayout><QualityInspection /></AppLayout>
            </RouteGuard>
          } />

          <Route path="/inventory" element={
            <RouteGuard allowedRoles={['SYS_ADMIN', 'INV_MANAGER', 'PLANT_SUPV', 'PLANT_MGR']}>
              <AppLayout><Inventory /></AppLayout>
            </RouteGuard>
          } />

          <Route path="/admin" element={
            <RouteGuard allowedRoles={['SYS_ADMIN']}>
              <AppLayout><Admin /></AppLayout>
            </RouteGuard>
          } />
          
          <Route path="*" element={<RouteGuard><AppLayout><Dashboard /></AppLayout></RouteGuard>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
