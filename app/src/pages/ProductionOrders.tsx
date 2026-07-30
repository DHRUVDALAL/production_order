import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Filter, Calendar, Layers } from 'lucide-react';

export const ProductionOrders: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPlant, setFilterPlant] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Creation form state
  const [materialId, setMaterialId] = useState('');
  const [plantId, setPlantId] = useState('');
  const [slocId, setSlocId] = useState('');
  const [targetQty, setTargetQty] = useState('100');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordersList'] });
      setShowCreateForm(false);
      // Reset form
      setMaterialId('');
      setPlantId('');
      setSlocId('');
      setTargetQty('100');
      setPlannedStartDate('');
      setPlannedEndDate('');
      setFormError('');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error?.message || 'Failed to create order.';
      setFormError(errMsg);
    }
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!materialId || !plantId || !slocId || !targetQty || !plannedStartDate || !plannedEndDate) {
      setFormError('Please fill out all mandatory fields.');
      return;
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
      plannedEndDate
    });
  };

  const filteredOrders = orders?.filter((o: any) => {
    // 1. Status Filter
    if (filterStatus !== 'ALL' && o.status !== filterStatus) return false;

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
          <form onSubmit={handleCreateOrder} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div className="sap-form-group">
              <label className="sap-label">Finished Material *</label>
              <select className="sap-input" value={materialId} onChange={e => setMaterialId(e.target.value)} required>
                <option value="">-- Select Material --</option>
                {finishedMaterials?.map((m: any) => (
                  <option key={m.ID} value={m.ID}>{m.code} - {m.description}</option>
                ))}
              </select>
            </div>

            <div className="sap-form-group">
              <label className="sap-label">Production Plant *</label>
              <select className="sap-input" value={plantId} onChange={e => { setPlantId(e.target.value); setSlocId(''); }} required>
                <option value="">-- Select Plant --</option>
                {plants?.map((p: any) => (
                  <option key={p.ID} value={p.ID}>{p.code} - {p.name}</option>
                ))}
              </select>
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
              <label className="sap-label">Target Quantity *</label>
              <input type="number" className="sap-input" value={targetQty} onChange={e => setTargetQty(e.target.value)} min="1" required />
            </div>

            <div className="sap-form-group">
              <label className="sap-label">Planned Start Date *</label>
              <input type="date" className="sap-input" value={plannedStartDate} onChange={e => setPlannedStartDate(e.target.value)} required />
            </div>

            <div className="sap-form-group">
              <label className="sap-label">Planned End Date *</label>
              <input type="date" className="sap-input" value={plannedEndDate} onChange={e => setPlannedEndDate(e.target.value)} required />
            </div>

            <div className="sap-form-group">
              <label className="sap-label">BOM/Routing Explosion Status</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
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

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" className="sap-btn sap-btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button type="submit" className="sap-btn sap-btn-primary" disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending ? 'Processing...' : 'Create Order'}
              </button>
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
              {['ALL', 'DRAFT', 'CRTD', 'MACA', 'REL', 'STRT', 'GI', 'INSP', 'CNF', 'GR', 'TECO', 'CLSD'].map((st) => (
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
              {filteredOrders?.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No production orders found matching filter.</td>
                </tr>
              ) : (
                filteredOrders?.map((o: any) => (
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
                      <span className={`sap-badge sap-badge-${o.status}`}>{o.status}</span>
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
    </div>
  );
};
