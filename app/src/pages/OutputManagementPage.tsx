import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import api from '../services/api';

interface OutputItem {
  id: string;
  outputType: string;
  description: string;
  transmission: string;
  status: string; // NEW, SENT, ERROR
  scheduledAt: string;
}

export const OutputManagementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: outputItems, isLoading } = useQuery<OutputItem[]>({
    queryKey: ['outputItems', id],
    queryFn: async () => {
      const res = await api.post('/odata/v4/production/getOutputItems', { orderId: id });
      return res.data?.value || res.data || [];
    }
  });

  const reprintMutation = useMutation({
    mutationFn: async (outputType: string) => {
      await api.post('/odata/v4/production/reprintOutput', { orderId: id, outputType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outputItems', id] });
      alert('Reprint triggered successfully.');
    },
    onError: () => {
      alert('Failed to trigger reprint.');
    }
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'NEW': return <span className="sap-badge" style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>New</span>;
      case 'SENT': return <span className="sap-badge" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>Sent</span>;
      case 'ERROR': return <span className="sap-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>Error</span>;
      default: return <span className="sap-badge">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to={`/orders/${id}`} className="sap-btn sap-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Output Management</h1>
      </div>

      <div className="sap-card">
        <div className="sap-card-header">
          <h2 className="sap-card-title">Output Items</h2>
        </div>
        <div className="sap-table-container">
          <table className="sap-table">
            <thead>
              <tr>
                <th>Output Type</th>
                <th>Description</th>
                <th>Transmission</th>
                <th>Status</th>
                <th>Scheduled At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>}
              {!isLoading && outputItems?.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No output items found for this order.
                  </td>
                </tr>
              )}
              {!isLoading && outputItems?.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td>{item.outputType}</td>
                  <td>{item.description}</td>
                  <td>{item.transmission}</td>
                  <td>{getStatusBadge(item.status)}</td>
                  <td>{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : '-'}</td>
                  <td>
                    <button 
                      className="sap-btn sap-btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      onClick={() => reprintMutation.mutate(item.outputType)}
                      disabled={reprintMutation.isPending}
                    >
                      <Printer size={14} /> Reprint
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
