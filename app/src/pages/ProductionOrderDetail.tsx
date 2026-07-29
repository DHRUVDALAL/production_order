import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle2, ShieldAlert, Play, ShoppingCart, Truck, AlertTriangle } from 'lucide-react';

export const ProductionOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [grQty, setGrQty] = useState('');
  const [grSlocId, setGrSlocId] = useState('');
  const [showGrForm, setShowGrForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['orderDetail', id],
    queryFn: async () => {
      const res = await api.get(`/odata/v4/production/ProductionOrders(${id})?$expand=material,plant,storageLocation,operations($orderby=sequence asc;$expand=workCenter),components($expand=componentMaterial),goodsMovements($expand=material)`);
      return res.data;
    }
  });

  const { data: slocs } = useQuery({
    queryKey: ['slocsList'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/StorageLocations');
      return res.data?.value || [];
    }
  });

  // Action Mutations
  const checkMaterialMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/checkMaterialAvailability', { orderId: id });
      // OData v4 action results come back flat, not wrapped in `value` —
      // that wrapper only exists on collection reads.
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      if (data?.shortageCount > 0) {
        setErrorMsg(`Material availability checked: Found shortage in ${data.shortageCount} components!`);
      } else {
        setSuccessMsg('All raw material components are fully available!');
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Check failed.');
    }
  });

  const releaseOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/releaseOrder', { orderId: id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg('Production order successfully released to shop floor!');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Release failed.');
    }
  });

  const startOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/startOrder', { orderId: id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg('Manufacturing execution started. First operation is active.');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Start failed.');
    }
  });

  const postGrMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/postGoodsReceipt', {
        orderId: id,
        quantity: parseFloat(grQty),
        slocId: grSlocId
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      const resVal = data?.value || data;
      const docNum = resVal?.docNum || 'unknown';
      setSuccessMsg(`Goods Receipt posted successfully! Material Document: ${docNum}`);
      setShowGrForm(false);
      setGrQty('');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Goods receipt failed.');
    }
  });

  if (isLoading || !order) {
    return <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Loading order details...</div>;
  }

  const handlePostGR = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!grQty || !grSlocId) {
      setErrorMsg('Please specify quantity and storage location.');
      return;
    }
    postGrMutation.mutate();
  };

  // Find slocs for local plant
  const localSlocs = slocs?.filter((s: any) => s.plant_ID === order.plant_ID) || [];

  // Determine stage index for progress bar
  const statusFlow = ['DRAFT', 'CRTD', 'MACA', 'REL', 'STRT', 'GI', 'INSP', 'CNF', 'GR', 'TECO', 'CLSD'];
  let currentStageIndex = statusFlow.indexOf(order.status);
  if (order.status === 'GMPS') currentStageIndex = statusFlow.indexOf('GI');
  if (order.status === 'PDLV' || order.status === 'DLV') currentStageIndex = statusFlow.indexOf('GR');

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      {/* Back link */}
      <Link to="/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0a6ed1', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} />
        <span>Back to Order Monitor</span>
      </Link>

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

      {/* Progress Flow Indicator */}
      <div className="sap-card" style={{ marginBottom: '2rem', padding: '1rem 1.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '0.5rem', minWidth: '950px' }}>
          {statusFlow.map((stage, idx) => {
            const isCompleted = idx <= currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <React.Fragment key={stage}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flex: 1, minWidth: '55px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: isCurrent ? '#0a6ed1' : isCompleted ? '#37b24d' : '#dee2e6',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: isCurrent ? '3px solid #e8f4fd' : 'none'
                  }}>
                    {idx + 1}
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#0a6ed1' : '#495057' }}>{stage}</span>
                </div>
                {idx < statusFlow.length - 1 && (
                  <div style={{ height: '2px', backgroundColor: idx < currentStageIndex ? '#37b24d' : '#dee2e6', flex: 1, minWidth: '15px' }}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout (Header / Actions) */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Header Details Card */}
        <div className="sap-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="sap-card-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Production Order: {order.orderNumber}</h2>
              <span className={`sap-badge sap-badge-${order.status}`}>{order.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', fontSize: '0.85rem' }}>
              <div>
                <strong style={{ color: '#666' }}>Header Product</strong>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{order.material?.code}</div>
                <div style={{ color: '#777', fontSize: '0.75rem' }}>{order.material?.description}</div>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Target Quantity</strong>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{parseFloat(order.targetQty).toFixed(0)} PC</div>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Confirmed Yield</strong>
                <div style={{ fontWeight: 600, marginTop: '0.2rem', color: '#2b7c2b' }}>{parseFloat(order.confirmedQty).toFixed(0)} PC</div>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Delivered to Warehouse</strong>
                <div style={{ fontWeight: 600, marginTop: '0.2rem', color: '#087f5b' }}>{parseFloat(order.deliveredQty).toFixed(0)} PC</div>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Plant & Stage Location</strong>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{order.plant?.name} ({order.plant?.code})</div>
                <div style={{ color: '#777', fontSize: '0.75rem' }}>SLoc: {order.storageLocation?.code}</div>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Planned Scheduling Dates</strong>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{order.plannedStartDate} $\rightarrow$ {order.plannedEndDate}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="sap-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#555', marginBottom: '0.25rem' }}>Operations Control</h4>
          
          {/* ATP Button */}
          {user && ['SYS_ADMIN', 'PROD_PLANNER', 'PROD_OPERATOR'].includes(user.role) && (order.status === 'CRTD' || order.status === 'MACA') && (
            <button 
              className="sap-btn sap-btn-secondary" 
              style={{ width: '100%' }}
              onClick={() => checkMaterialMutation.mutate()}
              disabled={checkMaterialMutation.isPending}
            >
              <ShoppingCart size={16} />
              <span>{checkMaterialMutation.isPending ? 'Checking...' : 'Check Availability (ATP)'}</span>
            </button>
          )}

          {/* Release Button */}
          {user && ['SYS_ADMIN', 'PROD_PLANNER'].includes(user.role) && (order.status === 'CRTD' || order.status === 'MACA') && (
            <button 
              className="sap-btn sap-btn-primary" 
              style={{ width: '100%' }}
              onClick={() => releaseOrderMutation.mutate()}
              disabled={releaseOrderMutation.isPending}
            >
              <CheckCircle2 size={16} />
              <span>{releaseOrderMutation.isPending ? 'Releasing...' : 'Release Order (REL)'}</span>
            </button>
          )}

          {/* Start Execution Button */}
          {user && ['SYS_ADMIN', 'PROD_PLANNER', 'PROD_OPERATOR'].includes(user.role) && (order.status === 'REL') && (
            <button 
              className="sap-btn sap-btn-primary" 
              style={{ width: '100%' }}
              onClick={() => startOrderMutation.mutate()}
              disabled={startOrderMutation.isPending}
            >
              <Play size={16} />
              <span>{startOrderMutation.isPending ? 'Starting...' : 'Start Execution'}</span>
            </button>
          )}

          {/* Goods Receipt Button */}
          {user && ['SYS_ADMIN', 'INV_MANAGER'].includes(user.role) && (order.status === 'CNF' || order.status === 'PCNF') && (
            <button 
              className="sap-btn sap-btn-primary" 
              style={{ width: '100%', backgroundColor: '#2b7c2b' }}
              onClick={() => { setShowGrForm(true); setGrSlocId(order.storageLocation_ID); }}
            >
              <Truck size={16} />
              <span>Post Goods Receipt (101)</span>
            </button>
          )}

          {/* If no action matches */}
          {!['CRTD', 'MACA', 'REL', 'CNF', 'PCNF'].includes(order.status) && (
            <div style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center', padding: '0.5rem 0' }}>
              No current control actions available in status <strong>{order.status}</strong>.
            </div>
          )}
        </div>
      </div>

      {/* Goods Receipt Posting Dialog Form */}
      {showGrForm && (
        <div className="sap-card" style={{ marginBottom: '2rem', border: '1px solid #2b7c2b' }}>
          <div className="sap-card-header">
            <h3 className="sap-card-title" style={{ color: '#2b7c2b' }}>Goods Receipt - Movement 101</h3>
          </div>
          <form onSubmit={handlePostGR} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="sap-form-group" style={{ flex: 1, minWidth: '150px' }}>
              <label className="sap-label">Receipt Quantity (PC) *</label>
              <input 
                type="number" 
                className="sap-input" 
                value={grQty} 
                onChange={e => setGrQty(e.target.value)} 
                max={parseFloat(order.targetQty) - parseFloat(order.deliveredQty)} 
                required 
              />
            </div>

            <div className="sap-form-group" style={{ flex: 2, minWidth: '200px' }}>
              <label className="sap-label">Storage Location (GR Stage) *</label>
              <select className="sap-input" value={grSlocId} onChange={e => setGrSlocId(e.target.value)} required>
                <option value="">-- Select Storage --</option>
                {localSlocs.map((s: any) => (
                  <option key={s.ID} value={s.ID}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <button type="button" className="sap-btn sap-btn-secondary" onClick={() => setShowGrForm(false)}>Cancel</button>
              <button type="submit" className="sap-btn sap-btn-primary" style={{ backgroundColor: '#2b7c2b' }} disabled={postGrMutation.isPending}>
                {postGrMutation.isPending ? 'Posting...' : 'Post Inventory'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Routing Operations */}
      <div className="sap-card" style={{ marginBottom: '2rem' }}>
        <div className="sap-card-header">
          <h3 className="sap-card-title">Routing & Sequence Operations</h3>
        </div>
        <div className="sap-table-container">
          <table className="sap-table">
            <thead>
              <tr>
                <th>Seq No</th>
                <th>Operation Description</th>
                <th>Work Center</th>
                <th>Std Time</th>
                <th>Spent Time</th>
                <th>Yield Qty</th>
                <th>Scrap Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {order.operations?.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>No routing operations defined.</td>
                </tr>
              ) : (
                order.operations?.map((op: any) => (
                  <tr key={op.ID}>
                    <td>{op.sequence}</td>
                    <td style={{ fontWeight: 500 }}>{op.description}</td>
                    <td>{op.workCenter?.name || op.workCenter_ID}</td>
                    <td>{parseFloat(op.standardTime).toFixed(0)} {op.timeUnit}</td>
                    <td>{parseFloat(op.confirmedTime).toFixed(0)} {op.timeUnit}</td>
                    <td style={{ color: '#2b7c2b', fontWeight: 600 }}>{parseFloat(op.yieldQty).toFixed(0)} PC</td>
                    <td style={{ color: '#bb0000' }}>{parseFloat(op.scrapQty).toFixed(0)} PC</td>
                    <td>
                      <span className={`sap-badge sap-badge-${op.status}`}>{op.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOM Components and ATP check status */}
      <div className="sap-card" style={{ marginBottom: '2rem' }}>
        <div className="sap-card-header">
          <h3 className="sap-card-title">Bill of Materials (BOM) Requirements & Availability</h3>
        </div>
        <div className="sap-table-container">
          <table className="sap-table">
            <thead>
              <tr>
                <th>Component Code</th>
                <th>Description</th>
                <th>Required Qty</th>
                <th>Issued Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {order.components?.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>No components listed.</td>
                </tr>
              ) : (
                order.components?.map((c: any) => (
                  <tr key={c.ID}>
                    <td style={{ fontWeight: 600 }}>{c.componentMaterial?.code}</td>
                    <td>{c.componentMaterial?.description}</td>
                    <td>{parseFloat(c.requiredQty).toFixed(0)} {c.unit}</td>
                    <td>{parseFloat(c.issuedQty).toFixed(0)} {c.unit}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: c.status === 'ISSD' ? '#ebfbee' : c.status === 'MSPT' ? '#ffe3e3' : '#e8f4fd',
                        color: c.status === 'ISSD' ? '#2b7c2b' : c.status === 'MSPT' ? '#bb0000' : '#0a6ed1',
                      }}>
                        {c.status === 'MSPT' && <AlertTriangle size={12} />}
                        <span>{c.status === 'RESV' ? 'Reserved' : c.status === 'MSPT' ? 'Material Shortage' : 'Issued'}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goods Movement Logs (SAP Document Ledger) */}
      <div className="sap-card">
        <div className="sap-card-header">
          <h3 className="sap-card-title">Associated Goods Movements (Material Document Log)</h3>
        </div>
        <div className="sap-table-container">
          <table className="sap-table">
            <thead>
              <tr>
                <th>Doc Number</th>
                <th>Movement Type</th>
                <th>Material</th>
                <th>Quantity</th>
                <th>Posting Date</th>
              </tr>
            </thead>
            <tbody>
              {order.goodsMovements?.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: '1.5rem' }}>No material movements recorded.</td>
                </tr>
              ) : (
                order.goodsMovements?.map((gm: any) => (
                  <tr key={gm.ID}>
                    <td style={{ fontWeight: 600 }}>{gm.movementNumber}</td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{gm.movementType}</span>
                      <span style={{ fontSize: '0.75rem', color: '#777', marginLeft: '0.4rem' }}>
                        ({gm.movementType === '101' ? 'Goods Receipt' : gm.movementType === '261' ? 'Goods Issue' : gm.movementType === '350' ? 'QM Blocked' : 'Stock Entry'})
                      </span>
                    </td>
                    <td>{gm.material?.code}</td>
                    <td style={{ fontWeight: 600 }}>{parseFloat(gm.quantity).toFixed(0)} {gm.unit}</td>
                    <td>{gm.postingDate}</td>
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
