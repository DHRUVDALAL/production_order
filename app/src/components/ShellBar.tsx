import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRealTime } from '../contexts/RealTimeContext';
import { LogOut, LayoutDashboard, ClipboardList, ShieldAlert, PackageCheck, Wrench, Settings, RefreshCw } from 'lucide-react';

export const ShellBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', roles: ['SYS_ADMIN', 'PROD_PLANNER', 'PROD_OPERATOR', 'INV_MANAGER', 'QUAL_INSPECTOR', 'PLANT_SUPV', 'PLANT_MGR'], icon: <LayoutDashboard size={16} /> },
    { label: 'Production Orders', path: '/orders', roles: ['SYS_ADMIN', 'PROD_PLANNER', 'INV_MANAGER', 'PLANT_SUPV', 'PLANT_MGR'], icon: <ClipboardList size={16} /> },
    { label: 'Confirm Operations', path: '/operations', roles: ['SYS_ADMIN', 'PROD_OPERATOR', 'PLANT_SUPV'], icon: <Wrench size={16} /> },
    { label: 'Quality Control', path: '/quality', roles: ['SYS_ADMIN', 'QUAL_INSPECTOR', 'PLANT_SUPV'], icon: <ShieldAlert size={16} /> },
    { label: 'Goods Movement', path: '/goods-issue', roles: ['SYS_ADMIN', 'PURCHASER'], icon: <PackageCheck size={16} /> },
    { label: 'Stock & Inventory', path: '/inventory', roles: ['SYS_ADMIN', 'INV_MANAGER', 'PLANT_SUPV', 'PLANT_MGR'], icon: <PackageCheck size={16} /> },
    { label: 'Administration', path: '/admin', roles: ['SYS_ADMIN'], icon: <Settings size={16} /> },
  ];

  return (
    <header style={{
      height: '48px',
      backgroundColor: '#354a5f', // Classic SAP Fiori ShellBar navy blue
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      fontFamily: 'var(--font-sans)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }}>
          SAP S/4HANA
          <span style={{ 
            color: '#354a5f', 
            backgroundColor: '#ffffff', 
            padding: '2px 6px', 
            borderRadius: '4px', 
            marginLeft: '6px',
            fontSize: '0.75rem',
            fontWeight: 800
          }}>PP-PORTAL</span>
        </div>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          {navItems.filter(item => item.roles.includes(user.role)).map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                style={{
                  color: isActive ? '#ffffff' : '#d9d9d9',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Real-time Event Mesh Sync Status Badge */}
        <RealTimeStatusBadge />

        <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
          <div style={{ fontWeight: 600 }}>{user.name}</div>
          <div style={{ opacity: 0.85 }}>{user.role.replace('_', ' ')} • {user.department}</div>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s'
          }}
          title="Sign Out"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

const RealTimeStatusBadge: React.FC = () => {
  const { isConnected, lastEvent, triggerSync } = useRealTime();
  const [showToast, setShowToast] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (lastEvent) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastEvent]);

  const handleManualSync = () => {
    setIsRefreshing(true);
    triggerSync();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
      <button 
        onClick={handleManualSync}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '14px',
          backgroundColor: isConnected ? 'rgba(40, 167, 69, 0.25)' : 'rgba(220, 53, 69, 0.25)',
          border: `1px solid ${isConnected ? '#28a745' : '#dc3545'}`,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#ffffff',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s ease'
        }}
        title="Click to manually refresh and sync live data from SAP S/4HANA Public Cloud"
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isConnected ? 'rgba(40, 167, 69, 0.4)' : 'rgba(220, 53, 69, 0.4)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isConnected ? 'rgba(40, 167, 69, 0.25)' : 'rgba(220, 53, 69, 0.25)'; }}
      >
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#28a745' : '#dc3545',
          boxShadow: isConnected ? '0 0 8px #28a745' : 'none'
        }} />
        {isConnected ? 'SAP Live Sync: Active' : 'Live Sync: Offline'}
        <RefreshCw size={13} style={{ marginLeft: '4px', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
      </button>

      {showToast && lastEvent && (() => {
        const isManual = lastEvent.source === 'MANUAL_USER_TRIGGER';
        const accentColor = isManual ? '#28a745' : '#3b82f6';
        
        let title = isManual ? '✔ Sync Complete' : '⚡ SAP Live Event';
        let message = isManual 
          ? 'Successfully synced with SAP S/4HANA Public Cloud' 
          : `${lastEvent.eventType.replace('ProductionOrder.', '').replace('sap.s4.beh.productionorder.v1.ProductionOrder.', '')}${lastEvent.orderId ? ` (Order #${lastEvent.orderId})` : ''}`;

        return (
          <div style={{
            position: 'absolute',
            top: '38px',
            right: '0',
            backgroundColor: '#1e293b',
            color: '#ffffff',
            padding: '8px 14px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            borderLeft: `4px solid ${accentColor}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontWeight: 700, color: accentColor }}>{title}:</span>
            <span>{message}</span>
          </div>
        );
      })()}
    </div>
  );
};
