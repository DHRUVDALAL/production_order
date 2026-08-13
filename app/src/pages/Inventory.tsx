import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Package, ShieldAlert, CheckCircle2, Plus, RefreshCw } from 'lucide-react';

export const Inventory: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterGroup, setFilterGroup] = useState('ALL');

  // Manual stock adjustment form
  const [showAdjForm, setShowAdjForm] = useState(false);
  const [mId, setMId] = useState('');
  const [pId, setPId] = useState('');
  const [slId, setSlId] = useState('');
  const [qty, setQty] = useState('1000');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Queries
  const { data: materials, isLoading: matsLoading } = useQuery({
    queryKey: ['inventoryMaterials'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/Materials?$expand=plant');
      return res.data?.value || [];
    }
  });

  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ['inventoryMovements'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/GoodsMovements');
      return res.data?.value || [];
    }
  });

  const { data: plants } = useQuery({
    queryKey: ['plantsList'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/Plants');
      return res.data?.value || [];
    }
  });

  const { data: slocs } = useQuery({
    queryKey: ['slocsList'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/StorageLocations');
      return res.data?.value || [];
    }
  });

  const postMovementMutation = useMutation({
    mutationFn: async (movPayload: any) => {
      const res = await api.post('/odata/v4/production/GoodsMovements', movPayload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] });
      setSuccessMsg('Stock adjustment (561 Initial Entry) posted successfully!');
      setShowAdjForm(false);
      setMId('');
      setQty('1000');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to post adjustment.');
    }
  });

  if (matsLoading || movementsLoading) {
    return (
      <div style={{ 
        padding: '3rem', 
        fontFamily: 'var(--font-sans)', 
        textAlign: 'center', 
        color: '#6a7b8c' 
      }}>
        Loading plant inventories...
      </div>
    );
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlant, setFilterPlant] = useState('ALL');
  const [filterStockStatus, setFilterStockStatus] = useState('ALL');

  // Calculate live stock balances in memory by aggregating GoodsMovements
  const calculateStock = (matId: string, plantId: string) => {
    const matMovs = movements?.filter((m: any) => m.material_ID === matId && m.plant_ID === plantId) || [];
    let stock = 0;
    matMovs.forEach((m: any) => {
      if (m.movementType === '101' || m.movementType === '561') {
        stock += parseFloat(m.quantity);
      } else if (m.movementType === '261' || m.movementType === '551') {
        stock -= parseFloat(m.quantity);
      }
    });
    return stock;
  };

  const handlePostAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!mId || !pId || !slId || !qty) {
      setErrorMsg('Please fill in all adjustment fields.');
      return;
    }

    if (parseFloat(qty) <= 0) {
      setErrorMsg('Adjustment quantity must be positive.');
      return;
    }

    postMovementMutation.mutate({
      movementNumber: 'GM' + Math.floor(100000 + Math.random() * 900000),
      material_ID: mId,
      plant_ID: pId,
      storageLocation_ID: slId,
      movementType: '561', // Initial entry of stock
      quantity: parseFloat(qty),
      unit: 'PC',
      postingDate: new Date().toISOString().split('T')[0]
    });
  };

  // Find storage locations for local plant
  const localSlocs = slocs?.filter((s: any) => s.plant_ID === pId) || [];

  // Multi-criteria filter logic
  const filteredMats = materials?.filter((m: any) => {
    // 1. Search Query Filter (Code or Description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCode = m.code?.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      if (!matchCode && !matchDesc) return false;
    }

    // 2. Material Group Filter
    if (filterGroup !== 'ALL' && m.materialGroup !== filterGroup) {
      return false;
    }

    // 3. Plant Filter
    if (filterPlant !== 'ALL' && m.plant_ID !== filterPlant) {
      return false;
    }

    // 4. Stock Availability Status Filter
    if (filterStockStatus !== 'ALL') {
      const stock = calculateStock(m.ID, m.plant_ID);
      if (filterStockStatus === 'IN_STOCK' && stock <= 0) return false;
      if (filterStockStatus === 'ZERO_STOCK' && stock !== 0) return false;
      if (filterStockStatus === 'NEGATIVE_STOCK' && stock >= 0) return false;
    }

    return true;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setFilterGroup('ALL');
    setFilterPlant('ALL');
    setFilterStockStatus('ALL');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#32363a' }}>Plant Inventory Balances (MM)</h2>
          <p style={{ fontSize: '0.85rem', color: '#6a7b8c' }}>Live warehouse stock balances computed from Material Document movements.</p>
        </div>
        {user && ['SYS_ADMIN', 'INV_MANAGER'].includes(user.role) && (
          <button className="sap-btn sap-btn-primary" onClick={() => setShowAdjForm(!showAdjForm)}>
            <Plus size={16} />
            <span>Initial Entry of Stock (561)</span>
          </button>
        )}
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

      {/* Manual Stock Entry Panel */}
      {showAdjForm && (
        <div className="sap-card" style={{ marginBottom: '2rem', border: '1px solid #0a6ed1' }}>
          <div className="sap-card-header">
            <h3 className="sap-card-title">Initial Stock Entry (Movement 561)</h3>
          </div>
          <form onSubmit={handlePostAdjustment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            <div className="sap-form-group">
              <label className="sap-label">Select Material *</label>
              <select className="sap-input" value={mId} onChange={e => setMId(e.target.value)} required>
                <option value="">-- Select Material --</option>
                {materials?.map((m: any) => (
                  <option key={m.ID} value={m.ID}>{m.code} - {m.description} ({m.materialGroup})</option>
                ))}
              </select>
            </div>

            <div className="sap-form-group">
              <label className="sap-label">Production Plant *</label>
              <select className="sap-input" value={pId} onChange={e => { setPId(e.target.value); setSlId(''); }} required>
                <option value="">-- Select Plant --</option>
                {plants?.map((p: any) => (
                  <option key={p.ID} value={p.ID}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>

            <div className="sap-form-group">
              <label className="sap-label">Storage Location *</label>
              <select className="sap-input" value={slId} onChange={e => setSlId(e.target.value)} required disabled={!pId}>
                <option value="">-- Select Storage --</option>
                {localSlocs.map((s: any) => (
                  <option key={s.ID} value={s.ID}>{s.code} - {s.name}</option>
                ))}
              </select>
            </div>

            <div className="sap-form-group">
              <label className="sap-label">Initial Quantity (PC) *</label>
              <input type="number" className="sap-input" value={qty} onChange={e => setQty(e.target.value)} min="1" required />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" className="sap-btn sap-btn-secondary" onClick={() => setShowAdjForm(false)}>Cancel</button>
              <button type="submit" className="sap-btn sap-btn-primary" disabled={postMovementMutation.isPending}>
                {postMovementMutation.isPending ? 'Posting...' : 'Post Stock'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters Toolbar and Table */}
      <div className="sap-card">
        {/* Multi-Criteria Filter Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e2e8f0' }}>
          {/* Search Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Search Material</label>
            <input 
              type="text"
              placeholder="Material code, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sap-input"
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          {/* Plant Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Filter by Plant</label>
            <select 
              value={filterPlant}
              onChange={(e) => setFilterPlant(e.target.value)}
              className="sap-input"
              style={{ fontSize: '0.85rem' }}
            >
              <option value="ALL">All Plants</option>
              {plants?.map((p: any) => (
                <option key={p.ID} value={p.ID}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          {/* Stock Level Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Stock Availability</label>
            <select 
              value={filterStockStatus}
              onChange={(e) => setFilterStockStatus(e.target.value)}
              className="sap-input"
              style={{ fontSize: '0.85rem' }}
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN_STOCK">In Stock (&gt; 0 PC)</option>
              <option value="ZERO_STOCK">Zero Stock (0 PC)</option>
              <option value="NEGATIVE_STOCK">Negative Balance</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={resetFilters}
              className="sap-btn sap-btn-secondary"
              style={{ width: '100%', fontSize: '0.85rem', height: '36px' }}
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Material Category Quick Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>Filter Category:</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['ALL', 'RAW', 'FINISHED', 'COMPONENT'].map((g) => (
              <button
                key={g}
                onClick={() => setFilterGroup(g)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  border: '1px solid #ced4da',
                  backgroundColor: filterGroup === g ? '#0a6ed1' : '#ffffff',
                  color: filterGroup === g ? '#ffffff' : '#495057',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {g === 'ALL' ? 'All Materials' : g === 'RAW' ? 'Raw Materials (RM)' : g === 'FINISHED' ? 'Finished Assemblies (FG)' : 'Components'}
              </button>
            ))}
          </div>
        </div>

        <div className="sap-table-container">
          <table className="sap-table">
            <thead>
              <tr>
                <th>Material Code</th>
                <th>Description</th>
                <th>Category</th>
                <th>Plant</th>
                <th>Unit Price</th>
                <th>Calculated Live Stock</th>
              </tr>
            </thead>
            <tbody>
              {filteredMats && filteredMats.length > 0 ? (
                filteredMats.map((m: any) => {
                  const stock = calculateStock(m.ID, m.plant_ID);
                  return (
                    <tr key={m.ID}>
                      <td style={{ fontWeight: 600, color: '#32363a' }}>{m.code}</td>
                      <td>{m.description}</td>
                      <td>
                        <span className={`sap-badge`} style={{
                          backgroundColor: m.materialGroup === 'RAW' ? '#e2e7ec' : m.materialGroup === 'FINISHED' ? '#e8f4fd' : '#fff3bf',
                          color: m.materialGroup === 'RAW' ? '#5c6b77' : m.materialGroup === 'FINISHED' ? '#0d6efd' : '#f59f00'
                        }}>
                          {m.materialGroup}
                        </span>
                      </td>
                      <td>{m.plant?.name || m.plant_ID} ({m.plant?.code || 'N/A'})</td>
                      <td>${parseFloat(m.standardPrice || 0).toFixed(2)} {m.currency || 'USD'}</td>
                      <td style={{ fontWeight: 700, color: stock > 0 ? '#2b7c2b' : stock === 0 ? '#6a7b8c' : '#bb0000' }}>
                        {stock.toLocaleString()} PC
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No materials found matching the current search &amp; filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
