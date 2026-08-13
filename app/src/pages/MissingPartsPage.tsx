import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../services/api';

interface MissingPart {
  id: string;
  materialCode: string;
  materialDescription: string;
  requiredQty: number;
  availableQty: number;
  shortageQty: number;
  unit: string;
  status: string;
}

export const MissingPartsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: missingParts, isLoading } = useQuery<MissingPart[]>({
    queryKey: ['missingParts', id],
    queryFn: async () => {
      const res = await api.post('/odata/v4/production/getMissingParts', { orderId: id });
      return res.data?.value || res.data || [];
    }
  });

  const recheckMutation = useMutation({
    mutationFn: async () => {
      await api.post('/odata/v4/production/checkMaterialAvailability', { orderId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missingParts', id] });
    }
  });

  const shortageCount = missingParts?.filter(p => p.shortageQty > 0).length || 0;

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'MSPT': return <span className="sap-badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>Material Shortage</span>;
      case 'RESV': return <span className="sap-badge" style={{ backgroundColor: '#dbeafe', color: '#1e3a8a', border: '1px solid #bfdbfe' }}>Reserved</span>;
      case 'ISSD': return <span className="sap-badge" style={{ backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>Issued</span>;
      default: return <span className="sap-badge">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to={`/orders/${id}`} className="sap-btn sap-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Missing Parts: Order {id}</h1>
      </div>

      <div className="sap-card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isLoading ? (
            <div>Loading...</div>
          ) : shortageCount > 0 ? (
            <>
              <AlertTriangle color="#dc2626" size={24} />
              <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '1.125rem' }}>
                {shortageCount} components have material shortages
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 color="#16a34a" size={24} />
              <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.125rem' }}>
                All components available
              </span>
            </>
          )}
        </div>
        <button 
          className="sap-btn sap-btn-primary" 
          onClick={() => recheckMutation.mutate()}
          disabled={recheckMutation.isPending}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} className={recheckMutation.isPending ? 'spin' : ''} /> Recheck Availability
        </button>
      </div>

      <div className="sap-card">
        <div className="sap-card-header">
          <h2 className="sap-card-title">Components List</h2>
        </div>
        <div className="sap-table-container">
          <table className="sap-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Required Qty</th>
                <th style={{ textAlign: 'right' }}>Available Qty</th>
                <th style={{ textAlign: 'right' }}>Shortage Qty</th>
                <th>Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>}
              {!isLoading && missingParts?.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    No missing parts found. All components are available.
                  </td>
                </tr>
              )}
              {!isLoading && missingParts?.map(part => (
                <tr key={part.id || part.materialCode}>
                  <td>{part.materialCode}</td>
                  <td>{part.materialDescription}</td>
                  <td style={{ textAlign: 'right' }}>{part.requiredQty}</td>
                  <td style={{ textAlign: 'right' }}>{part.availableQty}</td>
                  <td style={{ textAlign: 'right', color: part.shortageQty > 0 ? '#dc2626' : 'inherit', fontWeight: part.shortageQty > 0 ? 'bold' : 'normal' }}>
                    {part.shortageQty}
                  </td>
                  <td>{part.unit}</td>
                  <td>{getStatusBadge(part.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
