import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';

interface ChangeLog {
  id: string;
  actionType: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedOn: string;
}

export const ChangeManagementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const { data: orderBasicInfo } = useQuery({
    queryKey: ['orderBasicInfo', id],
    queryFn: async () => {
      const res = await api.get(`/odata/v4/production/ProductionOrders(${id})?$select=orderNumber`);
      return res.data;
    }
  });

  const { data: changes, isLoading } = useQuery<ChangeLog[]>({
    queryKey: ['changeManagement', id],
    queryFn: async () => {
      const res = await api.post('/odata/v4/production/getChangeManagement', { orderId: id });
      return res.data?.value || res.data || [];
    }
  });

  const filteredChanges = changes?.filter(c => filterAction === 'ALL' || c.actionType === filterAction) || [];
  
  const actionTypes = Array.from(new Set(changes?.map(c => c.actionType) || []));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to={`/orders/${id}`} className="sap-btn sap-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
          Change Management: Order {orderBasicInfo?.orderNumber || id}
        </h1>
      </div>

      <div className="sap-card">
        <div className="sap-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="sap-card-title">Change Log</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="sap-label">Filter Action:</label>
            <select className="sap-input" style={{ width: 'auto' }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="ALL">All Actions</option>
              {actionTypes.map(at => <option key={at} value={at}>{at}</option>)}
            </select>
          </div>
        </div>
        <div className="sap-table-container">
          <table className="sap-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Field Name</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Changed By</th>
                <th>Changed On</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>}
              {!isLoading && filteredChanges.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No changes found.
                  </td>
                </tr>
              )}
              {!isLoading && filteredChanges.map((change, idx) => (
                <tr key={change.id || idx}>
                  <td><span className="sap-badge" style={{ backgroundColor: '#e5e7eb', color: '#374151' }}>{change.actionType}</span></td>
                  <td>{change.fieldName}</td>
                  <td>{change.oldValue || '-'}</td>
                  <td>{change.newValue || '-'}</td>
                  <td>{change.changedBy}</td>
                  <td>{new Date(change.changedOn).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
