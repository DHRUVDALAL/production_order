import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { ClipboardList, Play, CheckCircle2, ShieldAlert, FileText, Bell, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch production orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['productionOrders'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/ProductionOrders');
      return res.data?.value || [];
    }
  });

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/ProductionNotifications?$expand=order');
      return res.data?.value || [];
    }
  });

  if (ordersLoading || notificationsLoading) {
    return (
      <div style={{ 
        padding: '3rem', 
        fontFamily: 'var(--font-sans)', 
        textAlign: 'center', 
        color: '#6a7b8c' 
      }}>
        Loading manufacturing metrics...
      </div>
    );
  }

  // Calculate metrics
  const total = ordersData.length;
  const draft = ordersData.filter((o: any) => o.status === 'DRAFT').length;
  const created = ordersData.filter((o: any) => o.status === 'CRTD' || o.status === 'MACA').length;
  const inProgress = ordersData.filter((o: any) => ['REL', 'STRT', 'GI', 'GMPS', 'INSP', 'CNF'].includes(o.status)).length;
  const completed = ordersData.filter((o: any) => ['GR', 'PDLV', 'DLV', 'TECO', 'CLSD'].includes(o.status)).length;

  // Recent 5 alerts
  const recentAlerts = notificationsData.slice(0, 5);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#32363a' }}>Manufacturing Executive Dashboard</h2>
          <p style={{ fontSize: '0.85rem', color: '#6a7b8c' }}>Real-time production visibility, operation throughput, and quality metrics.</p>
        </div>
        <div style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid #d9d9d9', fontWeight: 600 }}>
          Active plant context: <span style={{ color: '#0a6ed1' }}>Dallas Assembly (PL01)</span>
        </div>
      </div>

      {/* KPI Tiles (Standard SAP Fiori Style) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="sap-card" style={{ borderLeft: '4px solid #5c6b77' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5c6b77', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Draft Planning Orders</span>
            <FileText size={18} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{draft}</div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>Awaiting BOM/Routing explosion</div>
        </div>

        <div className="sap-card" style={{ borderLeft: '4px solid #0d6efd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0d6efd', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Created Orders (CRTD)</span>
            <ClipboardList size={18} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{created}</div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>BOM exploded, awaiting release</div>
        </div>

        <div className="sap-card" style={{ borderLeft: '4px solid #1c7ed6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1c7ed6', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active in Execution</span>
            <Play size={18} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{inProgress}</div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>Shop floor operations active</div>
        </div>

        <div className="sap-card" style={{ borderLeft: '4px solid #37b24d' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#37b24d', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Technically Completed</span>
            <CheckCircle2 size={18} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{completed}</div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>GR posted, variance settled</div>
        </div>
      </div>

      <div className="sap-grid-2">
        {/* Recent Alerts & Notifications */}
        <div className="sap-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="sap-card-header">
            <h3 className="sap-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={18} color="#e9730c" />
              <span>Shop Floor Alerts & Exceptions</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>Last 5 occurrences</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {recentAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '2rem 0', fontSize: '0.85rem' }}>
                No active production exceptions logged.
              </div>
            ) : (
              recentAlerts.map((n: any) => (
                <div key={n.ID} style={{
                  display: 'flex',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: n.type === 'ALERT' ? '#fff9db' : '#f8f9fa',
                  border: `1px solid ${n.type === 'ALERT' ? '#ffe066' : '#dee2e6'}`,
                  borderRadius: '6px',
                  fontSize: '0.85rem'
                }}>
                  {n.type === 'ALERT' ? (
                    <AlertTriangle size={18} color="#f08c00" style={{ flexShrink: 0 }} />
                  ) : (
                    <Bell size={18} color="#0a6ed1" style={{ flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, color: '#333' }}>
                      Order {n.order?.orderNumber || 'Unknown'}
                    </div>
                    <div style={{ color: '#555', marginTop: '0.2rem' }}>{n.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Plant Activity & Shortcuts */}
        <div className="sap-card">
          <div className="sap-card-header">
            <h3 className="sap-card-title">Quick Actions & Navigation</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {user && ['SYS_ADMIN', 'PROD_PLANNER'].includes(user.role) && (
              <Link to="/orders" style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                padding: '1rem',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                color: '#32363a',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0a6ed1'; e.currentTarget.style.backgroundColor = '#f1f8ff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Create Production Order</span>
                <span style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.25rem' }}>Explode BOM and dispatch routing</span>
              </Link>
            )}

            {user && ['SYS_ADMIN', 'PROD_OPERATOR'].includes(user.role) && (
              <Link to="/operations" style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                padding: '1rem',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                color: '#32363a',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0a6ed1'; e.currentTarget.style.backgroundColor = '#f1f8ff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Confirm Operations</span>
                <span style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.25rem' }}>Log times, yield and scrap quantities</span>
              </Link>
            )}

            {user && ['SYS_ADMIN', 'QUAL_INSPECTOR'].includes(user.role) && (
              <Link to="/quality" style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                padding: '1rem',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                color: '#32363a',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0a6ed1'; e.currentTarget.style.backgroundColor = '#f1f8ff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Quality Inspection</span>
                <span style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.25rem' }}>Record usage decisions (UDAC/UDRJ)</span>
              </Link>
            )}

            {user && ['SYS_ADMIN', 'INV_MANAGER'].includes(user.role) && (
              <Link to="/inventory" style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                padding: '1rem',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                color: '#32363a',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0a6ed1'; e.currentTarget.style.backgroundColor = '#f1f8ff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#dee2e6'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Inventory Status</span>
                <span style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.25rem' }}>Check raw components and stage output</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
