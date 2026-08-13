import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';

interface StatusChange {
  id: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  changedAt: string;
}

export const StatusChangesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: orderBasicInfo } = useQuery({
    queryKey: ['orderBasicInfo', id],
    queryFn: async () => {
      const res = await api.get(`/odata/v4/production/ProductionOrders(${id})?$select=orderNumber,status`);
      return res.data;
    }
  });

  const { data: statusChanges, isLoading } = useQuery<StatusChange[]>({
    queryKey: ['statusChangesPage', id],
    queryFn: async () => {
      const res = await api.post('/odata/v4/production/getStatusChanges', { orderId: id });
      return res.data?.value || res.data || [];
    }
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'CRTD': return '#9ca3af'; // grey
      case 'MACA': return '#f97316'; // orange
      case 'REL': return '#3b82f6'; // blue
      case 'STRT': return '#a855f7'; // purple
      case 'PCNF': return '#eab308'; // yellow
      case 'CNF': return '#22c55e'; // green
      case 'INSP': return '#14b8a6'; // teal
      case 'DLV': return '#06b6d4'; // cyan
      case 'TECO': return '#1e3a8a'; // navy
      case 'CLSD': return '#1f2937'; // dark
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to={`/orders/${id}`} className="sap-btn sap-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
          Order: {orderBasicInfo?.orderNumber || id} - Status Changes
        </h1>
      </div>

      <div className="sap-card">
        <div className="sap-card-header">
          <h2 className="sap-card-title">Status Change Timeline</h2>
        </div>
        <div style={{ padding: '1rem' }}>
          {isLoading && <div>Loading...</div>}
          {!isLoading && statusChanges?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              No status changes recorded yet.
            </div>
          )}
          {!isLoading && statusChanges && statusChanges.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginLeft: '1rem', borderLeft: '2px solid #e5e7eb', paddingLeft: '1.5rem' }}>
              {statusChanges.map((change, index) => (
                <div key={change.id || index} style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '-1.9rem',
                    top: '0.25rem',
                    width: '0.75rem',
                    height: '0.75rem',
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(change.toStatus),
                    border: '2px solid white'
                  }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ fontWeight: 'bold' }}>
                      <span className="sap-badge" style={{ backgroundColor: getStatusColor(change.fromStatus), color: 'white' }}>{change.fromStatus}</span>
                      <span style={{ margin: '0 0.5rem' }}>→</span>
                      <span className="sap-badge" style={{ backgroundColor: getStatusColor(change.toStatus), color: 'white' }}>{change.toStatus}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                      Changed by <strong>{change.changedBy}</strong> on {new Date(change.changedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
