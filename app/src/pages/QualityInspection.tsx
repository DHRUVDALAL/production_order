import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, ShieldAlert, Award, AlertTriangle, Calendar, FileCheck, CheckCircle, RefreshCw } from 'lucide-react';

// Error Boundary for Quality Inspection Page
class QualityErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[QualityErrorBoundary] Caught rendering exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#32363a' }}>Quality Inspection Lots & Usage Decisions</h2>
            <p style={{ fontSize: '0.85rem', color: '#6a7b8c' }}>Execute In-Process (Type 03) and Post-Production (Type 04) Result Recording & Usage Decisions.</p>
          </div>
          <div className="sap-card" style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: '#fff5f5', border: '1px solid #ffc9c9' }}>
            <AlertTriangle size={36} color="#e03131" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#c92a2a', marginBottom: '0.5rem' }}>
              Something went wrong while loading the Quality Inspection page.
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#7f1d1d', marginBottom: '1.5rem' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              className="sap-btn sap-btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const QualityInspectionContent: React.FC = () => {
  console.log('[QualityInspection] Component mounted');

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedLotForUD, setSelectedLotForUD] = useState<any>(null);
  const [selectedLotForRR, setSelectedLotForRR] = useState<any>(null);
  const [inspectedQtyInput, setInspectedQtyInput] = useState('');
  const [approvedQty, setApprovedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('0');
  const [decision, setDecision] = useState('UDAC'); // UDAC or UDRJ
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const formRef = React.useRef<HTMLTableRowElement>(null);

  React.useEffect(() => {
    if ((selectedLotForRR || selectedLotForUD) && formRef.current) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [selectedLotForRR, selectedLotForUD]);

  // Fetch Inspection lots with fallback & safe $expand
  const { data: rawData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['inspectionLotsList'],
    queryFn: async () => {
      try {
        console.log('[QualityInspection] Fetching QualityInspectionLots with $expand...');
        const res = await api.get('/odata/v4/production/QualityInspectionLots?$expand=order,material,plant,operation');
        return res.data;
      } catch (err: any) {
        console.warn('[QualityInspection] $expand query failed, attempting un-expanded fallback:', err?.message);
        const fallbackRes = await api.get('/odata/v4/production/QualityInspectionLots');
        return fallbackRes.data;
      }
    }
  });

  // Filter states for SAP Fiori-style Filter Bar
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterPlant, setFilterPlant] = useState('ALL');
  const [filterResultsStatus, setFilterResultsStatus] = useState('ALL');
  const [filterUdStatus, setFilterUdStatus] = useState('ALL');
  const [filterOp, setFilterOp] = useState('ALL');

  console.log('[QualityInspection] Loading:', isLoading);
  console.log('[QualityInspection] Error:', error);
  console.log('[QualityInspection] Data:', rawData);

  // Normalize API response safely into a clean Array
  const inspectionLotsResponse = rawData ?? {};
  const rawLots: any[] = Array.isArray(inspectionLotsResponse)
    ? inspectionLotsResponse
    : Array.isArray(inspectionLotsResponse?.value)
      ? inspectionLotsResponse.value
      : [];

  // Extract unique plant and operation options dynamically
  const plantOptions = Array.from(new Set(rawLots.map(l => l?.plant?.code || l?.plantCode || '').filter(Boolean)));
  const opOptions = Array.from(new Set(rawLots.map(l => {
    const seq = String(l?.operationSequence || l?.operation?.sequence || (l?.inspectionType === '03' ? 30 : 40)).padStart(4, '0');
    return seq;
  }).filter(Boolean))).sort();

  // Apply workflow filters dynamically
  const inspectionLots = rawLots.filter((l: any) => {
    const isType03 = l?.inspectionType === '03';
    const lotNum = (l?.lotNumber || '').toLowerCase();
    const orderNum = (l?.order?.orderNumber || l?.orderNumber || '').toLowerCase();
    const matCode = (l?.material?.code || l?.materialCode || '').toLowerCase();
    const query = searchTerm.toLowerCase().trim();

    // 1. Global Search
    if (query && !lotNum.includes(query) && !orderNum.includes(query) && !matCode.includes(query)) {
      return false;
    }

    // 2. Inspection Type Filter (03 / 04)
    if (filterType !== 'ALL' && l?.inspectionType !== filterType) {
      return false;
    }

    // 3. Plant Filter
    const plantCode = l?.plant?.code || l?.plantCode || '';
    if (filterPlant !== 'ALL' && plantCode !== filterPlant) {
      return false;
    }

    // 4. Results Status Filter (Pending / Completed)
    const resStatus = l?.resultsStatus || (l?.resultsRecorded ? 'COMPLETED' : 'PENDING');
    if (filterResultsStatus !== 'ALL' && resStatus !== filterResultsStatus) {
      return false;
    }

    // 5. Usage Decision Status Filter (Pending / Completed)
    const isCompleted = l?.status === 'COMPLETED' || l?.status === 'APPROVED' || l?.status === 'REJECTED' || l?.status === 'COMP';
    const udStatus = l?.usageDecisionStatus || (isCompleted ? 'COMPLETED' : l?.resultsRecorded ? 'PENDING' : 'LOCKED');
    if (filterUdStatus !== 'ALL' && udStatus !== filterUdStatus) {
      return false;
    }

    // 6. Operation Filter & Workflow Mapping
    const lotOpSeq = String(isType03 ? 30 : (l?.operationSequence || l?.operation?.sequence || 40)).padStart(4, '0');
    if (filterOp !== 'ALL') {
      if (filterOp === '0030') {
        // Operation 0030 MUST show ONLY Type 03 / IN_PROCESS lots
        if (!isType03 || lotOpSeq !== '0030' || (l?.inspectionStage && l?.inspectionStage !== 'IN_PROCESS')) {
          return false;
        }
      } else if (filterOp === '0040') {
        // Operation 0040 MUST show ONLY Type 04 / POST_PRODUCTION lots
        if (isType03 || lotOpSeq !== '0040' || (l?.inspectionStage && l?.inspectionStage !== 'POST_PRODUCTION')) {
          return false;
        }
      } else if (lotOpSeq !== filterOp) {
        return false;
      }
    }

    return true;
  });

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterType('ALL');
    setFilterPlant('ALL');
    setFilterResultsStatus('ALL');
    setFilterUdStatus('ALL');
    setFilterOp('ALL');
  };

  const recordResultMutation = useMutation({
    mutationFn: async (payload: { lotId: string; inspectedQty: number }) => {
      const res = await api.post('/odata/v4/production/recordResult', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['inspectionLotsList'] });
      setSuccessMsg(data?.message || `Result Recording completed for Lot ${selectedLotForRR?.lotNumber}!`);
      setSelectedLotForRR(null);
      setInspectedQtyInput('');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to complete Result Recording.');
    }
  });

  const submitDecisionMutation = useMutation({
    mutationFn: async (decisionPayload: any) => {
      const res = await api.post('/odata/v4/production/submitUsageDecision', decisionPayload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspectionLotsList'] });
      setSuccessMsg(`Usage Decision recorded successfully for Lot ${selectedLotForUD?.lotNumber}!`);
      setSelectedLotForUD(null);
      setApprovedQty('');
      setRejectedQty('0');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to submit Usage Decision.');
    }
  });

  const handleOpenResultRecordingDialog = (lot: any) => {
    setSelectedLotForRR(lot);
    setSelectedLotForUD(null);
    setInspectedQtyInput((lot.lotQty || 0).toString());
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleOpenDecisionDialog = (lot: any) => {
    if (!lot.resultsRecorded) {
      setErrorMsg(`Result Recording is pending for Lot ${lot.lotNumber}. Complete Result Recording before submitting Usage Decision.`);
      return;
    }
    setSelectedLotForUD(lot);
    setSelectedLotForRR(null);
    setApprovedQty((lot.lotQty || 0).toString());
    setRejectedQty('0');
    setDecision('UDAC');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleResultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const inspQtyVal = parseFloat(inspectedQtyInput);
    if (isNaN(inspQtyVal) || inspQtyVal <= 0) {
      setErrorMsg('Please specify a valid positive inspected quantity.');
      return;
    }
    recordResultMutation.mutate({
      lotId: selectedLotForRR.ID,
      inspectedQty: inspQtyVal
    });
  };

  const handleDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const appQtyVal = parseFloat(approvedQty);
    const rejQtyVal = parseFloat(rejectedQty);
    const totalQtyVal = parseFloat(selectedLotForUD?.lotQty || '0');

    if (isNaN(appQtyVal) || isNaN(rejQtyVal)) {
      setErrorMsg('Please specify valid approved and rejected quantities.');
      return;
    }

    if (appQtyVal + rejQtyVal !== totalQtyVal) {
      setErrorMsg(`The sum of Approved (${appQtyVal}) and Rejected (${rejQtyVal}) quantities must exactly equal the lot quantity (${totalQtyVal}).`);
      return;
    }

    submitDecisionMutation.mutate({
      lotId: selectedLotForUD.ID,
      approvedQty: appQtyVal,
      rejectedQty: rejQtyVal,
      usageDecision: decision
    });
  };

  // STEP 3 & 4: PAGE SHELL & LOADING STATE
  if (isLoading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#32363a' }}>Quality Inspection Lots & Usage Decisions</h2>
          <p style={{ fontSize: '0.85rem', color: '#6a7b8c' }}>Loading Quality Inspection Lots...</p>
        </div>
        <div className="sap-card" style={{ padding: '3rem', textAlign: 'center', color: '#0a6ed1' }}>
          <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto' }} />
          <p style={{ fontWeight: 600 }}>Fetching Quality Inspection Lots from SAP S/4HANA...</p>
        </div>
      </div>
    );
  }

  // STEP 5: ERROR STATE WITH RETRY BUTTON
  if (isError) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#32363a' }}>Quality Inspection Lots & Usage Decisions</h2>
          <p style={{ fontSize: '0.85rem', color: '#6a7b8c' }}>Execute In-Process (Type 03) and Post-Production (Type 04) Result Recording & Usage Decisions.</p>
        </div>

        <div className="sap-card" style={{ padding: '2.5rem', textAlign: 'center', backgroundColor: '#fff5f5', border: '1px solid #ffc9c9' }}>
          <AlertTriangle size={36} color="#e03131" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#c92a2a', marginBottom: '0.5rem' }}>
            Unable to Load Quality Inspection Lots
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#7f1d1d', marginBottom: '1rem' }}>
            The Quality Inspection service could not load the inspection lots.
          </p>
          <p style={{ fontSize: '0.8rem', color: '#b91c1c', fontFamily: 'monospace', marginBottom: '1.5rem' }}>
            {error instanceof Error ? error.message : 'Unknown service error'}
          </p>
          <button className="sap-btn sap-btn-primary" onClick={() => refetch()}>
            <RefreshCw size={14} style={{ marginRight: '6px' }} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#32363a' }}>Quality Inspection Lots & Usage Decisions</h2>
        <p style={{ fontSize: '0.85rem', color: '#6a7b8c' }}>Execute In-Process (Type 03) and Post-Production (Type 04) Result Recording & Usage Decisions.</p>
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

      {/* Lot List Table or Empty State */}
      <div className="sap-card" style={{ marginBottom: '2rem' }}>
        <div className="sap-card-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h3 className="sap-card-title">Quality Inspection Lots (In-Process 03 & Post-Production 04)</h3>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0a6ed1', backgroundColor: '#e0f2fe', padding: '4px 12px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
              {inspectionLots.length} {inspectionLots.length === 1 ? 'Inspection Lot' : 'Inspection Lots'}
            </span>
          </div>

          {/* SAP Fiori Filter Bar */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', boxSizing: 'border-box' }}>
            {/* ROW 1: Global Search Input */}
            <div style={{ width: '100%' }}>
              <input
                type="text"
                className="sap-input"
                placeholder="Search Lot Number, Order Number or Product..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', backgroundColor: '#ffffff' }}
              />
            </div>

            {/* ROW 2: Dropdown Filters & Reset Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 auto' }}>
                {/* Filter 1: Inspection Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '170px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Inspection Type</label>
                  <select className="sap-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#ffffff' }}>
                    <option value="ALL">All Inspection Types</option>
                    <option value="03">03 – In-Process Inspection</option>
                    <option value="04">04 – Post-Production Inspection</option>
                  </select>
                </div>

                {/* Filter 2: Plant */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '130px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Plant</label>
                  <select className="sap-input" value={filterPlant} onChange={e => setFilterPlant(e.target.value)} style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#ffffff' }}>
                    <option value="ALL">All Plants</option>
                    {plantOptions.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Filter 3: Results Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '150px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Results Status</label>
                  <select className="sap-input" value={filterResultsStatus} onChange={e => setFilterResultsStatus(e.target.value)} style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#ffffff' }}>
                    <option value="ALL">All Results Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Results Recorded</option>
                  </select>
                </div>

                {/* Filter 4: Usage Decision Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '180px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Usage Decision Status</label>
                  <select className="sap-input" value={filterUdStatus} onChange={e => setFilterUdStatus(e.target.value)} style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#ffffff' }}>
                    <option value="ALL">All UD Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Usage Decision Completed</option>
                    <option value="LOCKED">Locked</option>
                  </select>
                </div>

                {/* Filter 5: Operation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '180px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Operation</label>
                  <select className="sap-input" value={filterOp} onChange={e => setFilterOp(e.target.value)} style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#ffffff' }}>
                    <option value="ALL">All Operations</option>
                    <option value="0030">0030 – In-Process Inspection</option>
                    <option value="0040">0040 – Post-Production Inspection</option>
                  </select>
                </div>
              </div>

              {/* Reset Action */}
              <div style={{ alignSelf: 'flex-end', paddingTop: '2px' }}>
                <button
                  type="button"
                  className="sap-btn sap-btn-secondary"
                  onClick={handleResetFilters}
                  style={{ padding: '4px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="sap-table-container" style={{ overflowX: 'auto', paddingBottom: '12px' }}>
          {inspectionLots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
              <ShieldCheck size={40} style={{ margin: '0 auto 1rem auto', color: '#94a3b8' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>No Quality Inspection Lots Found</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                There are currently no inspection lots requiring inspection processing or a Usage Decision.
              </p>
            </div>
          ) : (
            <table className="sap-table" style={{ width: '100%', minWidth: '1500px' }}>
              <thead>
                <tr>
                  <th>Lot Number</th>
                  <th>Order Number</th>
                  <th>Operation</th>
                  <th>Type</th>
                  <th>Inspection Stage</th>
                  <th>Product</th>
                  <th>Plant</th>
                  <th>Lot Qty</th>
                  <th>Results Status</th>
                  <th>Usage Decision Status</th>
                  <th>Usage Decision</th>
                  <th>Status</th>
                  <th style={{
                    width: '240px',
                    minWidth: '240px',
                    position: 'sticky',
                    right: 0,
                    backgroundColor: '#f8fafc',
                    zIndex: 3,
                    boxShadow: '-2px 0 5px rgba(0,0,0,0.05)'
                  }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {inspectionLots.map((l: any) => {
                  const isType03 = l?.inspectionType === '03';
                  const displayOpSeq = isType03 ? '0030' : String(l?.operationSequence || l?.operation?.sequence || 40).padStart(4, '0');
                  const isCompleted = l?.status === 'COMPLETED' || l?.status === 'APPROVED' || l?.status === 'REJECTED' || l?.status === 'COMP';
                  const resStatus = l?.resultsStatus || (l?.resultsRecorded ? 'COMPLETED' : 'PENDING');
                  const udStatus = l?.usageDecisionStatus || (isCompleted ? 'COMPLETED' : l?.resultsRecorded ? 'PENDING' : 'LOCKED');
                  const isSelectedForRR = selectedLotForRR?.ID === l?.ID || selectedLotForRR?.lotNumber === l?.lotNumber;
                  const isSelectedForUD = selectedLotForUD?.ID === l?.ID || selectedLotForUD?.lotNumber === l?.lotNumber;

                  return (
                    <React.Fragment key={l?.ID || l?.lotNumber}>
                      <tr
                        style={{
                          backgroundColor: isSelectedForRR ? '#eff6ff' : isSelectedForUD ? '#faf5ff' : 'transparent',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <td style={{ fontWeight: 600, color: '#7048e8' }}>{l?.lotNumber || '-'}</td>
                        <td style={{ fontWeight: 600, color: '#0a6ed1' }}>{l?.order?.orderNumber || l?.orderNumber || '-'}</td>
                        <td style={{ fontWeight: 600, color: isType03 ? '#0369a1' : '#475569' }}>
                          {displayOpSeq}
                        </td>
                        <td>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isType03 ? '#e0f2fe' : '#f3e8ff',
                            color: isType03 ? '#0369a1' : '#6b21a8',
                            border: `1px solid ${isType03 ? '#bae6fd' : '#e9d5ff'}`
                          }}>
                            {l?.inspectionType || '04'} ({isType03 ? 'In-Process' : 'Post-Prod'})
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isType03 ? '#0284c7' : '#7e22ce' }}>
                            {l?.inspectionStage || (isType03 ? 'In-Process Inspection' : 'Post-Production Inspection')}
                          </span>
                        </td>
                        <td>{l?.material?.code || l?.materialCode || '-'}</td>
                        <td>{l?.plant?.code || l?.plantCode || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{parseFloat(l?.lotQty || 0).toFixed(0)} PC</td>
                        <td>
                          {resStatus === 'COMPLETED' ? (
                            <span style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={14} /> Completed
                            </span>
                          ) : (
                            <span style={{ color: '#d97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={14} /> Pending
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: udStatus === 'COMPLETED' ? '#dcfce7' : udStatus === 'PENDING' ? '#fef9c3' : '#f1f5f9',
                            color: udStatus === 'COMPLETED' ? '#15803d' : udStatus === 'PENDING' ? '#a16207' : '#64748b'
                          }}>
                            {udStatus}
                          </span>
                        </td>
                        <td>
                          {l?.usageDecision ? (
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
                            <span style={{ color: '#888', fontStyle: 'italic' }}>Pending</span>
                          )}
                        </td>
                        <td>
                          <span className={`sap-badge sap-badge-${isCompleted ? 'TECO' : 'CRTD'}`}>
                            {l?.status || 'CREATED'}
                          </span>
                        </td>
                        <td style={{
                          width: '240px',
                          minWidth: '240px',
                          position: 'sticky',
                          right: 0,
                          backgroundColor: isSelectedForRR ? '#eff6ff' : isSelectedForUD ? '#faf5ff' : '#ffffff',
                          zIndex: 2,
                          boxShadow: '-2px 0 5px rgba(0,0,0,0.05)',
                          whiteSpace: 'nowrap'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'max-content', whiteSpace: 'nowrap' }}>
                            {resStatus !== 'COMPLETED' && (
                              <button
                                className="sap-btn sap-btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                                onClick={() => handleOpenResultRecordingDialog(l)}
                              >
                                {isSelectedForRR ? 'Close' : 'Record Results'}
                              </button>
                            )}
                            <button
                              className="sap-btn"
                              style={{
                                backgroundColor: isCompleted ? '#e2e7ec' : resStatus !== 'COMPLETED' ? '#cbd5e1' : '#7048e8',
                                color: isCompleted || resStatus !== 'COMPLETED' ? '#5c6b77' : 'white',
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                minWidth: '90px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                cursor: resStatus !== 'COMPLETED' ? 'not-allowed' : 'pointer'
                              }}
                              disabled={isCompleted || resStatus !== 'COMPLETED'}
                              onClick={() => handleOpenDecisionDialog(l)}
                            >
                              {isCompleted ? 'Closed' : isSelectedForUD ? 'Close UD' : 'Submit UD'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* INLINE EXPANDED ROW FOR RESULT RECORDING */}
                      {isSelectedForRR && (
                        <tr ref={formRef} style={{ backgroundColor: '#eff6ff' }}>
                          <td
                            colSpan={13}
                            style={{
                              padding: '1rem 1.5rem',
                              borderBottom: '2px solid #93c5fd',
                              position: 'sticky',
                              left: 0,
                              width: '100%',
                              boxSizing: 'border-box'
                            }}
                          >
                            <div style={{ maxWidth: 'calc(100vw - 360px)', width: '100%', boxSizing: 'border-box' }}>
                              <div className="sap-card" style={{ border: '2px solid #0a6ed1', boxShadow: '0 4px 12px rgba(10, 110, 209, 0.15)', margin: 0, width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                                <div className="sap-card-header" style={{ backgroundColor: '#dbeafe', borderBottom: '1px solid #bfdbfe' }}>
                                  <div>
                                    <h4 className="sap-card-title" style={{ color: '#1e40af', fontSize: '1rem' }}>
                                      Record Results: Lot {l.lotNumber} ({l.inspectionTypeDesc || 'Inspection'})
                                    </h4>
                                    <p style={{ fontSize: '0.8rem', color: '#1d4ed8', marginTop: '0.2rem', margin: 0 }}>
                                      Order Number: <strong>{l.order?.orderNumber || l.orderNumber || '-'}</strong> • Operation: <strong>{String(l.operationSequence || l.operation?.sequence || (isType03 ? 30 : 40)).padStart(4, '0')}</strong> • Inspection Type: <strong>{l.inspectionType || '03'}</strong> • Stage: <strong>{isType03 ? 'In-Process' : 'Post-Production'}</strong>
                                    </p>
                                  </div>
                                </div>
                                <form onSubmit={handleResultSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#ffffff', width: '100%', boxSizing: 'border-box' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
                                    <div className="sap-form-group" style={{ minWidth: 0 }}>
                                      <label className="sap-label">Lot Target Qty</label>
                                      <div style={{ padding: '0.5rem 0', fontWeight: 600, color: '#1e293b' }}>{parseFloat(l.lotQty || 0).toFixed(0)} PC</div>
                                    </div>

                                    <div className="sap-form-group" style={{ minWidth: 0 }}>
                                      <label className="sap-label">Inspected Quantity (PC) *</label>
                                      <input type="number" className="sap-input" value={inspectedQtyInput} onChange={e => setInspectedQtyInput(e.target.value)} min="1" max={l.lotQty} required style={{ width: '100%', maxWidth: '380px', minWidth: 0, boxSizing: 'border-box' }} />
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '1rem', width: '100%', flexWrap: 'wrap', boxSizing: 'border-box' }}>
                                    <button type="button" className="sap-btn sap-btn-secondary" onClick={() => setSelectedLotForRR(null)} style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>Cancel</button>
                                    <button type="submit" className="sap-btn sap-btn-primary" disabled={recordResultMutation.isPending} style={{ flex: '0 0 auto', whiteSpace: 'nowrap', padding: '6px 18px' }}>
                                      {recordResultMutation.isPending ? 'Recording...' : 'Complete Result Recording'}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* INLINE EXPANDED ROW FOR USAGE DECISION */}
                      {isSelectedForUD && (
                        <tr ref={formRef} style={{ backgroundColor: '#faf5ff' }}>
                          <td
                            colSpan={13}
                            style={{
                              padding: '1rem 1.5rem',
                              borderBottom: '2px solid #c084fc',
                              position: 'sticky',
                              left: 0,
                              width: '100%',
                              boxSizing: 'border-box'
                            }}
                          >
                            <div style={{ maxWidth: 'calc(100vw - 360px)', width: '100%', boxSizing: 'border-box' }}>
                              <div className="sap-card" style={{ border: '2px solid #7048e8', boxShadow: '0 4px 12px rgba(112, 72, 232, 0.15)', margin: 0, width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                                <div className="sap-card-header" style={{ backgroundColor: '#f3e8ff', borderBottom: '1px solid #e9d5ff' }}>
                                  <div>
                                    <h4 className="sap-card-title" style={{ color: '#5b21b6', fontSize: '1rem' }}>
                                      Record Usage Decision (UD): Lot {l.lotNumber}
                                    </h4>
                                    <p style={{ fontSize: '0.8rem', color: '#7e22ce', marginTop: '0.2rem', margin: 0 }}>
                                      Order Number: <strong>{l.order?.orderNumber || l.orderNumber || '-'}</strong> • Operation: <strong>{String(l.operationSequence || l.operation?.sequence || (isType03 ? 30 : 40)).padStart(4, '0')}</strong> • Inspection Type: <strong>{l.inspectionType || '04'}</strong>
                                    </p>
                                  </div>
                                </div>
                                <form onSubmit={handleDecisionSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#ffffff', width: '100%', boxSizing: 'border-box' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
                                    <div className="sap-form-group" style={{ minWidth: 0 }}>
                                      <label className="sap-label">Lot Target Qty</label>
                                      <div style={{ padding: '0.5rem 0', fontWeight: 600, color: '#1e293b' }}>{parseFloat(l.lotQty || 0).toFixed(0)} PC</div>
                                    </div>

                                    <div className="sap-form-group" style={{ minWidth: 0 }}>
                                      <label className="sap-label">Approved Quantity (PC) *</label>
                                      <input type="number" className="sap-input" value={approvedQty} onChange={e => setApprovedQty(e.target.value)} min="0" max={l.lotQty} required style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }} />
                                    </div>

                                    <div className="sap-form-group" style={{ minWidth: 0 }}>
                                      <label className="sap-label">Rejected Quantity (PC) *</label>
                                      <input type="number" className="sap-input" value={rejectedQty} onChange={e => setRejectedQty(e.target.value)} min="0" max={l.lotQty} required style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }} />
                                    </div>

                                    <div className="sap-form-group" style={{ minWidth: 0 }}>
                                      <label className="sap-label">Usage Decision Code *</label>
                                      <select className="sap-input" value={decision} onChange={e => setDecision(e.target.value)} required style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                                        <option value="UDAC">UDAC - Approved (Unrestricted Use)</option>
                                        <option value="UDRJ">UDRJ - Rejected (Blocked/Scrap Stock)</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '1rem', width: '100%', flexWrap: 'wrap', boxSizing: 'border-box' }}>
                                    <button type="button" className="sap-btn sap-btn-secondary" onClick={() => setSelectedLotForUD(null)} style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>Cancel</button>
                                    <button type="submit" className="sap-btn" style={{ backgroundColor: '#7048e8', color: 'white', flex: '0 0 auto', whiteSpace: 'nowrap', padding: '6px 18px' }} disabled={submitDecisionMutation.isPending}>
                                      {submitDecisionMutation.isPending ? 'Submitting...' : 'Submit UD'}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export const QualityInspection: React.FC = () => {
  return (
    <QualityErrorBoundary>
      <QualityInspectionContent />
    </QualityErrorBoundary>
  );
};
