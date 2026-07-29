import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, ShieldAlert, Award, AlertTriangle, Calendar } from 'lucide-react';

export const QualityInspection: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [approvedQty, setApprovedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('0');
  const [decision, setDecision] = useState('UDAC'); // UDAC or UDRJ
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Inspection lots
  const { data: lots, isLoading } = useQuery({
    queryKey: ['inspectionLotsList'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/QualityInspectionLots?$expand=order,material,plant');
      return res.data?.value || [];
    }
  });

  const submitDecisionMutation = useMutation({
    mutationFn: async (decisionPayload: any) => {
      const res = await api.post('/odata/v4/production/submitUsageDecision', decisionPayload);
      // OData v4 action results are flat — `value` only wraps collections.
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspectionLotsList'] });
      setSuccessMsg(`Usage Decision recorded successfully for Lot ${selectedLot.lotNumber}!`);
      setSelectedLot(null);
      setApprovedQty('');
      setRejectedQty('0');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to submit Usage Decision.');
    }
  });

  const handleOpenDecisionDialog = (lot: any) => {
    setSelectedLot(lot);
    setApprovedQty(lot.lotQty.toString());
    setRejectedQty('0');
    setDecision('UDAC');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const appQtyVal = parseFloat(approvedQty);
    const rejQtyVal = parseFloat(rejectedQty);
    const totalQtyVal = parseFloat(selectedLot.lotQty);

    if (isNaN(appQtyVal) || isNaN(rejQtyVal)) {
      setErrorMsg('Please specify valid approved and rejected quantities.');
      return;
    }

    if (appQtyVal + rejQtyVal !== totalQtyVal) {
      setErrorMsg(`The sum of Approved (${appQtyVal}) and Rejected (${rejQtyVal}) quantities must exactly equal the lot quantity (${totalQtyVal}).`);
      return;
    }

    submitDecisionMutation.mutate({
      lotId: selectedLot.ID,
      approvedQty: appQtyVal,
      rejectedQty: rejQtyVal,
      usageDecision: decision
    });
  };

  if (isLoading) {
    return (
      <div style={{ 
        padding: '3rem', 
        fontFamily: 'var(--font-sans)', 
        textAlign: 'center', 
        color: '#6a7b8c' 
      }}>
        Loading quality inspection lots...
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#32363a' }}>Quality Inspection Lots & Usage Decisions</h2>
        <p style={{ fontSize: '0.85rem', color: '#6a7b8c' }}>Execute inspection lot approvals (UDAC) and scrap/blocked entries (UDRJ) post-execution.</p>
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

      {/* Usage Decision Modal Dialog */}
      {selectedLot && (
        <div className="sap-card" style={{ marginBottom: '2rem', border: '1px solid #7048e8' }}>
          <div className="sap-card-header">
            <h3 className="sap-card-title">Record Usage Decision (UD): Lot {selectedLot.lotNumber}</h3>
          </div>
          <form onSubmit={handleDecisionSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="sap-form-group">
              <label className="sap-label">Lot Target Qty</label>
              <div style={{ padding: '0.5rem 0', fontWeight: 600 }}>{parseFloat(selectedLot.lotQty).toFixed(0)} PC</div>
            </div>

            <div className="sap-form-group">
              <label className="sap-label">Approved Quantity (PC) *</label>
              <input type="number" className="sap-input" value={approvedQty} onChange={e => setApprovedQty(e.target.value)} min="0" max={selectedLot.lotQty} required />
            </div>

            <div className="sap-form-group">
              <label className="sap-label">Rejected Quantity (PC) *</label>
              <input type="number" className="sap-input" value={rejectedQty} onChange={e => setRejectedQty(e.target.value)} min="0" max={selectedLot.lotQty} required />
            </div>

            <div className="sap-form-group">
              <label className="sap-label">Usage Decision Code *</label>
              <select className="sap-input" value={decision} onChange={e => setDecision(e.target.value)} required>
                <option value="UDAC">UDAC - Approved (Unrestricted Use)</option>
                <option value="UDRJ">UDRJ - Rejected (Blocked/Scrap Stock)</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" className="sap-btn sap-btn-secondary" onClick={() => setSelectedLot(null)}>Cancel</button>
              <button type="submit" className="sap-btn" style={{ backgroundColor: '#7048e8', color: 'white' }} disabled={submitDecisionMutation.isPending}>
                {submitDecisionMutation.isPending ? 'Submitting...' : 'Submit UD'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lot List Tables */}
      <div className="sap-card">
        <div className="sap-card-header">
          <h3 className="sap-card-title">All In-Production Inspection Lots</h3>
        </div>
        <div className="sap-table-container">
          <table className="sap-table">
            <thead>
              <tr>
                <th>Lot Number</th>
                <th>Order Number</th>
                <th>Product</th>
                <th>Plant</th>
                <th>Lot Qty</th>
                <th>Usage Decision</th>
                <th>Status</th>
                <th>Decision Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lots.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No quality inspection lots found.</td>
                </tr>
              ) : (
                lots.map((l: any) => (
                  <tr key={l.ID}>
                    <td style={{ fontWeight: 600, color: '#7048e8' }}>{l.lotNumber}</td>
                    <td>{l.order?.orderNumber}</td>
                    <td>{l.material?.code}</td>
                    <td>{l.plant?.code}</td>
                    <td style={{ fontWeight: 600 }}>{parseFloat(l.lotQty).toFixed(0)} PC</td>
                    <td>
                      {l.usageDecision ? (
                        <span style={{
                          fontWeight: 700,
                          color: l.usageDecision === 'UDAC' ? '#2b7c2b' : '#bb0000',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          {l.usageDecision === 'UDAC' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                          <span>{l.usageDecision === 'UDAC' ? 'APPROVED' : 'REJECTED'}</span>
                        </span>
                      ) : (
                        <span style={{ color: '#888', fontStyle: 'italic' }}>Pending Decision</span>
                      )}
                    </td>
                    <td>
                      <span className={`sap-badge sap-badge-${l.status === 'COMP' ? 'TECO' : 'CRTD'}`}>
                        {l.status === 'COMP' ? 'Completed' : 'Created'}
                      </span>
                    </td>
                    <td>{l.decisionDate ? new Date(l.decisionDate).toLocaleDateString() : '-'}</td>
                    <td>
                      <button
                        className="sap-btn"
                        style={{
                          backgroundColor: l.status === 'COMP' ? '#e2e7ec' : '#7048e8',
                          color: l.status === 'COMP' ? '#5c6b77' : 'white',
                          padding: '2px 8px',
                          fontSize: '0.75rem'
                        }}
                        disabled={l.status === 'COMP'}
                        onClick={() => handleOpenDecisionDialog(l)}
                      >
                        {l.status === 'COMP' ? 'Closed' : 'Submit UD'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
