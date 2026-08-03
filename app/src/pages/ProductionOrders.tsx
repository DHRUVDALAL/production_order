import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Filter, Calendar, Layers, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export const ProductionOrders: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(() => {
    return location.state?.status || 'ALL';
  });
  const [filterPlant, setFilterPlant] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  React.useEffect(() => {
    if (location.state?.status) {
      setFilterStatus(location.state.status);
    }
  }, [location.state]);

  // Creation form state
  const [materialId, setMaterialId] = useState('');
  const [plantId, setPlantId] = useState('');
  const [planningPlantId, setPlanningPlantId] = useState('');
  const [orderType, setOrderType] = useState('ZPPS');
  const [slocId, setSlocId] = useState('');
  const [targetQty, setTargetQty] = useState('100');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [schedulingType, setSchedulingType] = useState('Backwards');
  const [priority, setPriority] = useState('');
  const [schedMarginKey, setSchedMarginKey] = useState('001');
  const [floatBeforeProd, setFloatBeforeProd] = useState('2');
  const [floatAfterProd, setFloatAfterProd] = useState('1');
  const [releasePeriod, setReleasePeriod] = useState('5');
  const [initialStatus, setInitialStatus] = useState('CRTD'); // CRTD or DRAFT
  const [formError, setFormError] = useState('');

  // Queries
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['ordersList'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/ProductionOrders?$orderby=orderNumber desc&$expand=material,plant,storageLocation');
      return res.data?.value || [];
    }
  });

  // Master data pickers are restricted to isSapSynced rows. Locally seeded
  // demo master data does not exist in S/4HANA, so choosing it makes the
  // create call fail server-side ("Material X not maintained in plant Y").
  const { data: finishedMaterials } = useQuery({
    queryKey: ['finishedMaterials'],
    queryFn: async () => {
      const res = await api.get("/odata/v4/production/Materials?$filter=materialGroup eq 'FINISHED' and isSapSynced eq true&$orderby=code");
      return res.data?.value || [];
    }
  });

  const { data: plants } = useQuery({
    queryKey: ['plantsList'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/Plants?$filter=isSapSynced eq true&$orderby=code');
      return res.data?.value || [];
    }
  });

  const { data: slocs } = useQuery({
    queryKey: ['slocsList'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/StorageLocations?$filter=isSapSynced eq true&$orderby=code');
      return res.data?.value || [];
    }
  });

  // Mutation to create order
  const createOrderMutation = useMutation({
    mutationFn: async (newOrder: any) => {
      const res = await api.post('/odata/v4/production/ProductionOrders', newOrder);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ordersList'] });
      setShowCreateForm(false);
      // Reset form
      setMaterialId('');
      setPlantId('');
      setPlanningPlantId('');
      setOrderType('ZPPS');
      setSlocId('');
      setTargetQty('100');
      setPlannedStartDate('');
      setPlannedEndDate('');
      setSchedulingType('Backwards');
      setPriority('');
      setSchedMarginKey('001');
      setFloatBeforeProd('2');
      setFloatAfterProd('1');
      setReleasePeriod('5');
      setFormError('');
      
      // Show success toast
      setToast({
        message: `Production Order ${data.orderNumber || ''} created successfully in SAP S/4HANA!`,
        type: 'success'
      });
      setTimeout(() => setToast(null), 5000);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error?.message || 'Failed to create order.';
      setFormError(errMsg);
    }
  });

  const calculateStartDateFromEnd = (endVal: string, floatBefore: string) => {
    if (!endVal) return;
    try {
      const endD = new Date(endVal);
      const days = parseInt(floatBefore, 10) || 0;
      endD.setDate(endD.getDate() - days);
      setPlannedStartDate(endD.toISOString().split('T')[0]);
    } catch (e) {
      // Ignore parsing errors
    }
  };

  const calculateEndDateFromStart = (startVal: string, floatAfter: string) => {
    if (!startVal) return;
    try {
      const startD = new Date(startVal);
      const days = parseInt(floatAfter, 10) || 0;
      startD.setDate(startD.getDate() + days);
      setPlannedEndDate(startD.toISOString().split('T')[0]);
    } catch (e) {
      // Ignore parsing errors
    }
  };

  // Unified scheduling engine: sync and auto-fill dates based on selected scheduling type and float margin configurations
  React.useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (schedulingType === 'Current date' || schedulingType === 'Current date-time') {
      if (plannedStartDate !== todayStr) setPlannedStartDate(todayStr);
      if (plannedEndDate !== todayStr) setPlannedEndDate(todayStr);
    } else if (schedulingType === 'Backwards' || schedulingType === 'Backwards in time') {
      if (!plannedEndDate) {
        setPlannedEndDate(todayStr);
        calculateStartDateFromEnd(todayStr, floatBeforeProd);
      } else {
        calculateStartDateFromEnd(plannedEndDate, floatBeforeProd);
      }
    } else if (schedulingType === 'Forwards' || schedulingType === 'Forwards in time') {
      if (!plannedStartDate) {
        setPlannedStartDate(todayStr);
        calculateEndDateFromStart(todayStr, floatAfterProd);
      } else {
        calculateEndDateFromStart(plannedStartDate, floatAfterProd);
      }
    }
  }, [schedulingType, plannedStartDate, plannedEndDate, floatBeforeProd, floatAfterProd]);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!materialId || !plantId || !slocId || !targetQty) {
      setFormError('Please fill out all mandatory fields.');
      return;
    }

    if (schedulingType === 'Forwards' || schedulingType === 'Forwards in time') {
      if (!plannedStartDate) {
        setFormError('Forward scheduling (enter start date)');
        return;
      }
    } else if (schedulingType === 'Backwards' || schedulingType === 'Backwards in time') {
      if (!plannedEndDate) {
        setFormError('Backward scheduling (enter end date)');
        return;
      }
    } else {
      if (!plannedStartDate || !plannedEndDate) {
        setFormError('Please enter both start and end dates.');
        return;
      }
    }

    if (parseFloat(targetQty) <= 0) {
      setFormError('Target quantity must be greater than zero.');
      return;
    }

    const start = new Date(plannedStartDate);
    const end = new Date(plannedEndDate);
    if (end < start) {
      setFormError('Planned end date cannot be earlier than planned start date.');
      return;
    }

    createOrderMutation.mutate({
      material_ID: materialId,
      plant_ID: plantId,
      storageLocation_ID: slocId,
      targetQty: parseFloat(targetQty),
      status: initialStatus,
      plannedStartDate,
      plannedEndDate,
      orderType
    });
  };

  const filteredOrders = orders?.filter((o: any) => {
    // 1. Status Filter
    if (filterStatus !== 'ALL' && !o.status?.split(' ').includes(filterStatus)) return false;

    // 2. Plant Filter
    if (filterPlant !== 'ALL' && o.plant_ID !== filterPlant) return false;

    // 3. Date Filters
    if (filterStartDate && o.plannedStartDate && o.plannedStartDate < filterStartDate) return false;
    if (filterEndDate && o.plannedEndDate && o.plannedEndDate > filterEndDate) return false;

    // 4. Search query matching orderNumber, material code/description, plant code/name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchOrder = o.orderNumber?.toLowerCase().includes(q);
      const matchMatCode = o.material?.code?.toLowerCase().includes(q);
      const matchMatDesc = o.material?.description?.toLowerCase().includes(q);
      const matchPlant = o.plant?.code?.toLowerCase().includes(q) || o.plant?.name?.toLowerCase().includes(q);
      
      if (!matchOrder && !matchMatCode && !matchMatDesc && !matchPlant) return false;
    }

    return true;
  });



  // Sort the filtered orders
  const sortedOrders = [...(filteredOrders || [])].sort((a: any, b: any) => {
    if (sortField === 'orderNumber') {
      const aNum = parseInt(a.orderNumber, 10);
      const bNum = parseInt(b.orderNumber, 10);
      const aIsNum = !isNaN(aNum);
      const bIsNum = !isNaN(bNum);

      if (aIsNum && bIsNum) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      } else if (aIsNum && !bIsNum) {
        return -1; // Numeric comes first
      } else if (!aIsNum && bIsNum) {
        return 1;  // Numeric comes first
      } else {
        const aVal = String(a.orderNumber).toLowerCase();
        const bVal = String(b.orderNumber).toLowerCase();
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
    }

    let aVal: any = '';
    let bVal: any = '';

    if (sortField === 'material') {
      aVal = a.material?.code || '';
      bVal = b.material?.code || '';
    } else if (sortField === 'plant') {
      aVal = a.plant?.code || '';
      bVal = b.plant?.code || '';
    } else if (sortField === 'targetQty') {
      aVal = parseFloat(a.targetQty) || 0;
      bVal = parseFloat(b.targetQty) || 0;
    } else if (sortField === 'confirmedQty') {
      aVal = parseFloat(a.confirmedQty) || 0;
      bVal = parseFloat(b.confirmedQty) || 0;
    } else if (sortField === 'deliveredQty') {
      aVal = parseFloat(a.deliveredQty) || 0;
      bVal = parseFloat(b.deliveredQty) || 0;
    } else if (sortField === 'status') {
      aVal = a.status || '';
      bVal = b.status || '';
    } else if (sortField === 'plannedStartDate') {
      aVal = a.plannedStartDate || '';
      bVal = b.plannedStartDate || '';
    } else if (sortField === 'plannedEndDate') {
      aVal = a.plannedEndDate || '';
      bVal = b.plannedEndDate || '';
    } else if (sortField === 'createdAt') {
      aVal = a.createdAt || '';
      bVal = b.createdAt || '';
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    } else {
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }
  });

  // Actual standard SAP S/4HANA Order Types and descriptions
  const ORDER_TYPE_DESCRIPTIONS: Record<string, string> = {
    YBM1: 'MTS Production Order',
    YBM4: 'Production Order Processing MTO',
    YBM5: 'MTS Production for Process Manufacturing',
    YBM6: 'Prod Order ETO (Event-Based Posting)',
    YBW1: 'Rework Prod. Order - Stock Manufac. Item',
    YPK1: 'Production order for Kanban',
    ZDEV: 'Development Prod. Order',
    ZPPN: 'Production Order MTO',
    ZPPS: 'Production Order MTS',
    ZRWI: 'Rework Prod. Order - In Process',
    ZRWM: 'Rework Prod. Order - Stock Manufactured'
  };

  // Dynamically extract actual Order Types present in the live orders fetched from SAP S/4HANA
  const uniqueOrderTypes = React.useMemo(() => {
    const types = new Set<string>();
    orders?.forEach((o: any) => {
      if (o.orderType) {
        types.add(o.orderType);
      }
    });
    // Ensure all actual SAP S/4HANA order types are always available
    Object.keys(ORDER_TYPE_DESCRIPTIONS).forEach(t => types.add(t));
    return Array.from(types);
  }, [orders]);

  if (ordersLoading) {
    return (
      <div style={{ 
        padding: '3rem', 
        fontFamily: 'var(--font-sans)', 
        textAlign: 'center', 
        color: '#6a7b8c' 
      }}>
        Loading production orders...
      </div>
    );
  }

  // Find slocs for the selected plant
  const filteredSlocs = slocs?.filter((s: any) => s.plant_ID === plantId) || [];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#32363a' }}>Monitor Production Orders</h2>
          <p style={{ fontSize: '0.85rem', color: '#6a7b8c' }}>Select, analyze, and manage discrete manufacturing orders.</p>
        </div>
        {user && ['SYS_ADMIN', 'PROD_PLANNER'].includes(user.role) && (
          <button 
            className="sap-btn sap-btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus size={16} />
            <span>Create Production Order</span>
          </button>
        )}
      </div>

      {/* Create Order Form Panel */}
      {showCreateForm && (
        <div className="sap-card" style={{ marginBottom: '2rem', border: '1px solid #0a6ed1' }}>
          <div className="sap-card-header">
            <h3 className="sap-card-title">New Production Order Details</h3>
          </div>
          {formError && (
            <div style={{ backgroundColor: '#ffe3e3', border: '1px solid #ffb3b3', color: '#bb0000', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {formError}
            </div>
          )}
          <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Group 1: Initial Screen Parameters */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sap-text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>1. Initial Screen Parameters</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', borderBottom: '1px solid #eee', paddingBottom: '1.25rem' }}>
                <div className="sap-form-group">
                  <label className="sap-label">Order Type *</label>
                  <select className="sap-input" value={orderType} onChange={e => setOrderType(e.target.value)} required>
                    {uniqueOrderTypes.map(t => (
                      <option key={t} value={t}>{t} - {ORDER_TYPE_DESCRIPTIONS[t] || 'Custom Production Order'}</option>
                    ))}
                  </select>
                </div>
                <div className="sap-form-group">
                  <label className="sap-label">Material *</label>
                  <select className="sap-input" value={materialId} onChange={e => setMaterialId(e.target.value)} required>
                    <option value="">-- Select Material --</option>
                    {finishedMaterials?.map((m: any) => (
                      <option key={m.ID} value={m.ID}>{m.code} - {m.description}</option>
                    ))}
                  </select>
                </div>
                <div className="sap-form-group">
                  <label className="sap-label">Production Plant *</label>
                  <select className="sap-input" value={plantId} onChange={e => { 
                    setPlantId(e.target.value); 
                    setPlanningPlantId(e.target.value); // Default planning plant to same as production plant
                    setSlocId(''); 
                  }} required>
                    <option value="">-- Select Plant --</option>
                    {plants?.map((p: any) => (
                      <option key={p.ID} value={p.ID}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sap-form-group">
                  <label className="sap-label">Planning Plant</label>
                  <select className="sap-input" value={planningPlantId} onChange={e => setPlanningPlantId(e.target.value)}>
                    <option value="">-- Same as Production Plant --</option>
                    {plants?.map((p: any) => (
                      <option key={p.ID} value={p.ID}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Group 2: Scheduling, Quantities & Dates (General Tab) */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sap-text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>2. Scheduling, Quantities & Dates (General Tab)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', borderBottom: '1px solid #eee', paddingBottom: '1.25rem' }}>
                <div className="sap-form-group">
                  <label className="sap-label">Scheduling Type</label>
                  <select className="sap-input" value={schedulingType} onChange={e => setSchedulingType(e.target.value)}>
                    <option value="Forwards">Forwards</option>
                    <option value="Backwards">Backwards</option>
                    <option value="Only capacity requirements">Only capacity requirements</option>
                    <option value="Current date">Current date</option>
                    <option value="Forwards in time">Forwards in time</option>
                    <option value="Backwards in time">Backwards in time</option>
                    <option value="Capacity requirements & time">Capacity requirements & time</option>
                    <option value="Current date-time">Current date-time</option>
                  </select>
                </div>
                <div className="sap-form-group">
                  <label className="sap-label">Total Qty * (PC)</label>
                  <input type="number" className="sap-input" value={targetQty} onChange={e => setTargetQty(e.target.value)} min="1" required />
                </div>
                <div className="sap-form-group">
                  <label className="sap-label">Storage Location *</label>
                  <select className="sap-input" value={slocId} onChange={e => setSlocId(e.target.value)} required disabled={!plantId}>
                    <option value="">-- Select Storage --</option>
                    {filteredSlocs.map((s: any) => (
                      <option key={s.ID} value={s.ID}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sap-form-group">
                  <label className="sap-label">
                    Start Date 
                    {(schedulingType === 'Forwards' || schedulingType === 'Forwards in time') ? ' *' : ' (Calculated)'}
                  </label>
                  <input 
                    type="date" 
                    className="sap-input" 
                    value={plannedStartDate} 
                    onChange={e => {
                      setPlannedStartDate(e.target.value);
                      if (schedulingType === 'Forwards' || schedulingType === 'Forwards in time') {
                        calculateEndDateFromStart(e.target.value, floatAfterProd);
                      }
                    }} 
                    required={schedulingType === 'Forwards' || schedulingType === 'Forwards in time'} 
                    disabled={schedulingType === 'Backwards' || schedulingType === 'Backwards in time' || schedulingType === 'Current date' || schedulingType === 'Current date-time'}
                    style={{
                      border: formError.includes('Forward scheduling') ? '1.5px solid #d32f2f' : '1px solid var(--sap-border-color)',
                      backgroundColor: (schedulingType === 'Backwards' || schedulingType === 'Backwards in time' || schedulingType === 'Current date' || schedulingType === 'Current date-time') ? '#f3f4f5' : '#ffffff'
                    }}
                  />
                </div>
                <div className="sap-form-group">
                  <label className="sap-label">
                    End Date 
                    {(schedulingType === 'Backwards' || schedulingType === 'Backwards in time') ? ' *' : ' (Calculated)'}
                  </label>
                  <input 
                    type="date" 
                    className="sap-input" 
                    value={plannedEndDate} 
                    onChange={e => {
                      setPlannedEndDate(e.target.value);
                      if (schedulingType === 'Backwards' || schedulingType === 'Backwards in time') {
                        calculateStartDateFromEnd(e.target.value, floatBeforeProd);
                      }
                    }} 
                    required={schedulingType === 'Backwards' || schedulingType === 'Backwards in time'} 
                    disabled={schedulingType === 'Forwards' || schedulingType === 'Forwards in time' || schedulingType === 'Current date' || schedulingType === 'Current date-time'}
                    style={{
                      border: formError.includes('Backward scheduling') ? '1.5px solid #d32f2f' : '1px solid var(--sap-border-color)',
                      backgroundColor: (schedulingType === 'Forwards' || schedulingType === 'Forwards in time' || schedulingType === 'Current date' || schedulingType === 'Current date-time') ? '#f3f4f5' : '#ffffff'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Group 3: Scheduling Margin Key & Floats */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sap-text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>3. Scheduling Margin Key & Floats</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div className="sap-form-group">
                  <label className="sap-label">Sched. Margin Key</label>
                  <input type="text" className="sap-input" value={schedMarginKey} onChange={e => setSchedMarginKey(e.target.value)} placeholder="001" maxLength={3} />
                </div>
                <div className="sap-form-group">
                  <label className="sap-label">Float Before Production (Workdays)</label>
                  <input type="number" className="sap-input" value={floatBeforeProd} onChange={e => setFloatBeforeProd(e.target.value)} min="0" />
                </div>
                <div className="sap-form-group">
                  <label className="sap-label">Float After Production (Workdays)</label>
                  <input type="number" className="sap-input" value={floatAfterProd} onChange={e => setFloatAfterProd(e.target.value)} min="0" />
                </div>
                <div className="sap-form-group">
                  <label className="sap-label">Release Period (Workdays)</label>
                  <input type="number" className="sap-input" value={releasePeriod} onChange={e => setReleasePeriod(e.target.value)} min="0" />
                </div>
                <div className="sap-form-group">
                  <label className="sap-label">Priority</label>
                  <input type="number" className="sap-input" value={priority} onChange={e => setPriority(e.target.value)} placeholder="0" min="0" style={{ height: '36px' }} />
                </div>
              </div>
            </div>

            {/* Radio explosion controls & Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid #eee', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
              <div className="sap-form-group" style={{ marginBottom: 0 }}>
                <label className="sap-label" style={{ display: 'block', marginBottom: '0.25rem' }}>BOM/Routing Explosion Status</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <input type="radio" name="initialStatus" checked={initialStatus === 'CRTD'} onChange={() => setInitialStatus('CRTD')} />
                    <span>Explode Immediately (CRTD)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <input type="radio" name="initialStatus" checked={initialStatus === 'DRAFT'} onChange={() => setInitialStatus('DRAFT')} />
                    <span>Save Draft (DRAFT)</span>
                  </label>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="sap-btn sap-btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
                <button type="submit" className="sap-btn sap-btn-primary" disabled={createOrderMutation.isPending}>
                  {createOrderMutation.isPending ? 'Processing...' : 'Create Order'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Table Panel */}
      <div className="sap-card">
        {/* Advanced Search & Filtering Panel */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--sap-border-color)', paddingBottom: '1.25rem' }}>
          
          {/* Controls Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            
            {/* Universal Search */}
            <div className="sap-form-group" style={{ marginBottom: 0 }}>
              <label className="sap-label">Search Orders</label>
              <input 
                type="text" 
                className="sap-input" 
                placeholder="Order #, Material, Plant..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Plant Filter */}
            <div className="sap-form-group" style={{ marginBottom: 0 }}>
              <label className="sap-label">Filter by Plant</label>
              <select 
                className="sap-input" 
                value={filterPlant} 
                onChange={e => setFilterPlant(e.target.value)}
              >
                <option value="ALL">All Plants</option>
                {plants?.map((p: any) => (
                  <option key={p.ID} value={p.ID}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>

            {/* Date Range Start */}
            <div className="sap-form-group" style={{ marginBottom: 0 }}>
              <label className="sap-label">Start Date</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="date" 
                  className="sap-input" 
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                />
              </div>
            </div>

            {/* Date Range End */}
            <div className="sap-form-group" style={{ marginBottom: 0 }}>
              <label className="sap-label">End Date</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="date" 
                  className="sap-input" 
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Sort Orders Section */}
            <div className="sap-form-group" style={{ marginBottom: 0 }}>
              <label className="sap-label">Sort Orders</label>
              <select 
                className="sap-input" 
                value={`${sortField}_${sortDirection}`} 
                onChange={e => {
                  const [field, direction] = e.target.value.split('_');
                  setSortField(field);
                  setSortDirection(direction as 'asc' | 'desc');
                }}
              >
                <option value="createdAt_desc">Most Recent (Newest First)</option>
                <option value="createdAt_asc">Oldest First</option>
                <option value="orderNumber_asc">Order Number (A-Z)</option>
                <option value="orderNumber_desc">Order Number (Z-A)</option>
                <option value="plannedStartDate_asc">Planned Start Date (Earliest)</option>
                <option value="plannedEndDate_asc">Planned End Date</option>
                <option value="targetQty_desc">Target Quantity (High to Low)</option>
                <option value="status_asc">Execution Status</option>
                <option value="plant_asc">Plant Code</option>
              </select>
            </div>

            {/* Reset Button */}
            <button 
              type="button" 
              className="sap-btn sap-btn-secondary"
              style={{ height: '36px' }}
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('ALL');
                setFilterPlant('ALL');
                setFilterStartDate('');
                setFilterEndDate('');
                 setSortField('createdAt');
                 setSortDirection('desc');
              }}
            >
              Reset Filters
            </button>
          </div>

          {/* Status Filters Toggle Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--sap-text-secondary)' }}>
              <Filter size={14} />
              <span>Status:</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['ALL', 'DRAFT', 'CRTD', 'REL', 'CNF', 'PCNF', 'DLV', 'PRC', 'CSER', 'GMPS', 'MACM', 'RESA', 'VCAL', 'TECO', 'CLSD'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    border: '1px solid var(--sap-border-color)',
                    backgroundColor: filterStatus === st ? 'var(--sap-brand-color)' : 'var(--sap-surface-color)',
                    color: filterStatus === st ? '#ffffff' : 'var(--sap-text-color)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Chips / Tags */}
          {(searchQuery || filterStatus !== 'ALL' || filterPlant !== 'ALL' || filterStartDate || filterEndDate) && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--sap-text-secondary)' }}>Active Filters:</span>
              
              {searchQuery && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--sap-bg-color)', border: '1px solid var(--sap-border-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Query: "{searchQuery}"
                  <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setSearchQuery('')}>×</span>
                </span>
              )}

              {filterStatus !== 'ALL' && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--sap-bg-color)', border: '1px solid var(--sap-border-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Status: {filterStatus}
                  <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setFilterStatus('ALL')}>×</span>
                </span>
              )}

              {filterPlant !== 'ALL' && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--sap-bg-color)', border: '1px solid var(--sap-border-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Plant: {plants?.find((p: any) => p.ID === filterPlant)?.code}
                  <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setFilterPlant('ALL')}>×</span>
                </span>
              )}

              {filterStartDate && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--sap-bg-color)', border: '1px solid var(--sap-border-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  From: {filterStartDate}
                  <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setFilterStartDate('')}>×</span>
                </span>
              )}

              {filterEndDate && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--sap-bg-color)', border: '1px solid var(--sap-border-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  To: {filterEndDate}
                  <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setFilterEndDate('')}>×</span>
                </span>
              )}
            </div>
          )}

        </div>

        {/* Table */}
        <div className="sap-table-container">
          <table className="sap-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Header Material</th>
                <th>Plant</th>
                <th>Target Qty</th>
                <th>Confirmed Qty</th>
                <th>Delivered Qty</th>
                <th>Status</th>
                <th>Planned Start</th>
                <th>Planned End</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No production orders found matching filter.</td>
                </tr>
              ) : (
                sortedOrders.map((o: any) => (
                  <tr key={o.ID}>
                    <td style={{ fontWeight: 600, color: '#0a6ed1' }}>
                      <Link to={`/orders/${o.ID}`} style={{ textDecoration: 'none', color: 'inherit' }}>{o.orderNumber}</Link>
                    </td>
                    <td>
                      <div>{o.material?.code}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>{o.material?.description}</div>
                    </td>
                    <td>{o.plant?.code}</td>
                    <td>{parseFloat(o.targetQty).toFixed(0)} PC</td>
                    <td>{parseFloat(o.confirmedQty).toFixed(0)} PC</td>
                    <td>{parseFloat(o.deliveredQty).toFixed(0)} PC</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '240px' }}>
                        {(o.status || '').split(' ').map((st: string) => (
                          <span key={st} className={`sap-badge sap-badge-${st}`}>{st}</span>
                        ))}
                      </div>
                    </td>
                    <td>{o.plannedStartDate}</td>
                    <td>{o.plannedEndDate}</td>
                    <td>
                      <Link to={`/orders/${o.ID}`} className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem', textDecoration: 'none' }}>
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <>
          <style>{`
            @keyframes slideIn {
              from { transform: translateY(-100px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 500,
            fontSize: '0.9rem',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <span>{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                padding: '0 4px',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        </>
      )}
    </div>
  );
};
