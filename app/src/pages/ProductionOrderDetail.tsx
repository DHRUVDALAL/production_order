import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle2, ShieldAlert, Play, ShoppingCart, Truck, AlertTriangle, Edit2, DollarSign, PieChart, ListFilter, Scale } from 'lucide-react';

export const ProductionOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [grQty, setGrQty] = useState('');
  const [grSlocId, setGrSlocId] = useState('');
  const [showGrForm, setShowGrForm] = useState(false);
  const [showCostsModal, setShowCostsModal] = useState(false);
  const [activeCostTab, setActiveCostTab] = useState<'analysis' | 'itemization' | 'split' | 'balance'>('analysis');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [editQtyValue, setEditQtyValue] = useState('');

  const updateQtyMutation = useMutation({
    mutationFn: async (newQty: number) => {
      setErrorMsg('');
      setSuccessMsg('');
      const res = await api.patch(`/odata/v4/production/ProductionOrders(${id})`, {
        targetQty: newQty
      });
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('Target quantity updated successfully!');
      setIsEditingQty(false);
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update target quantity.');
    }
  });

  // Fetch Order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['orderDetail', id],
    queryFn: async () => {
      const res = await api.get(`/odata/v4/production/ProductionOrders(${id})?$expand=material,plant,storageLocation,operations($orderby=sequence asc;$expand=workCenter),components($expand=componentMaterial),goodsMovements($expand=material)`);
      const orderData = res.data;

      // Safely fetch costs and costItems in separate calls to avoid OData expand composition errors
      try {
        const [costsRes, costItemsRes] = await Promise.all([
          api.get(`/odata/v4/production/OrderCosts?$filter=order_ID eq ${id}`),
          api.get(`/odata/v4/production/OrderCostItemizations?$filter=order_ID eq ${id}&$orderby=itemNumber asc`)
        ]);
        orderData.costs = costsRes.data?.value?.[0] || null;
        orderData.costItems = costItemsRes.data?.value || [];
      } catch (costErr) {
        console.warn('Could not fetch cost details:', costErr);
        orderData.costs = null;
        orderData.costItems = [];
      }

      return orderData;
    }
  });

  // Cost calculation action mutation
  const calculateCostsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/calculateOrderCosts', { orderId: id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg('Order costs recalculated successfully!');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Cost calculation failed.');
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
  // Determine stage index for progress bar
  const statusFlow = ['DRAFT', 'CRTD', 'MACA', 'REL', 'GI', 'CNF', 'GR', 'TECO', 'CLSD'];
  let mappedStatus = 'CRTD';
  const activeStatuses = (order.status || '').split(' ');
  if (activeStatuses.includes('CLSD')) mappedStatus = 'CLSD';
  else if (activeStatuses.includes('TECO')) mappedStatus = 'TECO';
  else if (activeStatuses.includes('DLV') || activeStatuses.includes('PDLV')) mappedStatus = 'GR';
  else if (activeStatuses.includes('CNF') || activeStatuses.includes('PCNF')) mappedStatus = 'CNF';
  else if (activeStatuses.includes('REL')) mappedStatus = 'REL';
  else if (activeStatuses.includes('DRAFT')) mappedStatus = 'DRAFT';

  let currentStageIndex = statusFlow.indexOf(mappedStatus);

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
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {(order.status || '').split(' ').map((st: string) => (
                  <span key={st} className={`sap-badge sap-badge-${st}`}>{st}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', fontSize: '0.85rem' }}>
              <div>
                <strong style={{ color: '#666' }}>Header Product</strong>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{order.material?.code}</div>
                <div style={{ color: '#777', fontSize: '0.75rem' }}>{order.material?.description}</div>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Target Quantity</strong>
                {isEditingQty ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <input
                      type="number"
                      value={editQtyValue}
                      onChange={(e) => setEditQtyValue(e.target.value)}
                      style={{
                        width: '70px',
                        padding: '2px 5px',
                        fontSize: '0.85rem',
                        border: '1px solid var(--sap-border-color)',
                        borderRadius: '4px'
                      }}
                    />
                    <button
                      onClick={() => {
                        const val = parseFloat(editQtyValue);
                        if (!isNaN(val) && val > 0) {
                          updateQtyMutation.mutate(val);
                        }
                      }}
                      disabled={updateQtyMutation.isPending}
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#37b24d',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingQty(false)}
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#fa5252',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginTop: '0.2rem' }}>
                    <span>{parseFloat(order.targetQty).toFixed(0)} PC</span>
                    {(order.status?.split(' ').includes('CRTD') || order.status?.split(' ').includes('REL')) && (
                      <Edit2
                        size={14}
                        style={{ cursor: 'pointer', color: '#0a6ed1' }}
                        onClick={() => {
                          setEditQtyValue(parseFloat(order.targetQty).toFixed(0));
                          setIsEditingQty(true);
                        }}
                      />
                    )}
                  </div>
                )}
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
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#555', marginBottom: '0.25rem' }}>Operations & Costs Control</h4>

          {/* Cost Order Button (SAP Public HANA style) */}
          <button 
            className="sap-btn" 
            style={{ width: '100%', backgroundColor: '#5c7cfa', color: '#ffffff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
            onClick={() => {
              calculateCostsMutation.mutate();
              setShowCostsModal(true);
            }}
            disabled={calculateCostsMutation.isPending}
          >
            <DollarSign size={16} />
            <span>{calculateCostsMutation.isPending ? 'Calculating Costs...' : 'Cost Order (Goto -> Costs)'}</span>
          </button>
          
          {/* ATP Button */}
          {user && ['SYS_ADMIN', 'PROD_PLANNER', 'PROD_OPERATOR'].includes(user.role) && (order.status?.split(' ').includes('CRTD') || order.status?.split(' ').includes('MACA')) && (
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
          {user && ['SYS_ADMIN', 'PROD_PLANNER'].includes(user.role) && (order.status?.split(' ').includes('CRTD') || order.status?.split(' ').includes('MACA')) && (
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
          {user && ['SYS_ADMIN', 'PROD_PLANNER', 'PROD_OPERATOR'].includes(user.role) && (order.status?.split(' ').includes('REL')) && (
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
          {user && ['SYS_ADMIN', 'INV_MANAGER'].includes(user.role) && (order.status?.split(' ').includes('CNF') || order.status?.split(' ').includes('PCNF')) && (
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
          {!order.status?.split(' ').some((st: string) => ['CRTD', 'MACA', 'REL', 'CNF', 'PCNF'].includes(st)) && (
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

      {/* SAP Costing Views Dialog Modal */}
      {showCostsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '1050px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              backgroundColor: '#1c2430',
              color: '#ffffff',
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DollarSign size={20} style={{ color: '#4dabf7' }} />
                  <span>Production Order Costs: {order.orderNumber}</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#adb5bd' }}>SAP S/4HANA Public Cloud Cost Accounting (CO-PC)</span>
              </div>
              <button
                onClick={() => setShowCostsModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#ffffff', fontSize: '1.25rem', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {/* Sub-menu Tabs: Analysis, Itemization, Cost Component Split, Balance */}
            <div style={{
              display: 'flex',
              backgroundColor: '#f1f3f5',
              borderBottom: '1px solid #dee2e6',
              padding: '0 1rem'
            }}>
              <button
                onClick={() => setActiveCostTab('analysis')}
                style={{
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeCostTab === 'analysis' ? '3px solid #0a6ed1' : '3px solid transparent',
                  color: activeCostTab === 'analysis' ? '#0a6ed1' : '#495057',
                  fontWeight: activeCostTab === 'analysis' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem'
                }}
              >
                <PieChart size={16} />
                <span>Analysis</span>
              </button>

              <button
                onClick={() => setActiveCostTab('itemization')}
                style={{
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeCostTab === 'itemization' ? '3px solid #0a6ed1' : '3px solid transparent',
                  color: activeCostTab === 'itemization' ? '#0a6ed1' : '#495057',
                  fontWeight: activeCostTab === 'itemization' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem'
                }}
              >
                <ListFilter size={16} />
                <span>Itemization</span>
              </button>

              <button
                onClick={() => setActiveCostTab('split')}
                style={{
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeCostTab === 'split' ? '3px solid #0a6ed1' : '3px solid transparent',
                  color: activeCostTab === 'split' ? '#0a6ed1' : '#495057',
                  fontWeight: activeCostTab === 'split' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem'
                }}
              >
                <PieChart size={16} />
                <span>Cost Component Split</span>
              </button>

              <button
                onClick={() => setActiveCostTab('balance')}
                style={{
                  padding: '0.75rem 1.25rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeCostTab === 'balance' ? '3px solid #0a6ed1' : '3px solid transparent',
                  color: activeCostTab === 'balance' ? '#0a6ed1' : '#495057',
                  fontWeight: activeCostTab === 'balance' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem'
                }}
              >
                <Scale size={16} />
                <span>Balance</span>
              </button>
            </div>

            {/* Tab Body Contents */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {/* TAB 1: ANALYSIS */}
              {activeCostTab === 'analysis' && (
                <div>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#333' }}>Order Cost Analysis (Planned vs Actual vs Target)</h4>
                  <table className="sap-table">
                    <thead>
                      <tr>
                        <th>Cost Category</th>
                        <th style={{ textAlign: 'right' }}>Planned Cost ({order.costs?.currency || 'USD'})</th>
                        <th style={{ textAlign: 'right' }}>Actual Cost ({order.costs?.currency || 'USD'})</th>
                        <th style={{ textAlign: 'right' }}>Target Cost ({order.costs?.currency || 'USD'})</th>
                        <th style={{ textAlign: 'right' }}>Variance ({order.costs?.currency || 'USD'})</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Direct Material Costs</td>
                        <td style={{ textAlign: 'right' }}>${(parseFloat(order.costs?.plannedMaterialCost) || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${(parseFloat(order.costs?.actualMaterialCost) || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>${((parseFloat(order.costs?.plannedMaterialCost) || 0) * (parseFloat(order.confirmedQty)/parseFloat(order.targetQty) || 0)).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: ((parseFloat(order.costs?.actualMaterialCost) || 0) - (parseFloat(order.costs?.plannedMaterialCost) || 0)) > 0 ? '#bb0000' : '#2b7c2b' }}>
                          ${((parseFloat(order.costs?.actualMaterialCost) || 0) - (parseFloat(order.costs?.plannedMaterialCost) || 0)).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td>Direct Labor Activity</td>
                        <td style={{ textAlign: 'right' }}>${(parseFloat(order.costs?.plannedLaborCost) || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${(parseFloat(order.costs?.actualLaborCost) || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>${((parseFloat(order.costs?.plannedLaborCost) || 0) * (parseFloat(order.confirmedQty)/parseFloat(order.targetQty) || 0)).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: ((parseFloat(order.costs?.actualLaborCost) || 0) - (parseFloat(order.costs?.plannedLaborCost) || 0)) > 0 ? '#bb0000' : '#2b7c2b' }}>
                          ${((parseFloat(order.costs?.actualLaborCost) || 0) - (parseFloat(order.costs?.plannedLaborCost) || 0)).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td>Machine Activity</td>
                        <td style={{ textAlign: 'right' }}>${(parseFloat(order.costs?.plannedMachineCost) || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${(parseFloat(order.costs?.actualMachineCost) || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>${((parseFloat(order.costs?.plannedMachineCost) || 0) * (parseFloat(order.confirmedQty)/parseFloat(order.targetQty) || 0)).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: ((parseFloat(order.costs?.actualMachineCost) || 0) - (parseFloat(order.costs?.plannedMachineCost) || 0)) > 0 ? '#bb0000' : '#2b7c2b' }}>
                          ${((parseFloat(order.costs?.actualMachineCost) || 0) - (parseFloat(order.costs?.plannedMachineCost) || 0)).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td>Manufacturing Overhead (10%)</td>
                        <td style={{ textAlign: 'right' }}>${(parseFloat(order.costs?.plannedOverheadCost) || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${(parseFloat(order.costs?.actualOverheadCost) || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>${((parseFloat(order.costs?.plannedOverheadCost) || 0) * (parseFloat(order.confirmedQty)/parseFloat(order.targetQty) || 0)).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: ((parseFloat(order.costs?.actualOverheadCost) || 0) - (parseFloat(order.costs?.plannedOverheadCost) || 0)) > 0 ? '#bb0000' : '#2b7c2b' }}>
                          ${((parseFloat(order.costs?.actualOverheadCost) || 0) - (parseFloat(order.costs?.plannedOverheadCost) || 0)).toFixed(2)}
                        </td>
                      </tr>
                      <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 700 }}>
                        <td>TOTAL PRODUCTION COST (DEBITS)</td>
                        <td style={{ textAlign: 'right' }}>${(parseFloat(order.costs?.totalPlannedCost) || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: '#0a6ed1' }}>${(parseFloat(order.costs?.totalActualCost) || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>${(parseFloat(order.costs?.targetCost) || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: (parseFloat(order.costs?.totalVariance) || 0) > 0 ? '#bb0000' : '#2b7c2b' }}>
                          ${(parseFloat(order.costs?.totalVariance) || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: ITEMIZATION */}
              {activeCostTab === 'itemization' && (
                <div>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#333' }}>Detailed Line-Item Breakdown (SAP Itemization)</h4>
                  <table className="sap-table">
                    <thead>
                      <tr>
                        <th>Item #</th>
                        <th>Cat</th>
                        <th>Resource / Code</th>
                        <th>Description</th>
                        <th>G/L Element</th>
                        <th style={{ textAlign: 'right' }}>Plan Qty</th>
                        <th style={{ textAlign: 'right' }}>Act Qty</th>
                        <th style={{ textAlign: 'right' }}>Rate ($)</th>
                        <th style={{ textAlign: 'right' }}>Plan Total ($)</th>
                        <th style={{ textAlign: 'right' }}>Act Total ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.costItems?.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>No itemization lines available. Click 'Cost Order' to calculate.</td>
                        </tr>
                      ) : (
                        order.costItems?.map((item: any) => (
                          <tr key={item.ID}>
                            <td>{item.itemNumber}</td>
                            <td>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                backgroundColor: item.itemCategory === 'M' ? '#e7f5ff' : item.itemCategory === 'E' ? '#fff4e6' : item.itemCategory === 'G' ? '#f3d9fa' : '#ebfbee',
                                color: item.itemCategory === 'M' ? '#1971c2' : item.itemCategory === 'E' ? '#d9480f' : item.itemCategory === 'G' ? '#9c36b5' : '#2b7c2b'
                              }}>
                                {item.itemCategory}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{item.resourceCode}</td>
                            <td>{item.description}</td>
                            <td>{item.costElement}</td>
                            <td style={{ textAlign: 'right' }}>{(parseFloat(item.plannedQty) || 0).toFixed(2)} {item.unit}</td>
                            <td style={{ textAlign: 'right' }}>{(parseFloat(item.actualQty) || 0).toFixed(2)} {item.unit}</td>
                            <td style={{ textAlign: 'right' }}>${(parseFloat(item.pricePerUnit) || 0).toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>${(parseFloat(item.plannedCost) || 0).toFixed(2)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>${(parseFloat(item.actualCost) || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: COST COMPONENT SPLIT */}
              {activeCostTab === 'split' && (
                <div>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#333' }}>Cost Component Split View</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div style={{ border: '1px solid #dee2e6', borderRadius: '6px', padding: '1rem', backgroundColor: '#f8f9fa' }}>
                      <h5 style={{ margin: '0 0 0.75rem 0', color: '#0a6ed1' }}>Raw Material Share</h5>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1c2430' }}>
                        ${(parseFloat(order.costs?.actualMaterialCost) || 0).toFixed(2)}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>
                        {(((parseFloat(order.costs?.actualMaterialCost) || 0) / (parseFloat(order.costs?.totalActualCost) || 1)) * 100).toFixed(1)}% of Total Actual Cost
                      </span>
                    </div>

                    <div style={{ border: '1px solid #dee2e6', borderRadius: '6px', padding: '1rem', backgroundColor: '#f8f9fa' }}>
                      <h5 style={{ margin: '0 0 0.75rem 0', color: '#d9480f' }}>Internal Labor & Machine Share</h5>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1c2430' }}>
                        ${((parseFloat(order.costs?.actualLaborCost) || 0) + (parseFloat(order.costs?.actualMachineCost) || 0)).toFixed(2)}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>
                        {((((parseFloat(order.costs?.actualLaborCost) || 0) + (parseFloat(order.costs?.actualMachineCost) || 0)) / (parseFloat(order.costs?.totalActualCost) || 1)) * 100).toFixed(1)}% of Total Actual Cost
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: BALANCE */}
              {activeCostTab === 'balance' && (
                <div>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#333' }}>Order Settlement Balance (Debits vs Credits)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: '#e7f5ff', border: '1px solid #a5d8ff' }}>
                      <span style={{ fontSize: '0.8rem', color: '#1971c2', fontWeight: 600 }}>TOTAL DEBITS (Actual Costs)</span>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1864ab', marginTop: '0.25rem' }}>
                        ${(parseFloat(order.costs?.totalActualCost) || 0).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: '#ebfbee', border: '1px solid #b2f2bb' }}>
                      <span style={{ fontSize: '0.8rem', color: '#2b7c2b', fontWeight: 600 }}>TOTAL CREDITS (GR Delivered)</span>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2b7c2b', marginTop: '0.25rem' }}>
                        -${(parseFloat(order.costs?.goodsReceiptCredit) || 0).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: '6px', backgroundColor: (parseFloat(order.costs?.orderBalance) || 0) === 0 ? '#f8f9fa' : '#fff5f5', border: '1px solid #ffc9c9' }}>
                      <span style={{ fontSize: '0.8rem', color: '#c92a2a', fontWeight: 600 }}>NET ORDER BALANCE (WIP / Variance)</span>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c92a2a', marginTop: '0.25rem' }}>
                        ${(parseFloat(order.costs?.orderBalance) || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#555', backgroundColor: '#f8f9fa', padding: '0.75rem', borderRadius: '4px', border: '1px dashed #ced4da' }}>
                    <strong>SAP Settlement Status:</strong> { (parseFloat(order.costs?.orderBalance) || 0) === 0 ? 'Order is fully settled (Balance = 0.00).' : 'Work-in-Process (WIP) active. Pending final TECO order settlement.' }
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #dee2e6',
              padding: '0.75rem 1.5rem',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                className="sap-btn sap-btn-secondary"
                onClick={() => calculateCostsMutation.mutate()}
                disabled={calculateCostsMutation.isPending}
              >
                {calculateCostsMutation.isPending ? 'Recalculating...' : 'Recalculate Costs'}
              </button>
              <button
                className="sap-btn sap-btn-primary"
                onClick={() => setShowCostsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
