import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RealTimeProvider } from './contexts/RealTimeContext';
import { RouteGuard } from './components/RouteGuard';
import { ShellBar } from './components/ShellBar';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { ProductionOrders } from './pages/ProductionOrders';
import { ProductionOrderDetail } from './pages/ProductionOrderDetail';
import { Operations } from './pages/Operations';
import { QualityInspection } from './pages/QualityInspection';
import { Inventory } from './pages/Inventory';
import { Admin } from './pages/Admin';
import { Unauthorized } from './pages/Unauthorized';
import { MissingPartsPage } from './pages/MissingPartsPage';
import { StatusChangesPage } from './pages/StatusChangesPage';
import { ChangeManagementPage } from './pages/ChangeManagementPage';
import { StockRequirementsPage } from './pages/StockRequirementsPage';
import { OutputManagementPage } from './pages/OutputManagementPage';
import { GoodsIssuePage } from './pages/GoodsIssuePage';

const PageTitleUpdater: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      document.title = 'ProdOps | Dashboard';
    } else if (path === '/landing') {
      document.title = 'ProdOps | Production Planning, Execution & Quality Platform';
    } else if (path === '/orders') {
      document.title = 'ProdOps | Production Orders';
    } else if (path.startsWith('/orders/') && path.includes('/goods-issue')) {
      document.title = 'ProdOps | Goods Issue';
    } else if (path.startsWith('/orders/') && path.includes('/missing-parts')) {
      document.title = 'ProdOps | Missing Parts';
    } else if (path.startsWith('/orders/') && path.includes('/status-changes')) {
      document.title = 'ProdOps | Status Changes';
    } else if (path.startsWith('/orders/') && path.includes('/change-management')) {
      document.title = 'ProdOps | Change Management';
    } else if (path.startsWith('/orders/') && path.includes('/outputs')) {
      document.title = 'ProdOps | Output Management';
    } else if (path.startsWith('/orders/')) {
      document.title = 'ProdOps | Order Details';
    } else if (path === '/operations') {
      document.title = 'ProdOps | Confirm Operations';
    } else if (path === '/quality') {
      document.title = 'ProdOps | Quality Control';
    } else if (path === '/goods-issue') {
      document.title = 'ProdOps | Goods Movements';
    } else if (path === '/stock-requirements') {
      document.title = 'ProdOps | Stock Requirements';
    } else if (path === '/inventory') {
      document.title = 'ProdOps | Stock & Inventory';
    } else if (path === '/admin') {
      document.title = 'ProdOps | Administration';
    } else if (path === '/login') {
      document.title = 'ProdOps | Login';
    } else if (path === '/unauthorized') {
      document.title = 'ProdOps | Unauthorized';
    } else {
      document.title = 'ProdOps | Production Planning, Execution & Quality Platform';
    }
  }, [location.pathname]);

  return null;
};

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
      <RealTimeProvider>
        <Router>
          <PageTitleUpdater />
          <Routes>
            {/* Public Routes */}
            <Route path="/landing" element={<LandingPage />} />
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

            <Route path="/orders/:id/missing-parts" element={
              <RouteGuard allowedRoles={['SYS_ADMIN', 'PROD_PLANNER', 'INV_MANAGER', 'PLANT_SUPV', 'PLANT_MGR', 'QUAL_INSPECTOR', 'PROD_OPERATOR']}>
                <AppLayout><MissingPartsPage /></AppLayout>
              </RouteGuard>
            } />

            <Route path="/orders/:id/status-changes" element={
              <RouteGuard allowedRoles={['SYS_ADMIN', 'PROD_PLANNER', 'INV_MANAGER', 'PLANT_SUPV', 'PLANT_MGR', 'QUAL_INSPECTOR', 'PROD_OPERATOR']}>
                <AppLayout><StatusChangesPage /></AppLayout>
              </RouteGuard>
            } />

            <Route path="/orders/:id/change-management" element={
              <RouteGuard allowedRoles={['SYS_ADMIN', 'PROD_PLANNER', 'PLANT_SUPV', 'PLANT_MGR']}>
                <AppLayout><ChangeManagementPage /></AppLayout>
              </RouteGuard>
            } />

            <Route path="/orders/:id/outputs" element={
              <RouteGuard allowedRoles={['SYS_ADMIN', 'PROD_PLANNER', 'PLANT_SUPV', 'PLANT_MGR']}>
                <AppLayout><OutputManagementPage /></AppLayout>
              </RouteGuard>
            } />

            <Route path="/goods-issue" element={
              <RouteGuard allowedRoles={['SYS_ADMIN', 'PURCHASER']}>
                <AppLayout><GoodsIssuePage /></AppLayout>
              </RouteGuard>
            } />

            <Route path="/orders/:id/goods-issue" element={
              <RouteGuard allowedRoles={['SYS_ADMIN', 'PURCHASER']}>
                <AppLayout><GoodsIssuePage /></AppLayout>
              </RouteGuard>
            } />

            <Route path="/stock-requirements" element={
              <RouteGuard allowedRoles={['SYS_ADMIN', 'PROD_PLANNER', 'INV_MANAGER', 'PLANT_SUPV', 'PLANT_MGR', 'PROD_OPERATOR']}>
                <AppLayout><StockRequirementsPage /></AppLayout>
              </RouteGuard>
            } />

            <Route path="/operations" element={
              <RouteGuard allowedRoles={['SYS_ADMIN', 'PROD_OPERATOR', 'PLANT_SUPV', 'PROD_PLANNER', 'PLANT_MGR']}>
                <AppLayout><Operations /></AppLayout>
              </RouteGuard>
            } />

            <Route path="/quality" element={
              <RouteGuard allowedRoles={['SYS_ADMIN', 'QUAL_INSPECTOR', 'PLANT_SUPV', 'PROD_PLANNER', 'PLANT_MGR']}>
                <AppLayout><QualityInspection /></AppLayout>
              </RouteGuard>
            } />

            <Route path="/inventory" element={
              <RouteGuard allowedRoles={['SYS_ADMIN', 'INV_MANAGER', 'PLANT_SUPV', 'PLANT_MGR', 'PROD_PLANNER']}>
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
      </RealTimeProvider>
    </AuthProvider>
  );
}

export default App;
