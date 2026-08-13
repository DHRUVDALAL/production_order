import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';

interface StockRequirement {
  id: string;
  date: string;
  type: string; // Stock, ProdOrder, SalesOrder
  description: string;
  quantity: number;
  cumulativeQty: number;
  reference: string;
  status: string;
}

export const StockRequirementsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const materialCode = searchParams.get('material') || '';
  const plantCode = searchParams.get('plant') || '';

  const { data: list, isLoading } = useQuery<StockRequirement[]>({
    queryKey: ['stockRequirements', materialCode, plantCode],
    queryFn: async () => {
      const res = await api.post('/odata/v4/production/getStockRequirementsList', { materialCode, plantCode });
      return res.data?.value || res.data || [];
    },
    enabled: !!materialCode && !!plantCode
  });

  const getRowColor = (type: string) => {
    switch(type) {
      case 'Stock': return '#f3f4f6'; // grey
      case 'ProdOrder': return '#eff6ff'; // blue
      case 'SalesOrder': return '#f0fdf4'; // green
      default: return 'transparent';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} className="sap-btn sap-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
          Stock/Requirements List: {materialCode} / Plant {plantCode}
        </h1>
      </div>

      <div className="sap-card">
        <div className="sap-table-container">
          <table className="sap-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Cumulative Qty</th>
                <th>Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>}
              {!isLoading && (!list || list.length === 0) && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    No stock/requirements found for this material and plant.
                  </td>
                </tr>
              )}
              {!isLoading && list?.map((item, idx) => (
                <tr key={item.id || idx} style={{ backgroundColor: getRowColor(item.type) }}>
                  <td>{item.date ? new Date(item.date).toLocaleDateString() : '-'}</td>
                  <td>{item.type}</td>
                  <td>{item.description}</td>
                  <td style={{ textAlign: 'right', color: item.quantity < 0 ? '#dc2626' : 'inherit' }}>
                    {item.quantity > 0 ? '+' : ''}{item.quantity}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: item.cumulativeQty < 0 ? '#dc2626' : '#16a34a' }}>
                    {item.cumulativeQty}
                  </td>
                  <td>{item.reference}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
