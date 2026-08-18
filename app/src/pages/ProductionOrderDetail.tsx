import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealTime } from '../contexts/RealTimeContext';
import { ArrowLeft, CheckCircle2, ShieldAlert, Play, ShoppingCart, Truck, AlertTriangle, Edit2, DollarSign, PieChart, ListFilter, Scale } from 'lucide-react';

export const ProductionOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { lastEvent } = useRealTime();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (lastEvent) {
      console.log('[Live Refresh]: Processing real-time event:', lastEvent.eventType, 'Order:', lastEvent.orderId);
      
      // Fast path: Direct query cache mutation if orderId matches current order
      if (lastEvent.orderId && lastEvent.status) {
        queryClient.setQueryData(['orderDetail', id], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            status: lastEvent.status || oldData.status,
            targetQty: lastEvent.targetQty !== undefined ? lastEvent.targetQty : oldData.targetQty
          };
        });
      }

      // Background soft invalidation for complete relation sync
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id], refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  }, [lastEvent, id, queryClient]);
  const [grQty, setGrQty] = useState('');
  const [grSlocId, setGrSlocId] = useState('');
  const [showGrForm, setShowGrForm] = useState(false);
  const [showCostsModal, setShowCostsModal] = useState(false);
  const [activeCostTab, setActiveCostTab] = useState<'analysis' | 'itemization' | 'split' | 'balance'>('analysis');
  const [errorMsg, setErrorMsg] = useState('');
  const [modalErrorMsg, setModalErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [editQtyValue, setEditQtyValue] = useState('');

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingType, setSchedulingType] = useState<'FORWARD'|'BACKWARD'|'CURRENT_DATE'>('CURRENT_DATE');
  const [showChangeDatesModal, setShowChangeDatesModal] = useState(false);
  const [showChangeQtyModal, setShowChangeQtyModal] = useState(false);
  const [showStatusChangesModal, setShowStatusChangesModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showReadMasterModal, setShowReadMasterModal] = useState(false);
  const [ppSelectionType, setPpSelectionType] = useState<'PV' | 'NONE'>('PV');
  const [ppProductionVersion, setPpProductionVersion] = useState('PV01');
  const [ppBasicStart, setPpBasicStart] = useState('');
  const [ppBasicFinish, setPpBasicFinish] = useState('');
  const [ppNewRouting, setPpNewRouting] = useState(true);
  const [ppRoutingDate, setPpRoutingDate] = useState('');
  const [ppNewBOM, setPpNewBOM] = useState(true);
  const [ppBomDate, setPpBomDate] = useState('');
  const [showReadInfoModal, setShowReadInfoModal] = useState(false);
  const [readInfoMessage, setReadInfoMessage] = useState('');

  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newQty, setNewQty] = useState('');
  const [changeQtyReason, setChangeQtyReason] = useState('');
  const [activeHeaderTab, setActiveHeaderTab] = useState<'general'|'assignment'|'goodsReceipt'|'control'|'masterData'|'longText'|'administration'>('general');

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

  // Fetch Order details with optimistic placeholder caching
  const { data: order, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['orderDetail', id],
    queryFn: async () => {
      const res = await api.get(`/odata/v4/production/ProductionOrders(${id})?$expand=material,plant,storageLocation,operations($orderby=sequence asc;$expand=workCenter),components($expand=componentMaterial),goodsMovements($expand=material)`);
      const orderData = res.data;

      // Safely fetch costs and costItems in separate calls to avoid OData expand composition errors
      try {
        const [costsRes, costItemsRes] = await Promise.all([
          api.get(`/odata/v4/production/OrderCosts?$filter=order_ID eq ${id}`),
          api.get(`/odata/v4/production/OrderCostItemizations?$filter=order_ID eq ${id}`)
        ]);
        const costsList = costsRes.data?.value || [];
        orderData.costs = Array.isArray(costsList) ? (costsList[0] || null) : costsList;
        orderData.costItems = costItemsRes.data?.value || [];
      } catch (err) {
        console.warn('Order costs or cost items fetch failed:', err);
        orderData.costs = [];
        orderData.costItems = [];
      }

      return orderData;
    },
    placeholderData: (previousData) => previousData
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

  const scheduleOrderMutation = useMutation({
    mutationFn: async (type: string) => {
      setModalErrorMsg('');
      const res = await api.post('/odata/v4/production/scheduleOrder', { orderId: id, schedulingType: type });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg(`Order scheduled successfully! Scheduled Start: ${data?.scheduledStart?.split('T')[0] || 'N/A'}, End: ${data?.scheduledEnd?.split('T')[0] || 'N/A'}`);
      setShowScheduleModal(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || 'Scheduling failed.';
      setErrorMsg(msg);
      setModalErrorMsg(msg);
    }
  });

  const changeDatesMutation = useMutation({
    mutationFn: async () => {
      setModalErrorMsg('');
      const res = await api.post('/odata/v4/production/changeDatesAndTimes', {
        orderId: id, newBasicStartDate: newStartDate, newBasicEndDate: newEndDate, newStartTime: '00:00', newEndTime: '24:00'
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg('Dates updated successfully.');
      setShowChangeDatesModal(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || 'Date change failed.';
      setErrorMsg(msg);
      setModalErrorMsg(msg);
    }
  });

  const changeQtyMutation = useMutation({
    mutationFn: async () => {
      setModalErrorMsg('');
      const res = await api.post('/odata/v4/production/changeNetQuantity', {
        orderId: id, newQuantity: parseFloat(newQty), reason: changeQtyReason
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg(data?.message || 'Quantity updated successfully.');
      setShowChangeQtyModal(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || 'Quantity change failed.';
      setErrorMsg(msg);
      setModalErrorMsg(msg);
    }
  });

  const readMasterDataMutation = useMutation({
    mutationFn: async () => {
      setModalErrorMsg('');
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await api.post('/odata/v4/production/readPPMasterData', {
        orderId: id,
        productionVersion: ppSelectionType === 'PV' ? ppProductionVersion : '',
        basicStart: ppBasicStart || order?.plannedStartDate,
        basicFinish: ppBasicFinish || order?.plannedEndDate,
        newRouting: ppNewRouting,
        routingDate: ppRoutingDate || todayStr,
        newBOM: ppNewBOM,
        bomDate: ppBomDate || todayStr
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setShowReadMasterModal(false);
      if (data?.revertedToCreated) {
        setReadInfoMessage('Status of released order is reverted to "Created"');
        setShowReadInfoModal(true);
      } else {
        setSuccessMsg(`PP Master Data read: ${data?.operationsUpdated || 0} operations, ${data?.componentsUpdated || 0} components updated.`);
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || (err.message === 'Network Error' || !err.response ? 'Backend CAP server connection offline (http://localhost:4004).' : 'Read PP Master Data failed.');
      setErrorMsg(msg);
      setModalErrorMsg(msg);
    }
  });

  const createBatchMutation = useMutation({
    mutationFn: async () => {
      setModalErrorMsg('');
      const res = await api.post('/odata/v4/production/createBatch', { orderId: id, quantity: parseFloat(order?.targetQty) });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg(`Batch ${data?.batchNumber} created successfully!`);
      setShowBatchModal(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || 'Create Batch failed.';
      setErrorMsg(msg);
      setModalErrorMsg(msg);
    }
  });

  const tecoMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/technicallyCompleteOrder', { orderId: id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg('Order set to Technically Complete (TECO).');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.error?.message || 'TECO failed.')
  });

  const closeOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/closeOrder', { orderId: id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg('Order closed (CLSD).');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.error?.message || 'Close order failed.')
  });

  const { data: statusChanges } = useQuery({
    queryKey: ['statusChanges', id],
    queryFn: async () => {
      const res = await api.post('/odata/v4/production/getStatusChanges', { orderId: id });
      return res.data?.value || res.data || [];
    },
    enabled: showStatusChangesModal
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
              
              <div style={{ gridColumn: '1 / -1' }}>
                <strong style={{ color: '#666' }}>Planned Scheduling Dates</strong>
                <table className="sap-table" style={{ marginTop: '0.5rem' }}>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Basic Dates</th>
                      <th>Scheduled</th>
                      <th>Confirmed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>End</strong></td>
                      <td>{order.plannedEndDate} <Edit2 size={12} style={{cursor: 'pointer'}} onClick={() => { setNewStartDate(order.plannedStartDate); setNewEndDate(order.plannedEndDate); setShowChangeDatesModal(true); }} /></td>
                      <td style={{backgroundColor: '#f3f4f6'}}>{order.scheduledEndDate || '-'}</td>
                      <td style={{backgroundColor: '#f3f4f6'}}>{order.confirmedEndDate || '-'}</td>
                    </tr>
                    <tr>
                      <td><strong>Start</strong></td>
                      <td>{order.plannedStartDate} <Edit2 size={12} style={{cursor: 'pointer'}} onClick={() => { setNewStartDate(order.plannedStartDate); setNewEndDate(order.plannedEndDate); setShowChangeDatesModal(true); }} /></td>
                      <td style={{backgroundColor: '#f3f4f6'}}>{order.scheduledStartDate || '-'}</td>
                      <td style={{backgroundColor: '#f3f4f6'}}>{order.confirmedStartDate || '-'}</td>
                    </tr>
                    <tr>
                      <td><strong>Release</strong></td>
                      <td>-</td>
                      <td style={{backgroundColor: '#f3f4f6'}}>{order.scheduledReleaseDate || '-'}</td>
                      <td style={{backgroundColor: '#f3f4f6'}}>-</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  <span><strong>Scheduling Type:</strong> {order.schedulingType || 'Current date'}</span>
                  <span><strong>Scheduling Margin Key:</strong> {order.schedulingMarginKey || '001'}</span>
                </div>
              </div>
            </div>

            {/* Header Sub Tabs */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--sap-border-color)' }}>
              <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', paddingTop: '0.5rem' }}>
                {['general', 'assignment', 'goodsReceipt', 'control', 'masterData', 'longText', 'administration'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveHeaderTab(tab as any)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeHeaderTab === tab ? 'bold' : 'normal',
                      borderBottom: activeHeaderTab === tab ? '2px solid #0a6ed1' : 'none', paddingBottom: '0.25rem', color: activeHeaderTab === tab ? '#0a6ed1' : '#333'
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, ' $1')}
                  </button>
                ))}
              </div>
              <div style={{ padding: '1rem 0' }}>
                {activeHeaderTab === 'general' && (
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div><strong>Total Qty:</strong> {order.targetQty}</div>
                    <div><strong>Delivered:</strong> {order.deliveredQty}</div>
                    <div><strong>Scrap Portion:</strong> {order.scrapQty || 0}</div>
                    <div><strong>Short/Exc. Rcpt:</strong> {parseFloat(order.targetQty) - (parseFloat(order.deliveredQty) || 0)}</div>
                  </div>
                )}
                {activeHeaderTab === 'assignment' && (
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div><strong>Order Type:</strong> {order.orderType || 'PP01'}</div>
                    <div><strong>Scheduling Type:</strong> {order.schedulingType}</div>
                    <div><strong>Plant:</strong> {order.plant?.code}</div>
                    <div><strong>Storage Location:</strong> {order.storageLocation?.code}</div>
                    <div><strong>MRP Controller:</strong> {order.mrpController || '001'}</div>
                  </div>
                )}
                {activeHeaderTab === 'goodsReceipt' && (
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div><strong>Storage Location:</strong> {order.storageLocation?.name}</div>
                    <div><strong>Movement Type:</strong> 101</div>
                    <div><strong>GR Processing Time:</strong> {order.grProcessingTime || 0} days</div>
                  </div>
                )}
                {activeHeaderTab === 'control' && (
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div><strong>Order Type:</strong> {order.orderType}</div>
                    <div><strong>Plant Code:</strong> {order.plant?.code}</div>
                    <div><strong>SAP Synced:</strong> {order.isSapSynced ? 'Yes' : 'No'}</div>
                  </div>
                )}
                {activeHeaderTab === 'masterData' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                    <div><strong>Material Code:</strong> {order.material?.code}</div>
                    <div><strong>Description:</strong> {order.material?.description}</div>
                    <div><strong>Material Group:</strong> {order.material?.materialGroup}</div>
                    <div><strong>Base Unit:</strong> {order.material?.baseUnit}</div>
                  </div>
                )}
                {activeHeaderTab === 'longText' && (
                  <div style={{ width: '100%' }}>
                    <textarea className="sap-input" style={{ width: '100%', minHeight: '100px' }} readOnly defaultValue={order.longText || 'No long text available.'}></textarea>
                  </div>
                )}
                {activeHeaderTab === 'administration' && (
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div><strong>Created At:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</div>
                    <div><strong>Created By:</strong> {order.createdBy || 'System'}</div>
                    <div><strong>Modified At:</strong> {order.modifiedAt ? new Date(order.modifiedAt).toLocaleString() : '-'}</div>
                  </div>
                )}
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
              onClick={() => { 
                setShowGrForm(true); 
                setGrSlocId(order.storageLocation_ID);
                // Calculate remaining yield open for GR: confirmed yield or target qty minus delivered
                const remainingYield = Math.max(0, (parseFloat(order.confirmedQty) || parseFloat(order.targetQty) || 0) - (parseFloat(order.deliveredQty) || 0));
                setGrQty(remainingYield > 0 ? remainingYield.toString() : (parseFloat(order.targetQty) || 1).toString());
              }}
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

      {/* SAP Action Bar */}
      <div className="sap-card" style={{ marginBottom: '2rem', padding: '0.5rem 1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginRight: '0.5rem' }}>Functions:</span>
            <button className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => setShowScheduleModal(true)}>Schedule Order</button>
            <button className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => checkMaterialMutation.mutate()}>Check Availability</button>
            <button className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => { calculateCostsMutation.mutate(); setShowCostsModal(true); }}>Cost Order</button>
            <button className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => { setModalErrorMsg(''); setShowReadMasterModal(true); }}>Read PP Master Data</button>
          </div>
          
          <div style={{ width: '1px', height: '24px', backgroundColor: '#ccc' }}></div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginRight: '0.5rem' }}>Header:</span>
            <button className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => { setNewStartDate(order.plannedStartDate); setNewEndDate(order.plannedEndDate); setShowChangeDatesModal(true); }}>Change Dates/Times</button>
            <button className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => { setNewQty(order.targetQty); setShowChangeQtyModal(true); }}>Change Net Quantity</button>
            <button className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => setShowBatchModal(true)}>Create Batch</button>
            <button className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => tecoMutation.mutate()}>Technical Complete (TECO)</button>
            <button className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => closeOrderMutation.mutate()}>Close Order</button>
          </div>
          
          <div style={{ width: '1px', height: '24px', backgroundColor: '#ccc' }}></div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginRight: '0.5rem' }}>Goto:</span>
            <Link to={`/orders/${id}/missing-parts`} className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', textDecoration: 'none' }}>Missing Parts</Link>
            <Link to={`/orders/${id}/change-management`} className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', textDecoration: 'none' }}>Change Management</Link>
            <button className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => setShowStatusChangesModal(true)}>Status Changes</button>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: '#ccc' }}></div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginRight: '0.5rem' }}>Output:</span>
            <Link to={`/orders/${id}/outputs`} className="sap-btn sap-btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', textDecoration: 'none' }}>Manage Output Items</Link>
          </div>
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
                min="0.001"
                step="any"
                max={Math.max(1, (parseFloat(order.targetQty) * 1.10) - (parseFloat(order.deliveredQty) || 0))} 
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

      {showScheduleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="sap-card" style={{ padding: '2rem', width: '400px' }}>
            <h3 style={{ marginTop: 0 }}>Schedule Order</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1rem 0' }}>
              <label><input type="radio" name="scheduling" checked={schedulingType === 'FORWARD'} onChange={() => setSchedulingType('FORWARD')} /> Forward Scheduling</label>
              <label><input type="radio" name="scheduling" checked={schedulingType === 'BACKWARD'} onChange={() => setSchedulingType('BACKWARD')} /> Backward Scheduling</label>
              <label><input type="radio" name="scheduling" checked={schedulingType === 'CURRENT_DATE'} onChange={() => setSchedulingType('CURRENT_DATE')} /> Current Date Scheduling</label>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="sap-btn sap-btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
              <button className="sap-btn sap-btn-primary" onClick={() => scheduleOrderMutation.mutate(schedulingType)} disabled={scheduleOrderMutation.isPending}>Execute Scheduling</button>
            </div>
          </div>
        </div>
      )}

      {showChangeDatesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="sap-card" style={{ padding: '2rem', width: '400px' }}>
            <h3 style={{ marginTop: 0 }}>Change in Dates/Times</h3>
            <div className="sap-form-group">
              <label className="sap-label">Start Date</label>
              <input type="date" className="sap-input" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
            </div>
            <div className="sap-form-group">
              <label className="sap-label">End Date</label>
              <input type="date" className="sap-input" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="sap-btn sap-btn-secondary" onClick={() => setShowChangeDatesModal(false)}>Cancel</button>
              <button className="sap-btn sap-btn-primary" onClick={() => { if(newEndDate >= newStartDate) changeDatesMutation.mutate(); else alert("End date must be >= start date"); }} disabled={changeDatesMutation.isPending}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showChangeQtyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="sap-card" style={{ padding: '2rem', width: '400px' }}>
            <h3 style={{ marginTop: 0 }}>Change Net Quantity</h3>
            <div className="sap-form-group">
              <label className="sap-label">Current Qty</label>
              <input type="text" className="sap-input" readOnly value={order.targetQty} />
            </div>
            <div className="sap-form-group">
              <label className="sap-label">New Quantity</label>
              <input type="number" className="sap-input" value={newQty} onChange={e => setNewQty(e.target.value)} />
            </div>
            <div className="sap-form-group">
              <label className="sap-label">Reason</label>
              <input type="text" className="sap-input" value={changeQtyReason} onChange={e => setChangeQtyReason(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="sap-btn sap-btn-secondary" onClick={() => setShowChangeQtyModal(false)}>Cancel</button>
              <button className="sap-btn sap-btn-primary" onClick={() => { if(parseFloat(newQty) >= parseFloat(order.confirmedQty)) changeQtyMutation.mutate(); else alert("Quantity cannot be less than confirmed quantity."); }} disabled={changeQtyMutation.isPending}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showStatusChangesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="sap-card" style={{ padding: '2rem', width: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Status History: Order {order.orderNumber}</h3>
              <button className="sap-btn sap-btn-secondary" onClick={() => setShowStatusChangesModal(false)}>Close</button>
            </div>
            <table className="sap-table">
              <thead>
                <tr>
                  <th>From Status</th>
                  <th>To Status</th>
                  <th>Changed By</th>
                  <th>Changed At</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {statusChanges?.map((c: any) => (
                  <tr key={c.id}>
                    <td><span className={`sap-badge sap-badge-${c.fromStatus}`}>{c.fromStatus}</span></td>
                    <td><span className={`sap-badge sap-badge-${c.toStatus}`}>{c.toStatus}</span></td>
                    <td>{c.changedBy}</td>
                    <td>{new Date(c.changedAt).toLocaleString()}</td>
                    <td>{c.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Read PP Master Data SAP Modal (Image 21) */}
      {showReadMasterModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1050
        }}>
          <div style={{
            backgroundColor: '#1e2530', color: '#f0f3f6', borderRadius: '8px',
            width: '420px', padding: '1.25rem 1.5rem', boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
            fontFamily: 'var(--font-sans)', border: '1px solid #323b48'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#ffffff' }}>Read PP master data</h3>
              <button onClick={() => { setShowReadMasterModal(false); setModalErrorMsg(''); }} style={{ background: 'none', border: 'none', color: '#9aa5b5', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            {modalErrorMsg && (
              <div style={{
                backgroundColor: '#3b181e', color: '#f87171', border: '1px solid #7f1d1d',
                borderRadius: '4px', padding: '0.6rem 0.8rem', fontSize: '0.82rem', marginBottom: '1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{modalErrorMsg}</span>
              </div>
            )}

            {/* Selection Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="radio"
                  id="pvSel"
                  name="ppSel"
                  checked={ppSelectionType === 'PV'}
                  onChange={() => setPpSelectionType('PV')}
                  style={{ accentColor: '#0a6ed1' }}
                />
                <label htmlFor="pvSel" style={{ fontSize: '0.85rem', minWidth: '130px', fontWeight: 500 }}>Production Version</label>
                <input
                  type="text"
                  value={ppProductionVersion}
                  onChange={e => setPpProductionVersion(e.target.value)}
                  disabled={ppSelectionType !== 'PV'}
                  style={{
                    backgroundColor: '#131920', color: '#ffffff', border: '1px solid #3a4659',
                    borderRadius: '4px', padding: '3px 8px', fontSize: '0.82rem', width: '80px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="radio"
                  id="noSel"
                  name="ppSel"
                  checked={ppSelectionType === 'NONE'}
                  onChange={() => setPpSelectionType('NONE')}
                  style={{ accentColor: '#0a6ed1' }}
                />
                <label htmlFor="noSel" style={{ fontSize: '0.85rem', fontWeight: 500 }}>No Selection</label>
              </div>
            </div>

            {/* Basic Dates Section */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e1e7ed', paddingBottom: '0.25rem', borderBottom: '1px solid #323b48', marginBottom: '0.75rem' }}>
                Basic Dates
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9aa5b5' }}>Basic Finish:</span>
                  <input
                    type="date"
                    value={ppBasicFinish || order?.plannedEndDate || ''}
                    onChange={e => setPpBasicFinish(e.target.value)}
                    style={{ backgroundColor: '#131920', color: '#ffffff', border: '1px solid #3a4659', borderRadius: '4px', padding: '3px 8px', fontSize: '0.8rem', width: '150px' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9aa5b5' }}>Basic Start:</span>
                  <input
                    type="date"
                    value={ppBasicStart || order?.plannedStartDate || ''}
                    onChange={e => setPpBasicStart(e.target.value)}
                    style={{ backgroundColor: '#131920', color: '#ffffff', border: '1px solid #3a4659', borderRadius: '4px', padding: '3px 8px', fontSize: '0.8rem', width: '150px' }}
                  />
                </div>
              </div>
            </div>

            {/* Routing Section */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e1e7ed', paddingBottom: '0.25rem', borderBottom: '1px solid #323b48', marginBottom: '0.75rem' }}>
                Routing
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9aa5b5' }}>New Routing:</span>
                  <input
                    type="checkbox"
                    checked={ppNewRouting}
                    onChange={e => setPpNewRouting(e.target.checked)}
                    style={{ accentColor: '#0a6ed1', width: '16px', height: '16px' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9aa5b5' }}>Explosion Date:</span>
                  <input
                    type="date"
                    value={ppRoutingDate || new Date().toISOString().split('T')[0]}
                    onChange={e => setPpRoutingDate(e.target.value)}
                    style={{ backgroundColor: '#131920', color: '#ffffff', border: '1px solid #3a4659', borderRadius: '4px', padding: '3px 8px', fontSize: '0.8rem', width: '150px' }}
                  />
                </div>
              </div>
            </div>

            {/* Bill of Material Section */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e1e7ed', paddingBottom: '0.25rem', borderBottom: '1px solid #323b48', marginBottom: '0.75rem' }}>
                Bill of Material
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9aa5b5' }}>New BOM:</span>
                  <input
                    type="checkbox"
                    checked={ppNewBOM}
                    onChange={e => setPpNewBOM(e.target.checked)}
                    style={{ accentColor: '#0a6ed1', width: '16px', height: '16px' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9aa5b5' }}>BOM Explosion Date:</span>
                  <input
                    type="date"
                    value={ppBomDate || new Date().toISOString().split('T')[0]}
                    onChange={e => setPpBomDate(e.target.value)}
                    style={{ backgroundColor: '#131920', color: '#ffffff', border: '1px solid #3a4659', borderRadius: '4px', padding: '3px 8px', fontSize: '0.8rem', width: '150px' }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #323b48' }}>
              <button
                onClick={() => readMasterDataMutation.mutate()}
                disabled={readMasterDataMutation.isPending}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#4dabf7', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                {readMasterDataMutation.isPending ? 'Processing...' : 'Continue'}
              </button>
              <button
                onClick={() => setShowReadMasterModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#4dabf7', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAP Information Popup Modal (Image 22) */}
      {showReadInfoModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }}>
          <div style={{
            backgroundColor: '#1e2530', color: '#f0f3f6', borderRadius: '8px',
            width: '420px', padding: '1.25rem 1.5rem', boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
            fontFamily: 'var(--font-sans)', border: '1px solid #323b48'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#ffffff' }}>Information</h3>
              <button onClick={() => setShowReadInfoModal(false)} style={{ background: 'none', border: 'none', color: '#9aa5b5', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '0.5rem 0' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #4dabf7',
                color: '#4dabf7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem'
              }}>
                i
              </div>
              <span style={{ fontSize: '0.9rem', color: '#e1e7ed' }}>{readInfoMessage}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #323b48' }}>
              <button
                onClick={() => setShowReadInfoModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#4dabf7', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Continue
              </button>
              <button
                onClick={() => alert('SAP Info: When PP master data is re-read for a released order, its operations and reservations are re-created in Created (CRTD) status.')}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#4dabf7', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Help
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="sap-card" style={{ padding: '2rem', width: '400px' }}>
            <h3 style={{ marginTop: 0 }}>Create Batch</h3>
            <p>Are you sure you want to create a batch for this order?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="sap-btn sap-btn-secondary" onClick={() => setShowBatchModal(false)}>Cancel</button>
              <button className="sap-btn sap-btn-primary" onClick={() => createBatchMutation.mutate()} disabled={createBatchMutation.isPending}>Confirm</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
