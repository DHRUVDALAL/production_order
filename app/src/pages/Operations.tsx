import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, CheckCircle2, Play, AlertCircle } from 'lucide-react';

export const Operations: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  
  // Selected operation for confirmation
  const [selectedOp, setSelectedOp] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    return location.state?.search || '';
  });
  const [statusFilter, setStatusFilter] = useState('ALL');

  React.useEffect(() => {
    if (location.state?.search) {
      setSearchQuery(location.state.search);
    }
  }, [location.state]);
  
  // Confirmation form state
  const [yieldQty, setYieldQty] = useState('100');
  const [scrapQty, setScrapQty] = useState('0');
  const [timeSpent, setTimeSpent] = useState('30');
  const [isFinal, setIsFinal] = useState(true);
  // A confirmation posts financially, so it has to land in an open SAP period.
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch orders that are in STRT (Started) or PCNF (Partially Confirmed) status
  const { data: activeOrders, isLoading } = useQuery({
    queryKey: ['activeOrdersList'],
    queryFn: async () => {
      const res = await api.get("/odata/v4/production/ProductionOrders?$filter=status eq 'STRT' or status eq 'PCNF'&$expand=material,operations($orderby=sequence asc;$expand=workCenter)");
      return res.data?.value || [];
    }
  });

  const confirmOpMutation = useMutation({
    mutationFn: async (confirmPayload: any) => {
      const res = await api.post('/odata/v4/production/confirmOperation', confirmPayload);
      // OData v4 action results are flat — `value` only wraps collections.
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeOrdersList'] });
      setSuccessMsg(`Operation ${selectedOp.sequence} confirmed successfully!`);
      setSelectedOp(null);
      setSelectedOrder(null);
      setYieldQty('100');
      setScrapQty('0');
      setTimeSpent('30');
      setIsFinal(true);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Operation confirmation failed.');
    }
  });

  const handleOpenConfirmDialog = (order: any, op: any) => {
    setSelectedOrder(order);
    setSelectedOp(op);
    setYieldQty(String(order.targetQty ?? 0));
    setScrapQty('0');
    setTimeSpent(String(op.standardTime ?? 0));
    setIsFinal(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (parseFloat(yieldQty) < 0 || parseFloat(scrapQty) < 0 || parseFloat(timeSpent) < 0) {
      setErrorMsg('Quantities and confirmation times must be zero or positive.');
      return;
    }

    if (!postingDate) {
      setErrorMsg('A posting date is required.');
      return;
    }

    confirmOpMutation.mutate({
      orderId: selectedOrder.ID,
      operationId: selectedOp.ID,
      yieldQty: parseFloat(yieldQty),
      scrapQty: parseFloat(scrapQty),
      timeSpent: parseFloat(timeSpent),
      isFinalConfirmation: isFinal,
      postingDate
    });
  };

  const filteredActiveOrders = activeOrders?.filter((order: any) => {
    // 1. Status Filter
    if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;

    // 2. Search query matching orderNumber, material code, or material description
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchOrder = order.orderNumber?.toLowerCase().includes(q);
      const matchMatCode = order.material?.code?.toLowerCase().includes(q);
      const matchMatDesc = order.material?.description?.toLowerCase().includes(q);
      
      if (!matchOrder && !matchMatCode && !matchMatDesc) return false;
    }

    return true;
  }) || [];

  if (isLoading) {
    return (
      <div style={{ 
        padding: '3rem', 
        fontFamily: 'var(--font-sans)', 
        textAlign: 'center', 
        color: '#6a7b8c' 
      }}>
        Loading active work center orders...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#32363a' }}>Shop Floor Operation Confirmations</h2>
        <p style={{ fontSize: '0.85rem', color: '#6a7b8c' }}>Record execution times, yield, and scrap logs for released production routing stages.</p>
      </div>

      {/* Message Banners */}
      {errorMsg && (
        <div style={{ backgroundColor: '#ffe3e3', border: '1px solid #ffb3b3', color: '#bb0000', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1.25rem' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#ebfbee', border: '1px solid #c3fae8', color: '#2b7c2b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, marginBottom: '1.25rem' }}>
          {successMsg}
        </div>
      )}


      {/* Search & Filter Panel */}
      <div className="sap-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <div className="sap-form-group" style={{ marginBottom: 0, flex: 1, minWidth: '250px' }}>
          <label className="sap-label">Search Active Orders</label>
          <input 
            type="text" 
            className="sap-input" 
            placeholder="Search Order #, material code/description..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="sap-form-group" style={{ marginBottom: 0, width: '200px' }}>
          <label className="sap-label">Status Filter</label>
          <select 
            className="sap-input" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Active Orders</option>
            <option value="STRT">Started (STRT)</option>
            <option value="PCNF">Partially Confirmed (PCNF)</option>
          </select>
        </div>

        <button 
          type="button" 
          className="sap-btn sap-btn-secondary" 
          style={{ height: '36px' }}
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('ALL');
          }}
        >
          Reset Filters
        </button>
      </div>

      {/* Grid list of active orders & operations */}
      {filteredActiveOrders.length === 0 ? (
        <div className="sap-card" style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
          <AlertCircle size={32} color="#666" style={{ marginBottom: '0.5rem', display: 'inline' }} />
          <div style={{ marginTop: '0.5rem' }}>No active production orders found matching filters.</div>
          <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>Try clearing filters or release/start orders in the Production Orders page.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {filteredActiveOrders.map((order: any) => (
            <div className="sap-card" key={order.ID}>
              <div className="sap-card-header">
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#888' }}>ORDER: {order.orderNumber}</span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem' }}>{order.material?.code} - {order.material?.description}</h3>
                </div>
                <span className={`sap-badge sap-badge-${order.status}`}>{order.status}</span>
              </div>

              {/* Table of operations */}
              <div className="sap-table-container">
                <table className="sap-table">
                  <thead>
                    <tr>
                      <th>Seq</th>
                      <th>Operation Name</th>
                      <th>Work Center</th>
                      <th>Std Time</th>
                      <th>Spent Time</th>
                      <th>Yield Qty</th>
                      <th>Scrap Qty</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.operations?.map((op: any) => {
                      const priorOps = order.operations.filter((o: any) => o.sequence < op.sequence);
                      const isPriorConfirmed = priorOps.every((o: any) => o.status === 'CNF');
                      const isConfirmable = isPriorConfirmed && op.status !== 'CNF' && (order.status === 'STRT' || order.status === 'PCNF');

                      return (
                        <tr key={op.ID}>
                          <td>{op.sequence}</td>
                          <td style={{ fontWeight: 500 }}>{op.description}</td>
                          {/* SAP operations can carry no work centre, so
                              workCenter_ID is legitimately null here. */}
                          <td>{op.workCenter?.code || op.workCenter?.name || '—'}</td>
                          <td>{parseFloat(op.standardTime).toFixed(0)} MIN</td>
                          <td>{parseFloat(op.confirmedTime).toFixed(0)} MIN</td>
                          <td>{parseFloat(op.yieldQty).toFixed(0)} PC</td>
                          <td>{parseFloat(op.scrapQty).toFixed(0)} PC</td>
                          <td>
                            <span className={`sap-badge sap-badge-${op.status}`}>{op.status}</span>
                          </td>
                          <td>
                            <button
                              className="sap-btn sap-btn-primary"
                              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                              disabled={!isConfirmable}
                              onClick={() => handleOpenConfirmDialog(order, op)}
                            >
                              Confirm
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Inline Dialog for Recording Confirmation */}
              {selectedOp && selectedOrder?.ID === order.ID && (
                <div className="sap-card" style={{ marginTop: '1.5rem', border: '1px solid #0a6ed1', backgroundColor: 'var(--sap-bg-color)' }}>
                  <div className="sap-card-header">
                    <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Record Time & Yield: Op {selectedOp.sequence} ({selectedOp.description})</h4>
                  </div>
                  <form onSubmit={handleConfirmSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                    <div className="sap-form-group">
                      <label className="sap-label">Yield Quantity (PC) *</label>
                      <input type="number" className="sap-input" value={yieldQty} onChange={e => setYieldQty(e.target.value)} min="0" required />
                    </div>

                    <div className="sap-form-group">
                      <label className="sap-label">Scrap Quantity (PC) *</label>
                      <input type="number" className="sap-input" value={scrapQty} onChange={e => setScrapQty(e.target.value)} min="0" required />
                    </div>

                    <div className="sap-form-group">
                      <label className="sap-label">Labor/Machine Time Spent (Min) *</label>
                      <input type="number" className="sap-input" value={timeSpent} onChange={e => setTimeSpent(e.target.value)} min="0" required />
                    </div>

                    <div className="sap-form-group">
                      <label className="sap-label">Posting Date *</label>
                      <input type="date" className="sap-input" value={postingDate} onChange={e => setPostingDate(e.target.value)} required />
                      <span style={{ fontSize: '0.72rem', color: '#6a7b8c', marginTop: '0.25rem' }}>
                        Must fall in an open SAP posting period.
                      </span>
                    </div>

                    <div className="sap-form-group">
                      <label className="sap-label">Confirmation Type</label>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                          <input type="checkbox" checked={isFinal} onChange={e => setIsFinal(e.target.checked)} />
                          <span>Final Confirmation (CNF)</span>
                        </label>
                      </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                      <button type="button" className="sap-btn sap-btn-secondary" onClick={() => { setSelectedOp(null); setSelectedOrder(null); }}>Cancel</button>
                      <button type="submit" className="sap-btn sap-btn-primary" disabled={confirmOpMutation.isPending}>
                        {confirmOpMutation.isPending ? 'Confirming...' : 'Save Confirmation'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
