import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { ShieldCheck, History, Database, UserCheck } from 'lucide-react';

export const Admin: React.FC = () => {
  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/admin/Users');
      return res.data?.value || [];
    }
  });

  // Fetch Audit Logs
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/admin/AuditLogs?$expand=user');
      return res.data?.value || [];
    }
  });

  if (usersLoading || auditLoading) {
    return (
      <div style={{ 
        padding: '3rem', 
        fontFamily: 'var(--font-sans)', 
        textAlign: 'center', 
        color: '#6a7b8c' 
      }}>
        Loading administrative panel...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#32363a' }}>Administration & System Audit Trails</h2>
        <p style={{ fontSize: '0.85rem', color: '#6a7b8c' }}>Monitor user login authorizations, change histories, and relational audit traces.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* User Registry */}
        <div className="sap-card">
          <div className="sap-card-header">
            <h3 className="sap-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={18} color="#0a6ed1" />
              <span>Plant Authorized User Registry</span>
            </h3>
          </div>
          <div className="sap-table-container">
            <table className="sap-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((u: any) => (
                  <tr key={u.ID}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Change Audit Logs */}
        <div className="sap-card">
          <div className="sap-card-header">
            <h3 className="sap-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} color="#e9730c" />
              <span>Transaction & Security Change Log (Audit Trail)</span>
            </h3>
          </div>
          <div className="sap-table-container">
            <table className="sap-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User Executing</th>
                  <th>Action Triggered</th>
                  <th>Target Entity</th>
                  <th>Modified State / Values</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs?.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: '1.5rem' }}>No system logs recorded.</td>
                  </tr>
                ) : (
                  auditLogs?.slice().reverse().map((l: any) => (
                    <tr key={l.ID}>
                      <td style={{ fontSize: '0.75rem', color: '#555' }}>
                        {new Date(l.createdAt || Date.now()).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{l.user?.name || 'System / Batch'}</td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: l.action.includes('LOGIN') ? '#0ca678' : l.action.includes('RELEASE') ? '#f08c00' : '#0d6efd',
                          fontSize: '0.8rem'
                        }}>
                          {l.action}
                        </span>
                      </td>
                      <td>{l.entityName}</td>
                      <td>
                        {l.newValues && (
                          <pre style={{
                            margin: 0,
                            padding: '4px 8px',
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                          }}>
                            {l.newValues}
                          </pre>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
