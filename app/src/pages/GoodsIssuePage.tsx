import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Package, Search, CheckCircle, AlertTriangle, XCircle, ArrowLeft, RefreshCw, 
  Layers, FileText, ChevronRight, ChevronDown, Folder
} from 'lucide-react';

export const GoodsIssuePage: React.FC = () => {
  const { id: paramOrderId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Action and Reference Header State
  const [transType, setTransType] = useState<string>('Goods Issue'); // Default A07
  const [refType, setRefType] = useState<string>('Order'); // Default R08
  const [docInputNumber, setDocInputNumber] = useState<string>(''); // Order # / PO # / MatDoc #
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [docYearInput] = useState<string>('2026');

  // Items State
  const [items, setItems] = useState<any[]>([]);
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('Material');
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');

  // UI / Feedback State
  const [validationSuccessMsg, setValidationSuccessMsg] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [postedDocNum, setPostedDocNum] = useState<string>('');
  const [treeExpanded, setTreeExpanded] = useState<{ orders: boolean; purchaseOrders: boolean; matDocs: boolean }>({
    orders: true,
    purchaseOrders: false,
    matDocs: false
  });

  // Action Codes Map
  const actionCodeMap: Record<string, string> = {
    'Goods Issue': 'A07',
    'Goods Receipt': 'A01',
    'Cancellation': 'A03',
    'Display': 'A04'
  };

  // Reference Codes Map
  const refCodeMap: Record<string, string> = {
    'Order': 'R08',
    'Purchase Order': 'R01',
    'Material Document': 'R02',
    'Reservation': 'R09',
    'Other': 'R10'
  };

  const currentActionCode = actionCodeMap[transType] || 'A07';
  const currentRefCode = refCodeMap[refType] || 'R08';

  // Label helper
  const getDocInputLabel = () => {
    if (currentRefCode === 'R01') return 'Purchase Order:';
    if (currentRefCode === 'R02') return 'Material Document:';
    if (currentRefCode === 'R09') return 'Reservation:';
    if (currentRefCode === 'R10') return 'Ref Document:';
    return 'Order Number:';
  };

  // Queries
  const { data: allOrders } = useQuery({
    queryKey: ['giOrdersList'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/ProductionOrders?$expand=material,plant,storageLocation');
      return res.data?.value || [];
    }
  });

  const { data: allPOs } = useQuery({
    queryKey: ['giPOsList'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/PurchaseOrders?$expand=items($expand=material,plant,storageLocation)');
      return res.data?.value || [];
    }
  });

  const { data: allMovements, refetch: refetchMovements } = useQuery({
    queryKey: ['giMovementsList'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/GoodsMovements?$expand=order,purchaseOrder,material,plant,storageLocation');
      return res.data?.value || [];
    }
  });

  const { data: allStorageLocations } = useQuery({
    queryKey: ['giStorageLocationsList'],
    queryFn: async () => {
      const res = await api.get('/odata/v4/production/StorageLocations?$expand=plant');
      return res.data?.value || [];
    }
  });

  // Controlled Document Number State (activeDocNumber updates on Blur, Enter, or Selection)
  const [rawDocInput, setRawDocInput] = useState<string>('');
  const [activeDocNumber, setActiveDocNumber] = useState<string>('');

  // Handle URL param initialization
  useEffect(() => {
    if (paramOrderId && allOrders) {
      const target = allOrders.find((o: any) => o.ID === paramOrderId || o.orderNumber === paramOrderId);
      if (target) {
        setTransType('Goods Issue');
        setRefType('Order');
        setRawDocInput(target.orderNumber);
        setActiveDocNumber(target.orderNumber);
      }
    }
  }, [paramOrderId, allOrders]);

  // Reset document state when action or reference changes
  const handleActionChange = (newAction: string) => {
    setTransType(newAction);
    setRawDocInput('');
    setActiveDocNumber('');
    setItems([]);
    setValidationSuccessMsg('');
    setValidationErrors([]);
    setPostedDocNum('');
  };

  const handleRefChange = (newRef: string) => {
    setRefType(newRef);
    setRawDocInput('');
    setActiveDocNumber('');
    setItems([]);
    setValidationSuccessMsg('');
    setValidationErrors([]);
    setPostedDocNum('');
  };

  const triggerDocumentLookup = (val?: string) => {
    const target = val !== undefined ? val : rawDocInput;
    const clean = target.trim();
    setActiveDocNumber(clean);
    setValidationErrors([]);
    setValidationSuccessMsg('');
    queryClient.invalidateQueries({ queryKey: ['giCurrentOrderData'] });
    queryClient.invalidateQueries({ queryKey: ['giCurrentPOData'] });
    queryClient.invalidateQueries({ queryKey: ['giCurrentMatDocData'] });
  };

  // Query details when reference is Order (R08)
  const { data: currentOrderData, isLoading: isOrderDataLoading, error: orderQueryError } = useQuery({
    queryKey: ['giCurrentOrderData', activeDocNumber],
    queryFn: async () => {
      if (!activeDocNumber || (currentRefCode !== 'R08' && currentRefCode !== 'R09')) return null;
      const cleanNum = activeDocNumber.trim();
      const paddedNum = cleanNum.padStart(12, '0');
      const unpaddedNum = cleanNum.replace(/^0+/, '');

      // 1. Try local DB exact or unpadded/padded match
      const res = await api.get(`/odata/v4/production/ProductionOrders?$filter=orderNumber eq '${cleanNum}' or orderNumber eq '${unpaddedNum}' or orderNumber eq '${paddedNum}'&$expand=material,plant,storageLocation,components($expand=componentMaterial,storageLocation)`);
      const ords = res.data?.value || [];
      if (ords.length > 0) return ords[0];

      // 2. If not found locally, try SAP S/4HANA Cloud getProductionOrderReference API fallback
      try {
        const sapRes = await api.post('/odata/v4/production/getProductionOrderReference', { orderNumber: unpaddedNum || cleanNum });
        const sapData = sapRes.data?.value || sapRes.data;
        if (sapData && sapData.success) {
          return {
            orderNumber: sapData.orderNumber,
            status: sapData.status || 'REL',
            targetQty: sapData.targetQty,
            plant: { code: sapData.plantCode },
            storageLocation: { code: sapData.storageLocationCode },
            material: { code: sapData.materialCode, description: sapData.materialDescription },
            components: (sapData.components || []).map((c: any) => ({
              ID: c.itemNumber || c.componentMaterialCode,
              requiredQty: c.requiredQty,
              issuedQty: 0,
              unit: c.unit || 'KG',
              status: 'RESV',
              componentMaterial: { code: c.componentMaterialCode, description: c.componentDescription },
              storageLocation: c.storageLocationCode ? { code: c.storageLocationCode } : null
            }))
          };
        }
      } catch (e: any) {
        console.warn(`[GI Order Fetch] SAP cloud fallback lookup for ${cleanNum} returned:`, e?.response?.data || e.message);
      }

      return null;
    },
    enabled: !!activeDocNumber && (currentRefCode === 'R08' || currentRefCode === 'R09')
  });

  // Query details when reference is Purchase Order (R01)
  const { data: currentPOData } = useQuery({
    queryKey: ['giCurrentPOData', activeDocNumber],
    queryFn: async () => {
      if (!activeDocNumber || currentRefCode !== 'R01') return null;
      const res = await api.get(`/odata/v4/production/PurchaseOrders?$filter=poNumber eq '${activeDocNumber}'&$expand=items($expand=material,plant,storageLocation)`);
      const pos = res.data?.value || [];
      return pos.length > 0 ? pos[0] : null;
    },
    enabled: !!activeDocNumber && currentRefCode === 'R01'
  });

  // Query details when reference is Material Document (R02)
  const { data: currentMatDocData } = useQuery({
    queryKey: ['giCurrentMatDocData', activeDocNumber],
    queryFn: async () => {
      if (!activeDocNumber || currentRefCode !== 'R02') return null;
      const res = await api.get(`/odata/v4/production/GoodsMovements?$filter=movementNumber eq '${activeDocNumber}'&$expand=order,purchaseOrder,material,plant,storageLocation`);
      return res.data?.value || [];
    },
    enabled: !!activeDocNumber && currentRefCode === 'R02'
  });

  // Handle URL param initialization
  useEffect(() => {
    if (paramOrderId && allOrders) {
      const target = allOrders.find((o: any) => o.ID === paramOrderId || o.orderNumber === paramOrderId);
      if (target) {
        setTransType('Goods Issue');
        setRefType('Order');
        setDocInputNumber(target.orderNumber);
      }
    }
  }, [paramOrderId, allOrders]);



  // Populate item grid based on Action + Reference + Document
  useEffect(() => {
    if (!activeDocNumber) {
      setItems([]);
      
      return;
    }

    setValidationErrors([]);
    setValidationSuccessMsg('');

    // 1. A07 (Goods Issue) + R08 / R09 (Order / Reservation)
    if (currentActionCode === 'A07' && (currentRefCode === 'R08' || currentRefCode === 'R09')) {
      if (isOrderDataLoading) {
        setItems([]);
        return;
      }

      if (!currentOrderData) {
        setItems([]);
        const formattedDocNum = activeDocNumber.padStart(12, '0');
        setValidationErrors([`Document ${formattedDocNum} not found.`]);
        return;
      }

      if (currentOrderData) {
        const comps = currentOrderData.components || [];
        const selectableComps = comps.filter((c: any) => {
          const reqQty = parseFloat(c.requiredQty) || 0;
          const issQty = parseFloat(c.issuedQty) || 0;
          const remQty = reqQty - issQty;
          return remQty > 0 && c.status !== 'ISSD';
        });

        if (selectableComps.length === 0 && comps.length > 0) {
          setItems([]);
          const formattedDocNum = activeDocNumber.padStart(12, '0');
          setValidationErrors([`Document ${formattedDocNum} does not contain any selectable items`]);

          return;
        }

        if (comps.length === 0) {
          setItems([]);
          setValidationErrors([`No production components are available for order ${activeDocNumber}.`]);

          return;
        }

        const formatted = selectableComps.map((c: any, idx: number) => {
          const matCode = c.componentMaterial?.code || c.componentMaterial_ID || `MAT-${idx + 1}`;
          const matDesc = c.componentMaterial?.description || `Material Component ${matCode}`;
          const matGroup = c.componentMaterial?.materialGroup || 'RAW';
          const reqQty = parseFloat(c.requiredQty) || 0;
          const issQty = parseFloat(c.issuedQty) || 0;
          const remQty = Math.max(0, reqQty - issQty);
          const plantCode = currentOrderData.plant?.code || '1102';

          // SAP-Style Component Issue Storage Location Determination Strategy:
          // Priority 1: Component explicitly assigned storage location
          // Priority 2: Component material master / BOM default storage location if present
          // Priority 3: Plant storage location matching raw material / issue storage location
          // Fallback: Blank string (user manual selection from dynamic plant dropdown)
          let proposedSLoc = c.storageLocation?.code || c.storageLocationCode || c.componentMaterial?.defaultStorageLocation?.code;
          if (!proposedSLoc && allStorageLocations && allStorageLocations.length > 0) {
            const plantSlocs = allStorageLocations.filter((s: any) => !s.plant || s.plant.code === plantCode);
            if (plantSlocs.length > 0) {
              const rawCandidate = plantSlocs.find((s: any) => s.code === 'RAW1' || s.name?.toLowerCase().includes('raw') || s.name?.toLowerCase().includes('issue') || s.name?.toLowerCase().includes('component'));
              proposedSLoc = rawCandidate ? rawCandidate.code : plantSlocs[0].code;
            }
          }

          return {
            line: idx + 1,
            componentId: c.ID,
            materialCode: matCode,
            materialDesc: matDesc,
            materialGroup: matGroup,
            materialNum: matCode,
            ok: true,
            requiredQty: reqQty,
            issuedQty: issQty,
            qtyInEntry: remQty,
            unit: c.unit || 'PC',
            plantCode: plantCode,
            plantDesc: currentOrderData.plant?.name || 'Plant',
            slocCode: proposedSLoc || '',
            slocDesc: 'Storage Location',
            orderNumber: currentOrderData.orderNumber,
            activity: '0010',
            companyCode: '1100',
            batchNumber: 'B001',
            stockType: 'Unrestricted-Use',
            movementType: '261',
            reservationNo: currentOrderData.reservationNumber || '570',
            reservationItem: idx + 1,
            reqDate: todayStr,
            finalIssue: false
          };
        });

        setItems(formatted);
        if (formatted.length > 0) setSelectedItemIdx(0);
      }
    }

    // 2. A01 (Goods Receipt) + R08 (Order)
    else if (currentActionCode === 'A01' && currentRefCode === 'R08') {
      if (currentOrderData) {
        const targetQty = parseFloat(currentOrderData.targetQty) || 0;
        const delivQty = parseFloat(currentOrderData.deliveredQty) || 0;
        const confYield = parseFloat(currentOrderData.confirmedQty) || 0;
        const openGRQty = Math.max(0, (confYield > 0 ? confYield : targetQty) - delivQty);

        const headerMat = currentOrderData.material?.code || 'FINISHED-GOOD';
        const headerDesc = currentOrderData.material?.description || 'Finished Product';

        setItems([{
          line: 1,
          materialCode: headerMat,
          materialDesc: headerDesc,
          materialGroup: currentOrderData.material?.materialGroup || 'FINISHED',
          ok: true,
          qtyInEntry: openGRQty > 0 ? openGRQty : targetQty,
          unit: 'PC',
          plantCode: currentOrderData.plant?.code || '1102',
          slocCode: currentOrderData.storageLocation?.code || 'FG01',
          slocDesc: currentOrderData.storageLocation?.name || 'Finished Goods SLoc',
          orderNumber: currentOrderData.orderNumber,
          movementType: '101',
          stockType: 'Unrestricted-Use',
          batchNumber: currentOrderData.batchNumber || 'B001'
        }]);
        setSelectedItemIdx(0);
      }
    }

    // 3. A01 (Goods Receipt) + R01 (Purchase Order)
    else if (currentActionCode === 'A01' && currentRefCode === 'R01') {
      if (currentPOData && currentPOData.items) {
        const selectableItems = currentPOData.items.filter((i: any) => {
          const ord = parseFloat(i.orderedQty) || 0;
          const rec = parseFloat(i.receivedQty) || 0;
          return (ord - rec) > 0 && !i.isDeliveryCompleted;
        });

        if (selectableItems.length === 0) {
          setItems([]);
          setValidationErrors([`Purchase Order ${currentPOData.poNumber} does not contain any open items.`]);
          return;
        }

        const formatted = selectableItems.map((p: any, idx: number) => {
          const ord = parseFloat(p.orderedQty) || 0;
          const rec = parseFloat(p.receivedQty) || 0;
          const rem = Math.max(0, ord - rec);

          return {
            line: idx + 1,
            poItemId: p.ID,
            poNumber: currentPOData.poNumber,
            poItemNo: p.itemNumber || (idx + 1) * 10,
            materialCode: p.material?.code || `MAT-PO-${idx + 1}`,
            materialDesc: p.material?.description || 'Purchased Material',
            ok: true,
            qtyInEntry: rem,
            unit: p.unit || 'PC',
            plantCode: p.plant?.code || '1102',
            slocCode: p.storageLocation?.code || 'RAW1',
            slocDesc: p.storageLocation?.name || 'Raw Material SLoc',
            movementType: '101',
            stockType: 'Unrestricted-Use',
            batchNumber: 'B001'
          };
        });

        setItems(formatted);
        if (formatted.length > 0) setSelectedItemIdx(0);
      }
    }

    // 4. A03 (Cancellation) + R02 (Material Document)
    else if (currentActionCode === 'A03' && currentRefCode === 'R02') {
      if (currentMatDocData && currentMatDocData.length > 0) {
        const formatted = currentMatDocData.map((m: any, idx: number) => ({
          line: idx + 1,
          matDocId: m.ID,
          materialCode: m.material?.code || 'MAT-DOC',
          materialDesc: m.material?.description || 'Material Document Item',
          ok: true,
          qtyInEntry: m.quantity,
          unit: m.unit || 'PC',
          plantCode: m.plant?.code || '1102',
          slocCode: m.storageLocation?.code || 'RAW1',
          movementType: m.movementType === '101' ? '102' : '262',
          orderNumber: m.order?.orderNumber,
          poNumber: m.purchaseOrder?.poNumber,
          isCancelled: m.isCancelled
        }));

        setItems(formatted);
        if (formatted.length > 0) setSelectedItemIdx(0);

        if (currentMatDocData.some((m: any) => m.isCancelled)) {
          setValidationErrors([`Material Document ${activeDocNumber} is already cancelled.`]);
        }
      }
    }

    // 5. A04 Display Mode
    else if (currentActionCode === 'A04') {
      if (currentMatDocData && currentMatDocData.length > 0) {
        const formatted = currentMatDocData.map((m: any, idx: number) => ({
          line: idx + 1,
          materialCode: m.material?.code || 'MAT-DOC',
          materialDesc: m.material?.description || 'Material Item',
          ok: true,
          qtyInEntry: m.quantity,
          unit: m.unit || 'PC',
          plantCode: m.plant?.code || '1102',
          slocCode: m.storageLocation?.code || 'RAW1',
          movementType: m.movementType,
          postingDate: m.postingDate,
          headerText: m.headerText
        }));
        setItems(formatted);
        if (formatted.length > 0) setSelectedItemIdx(0);
      }
    }

    // 6. RefType R10 Other (Manual Line Creation)
    else if (currentRefCode === 'R10') {
      setItems([{
        line: 1,
        materialCode: '100036',
        materialDesc: 'Manual Component Item',
        ok: true,
        qtyInEntry: 1,
        unit: 'PC',
        plantCode: '1102',
        slocCode: 'RAW1',
        stockType: 'Unrestricted-Use',
        movementType: currentActionCode === 'A01' ? '101' : '261',
        batchNumber: 'B001'
      }]);
      setSelectedItemIdx(0);
    }

  }, [currentActionCode, currentRefCode, activeDocNumber, currentOrderData, currentPOData, currentMatDocData, allStorageLocations]);

  // Mutations for Check and Post
  const checkMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/odata/v4/production/checkGoodsMovement', payload, { timeout: 10000 });
      return res.data;
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setValidationSuccessMsg(data.message || 'Document is OK.');
        setValidationErrors([]);
      } else {
        setValidationSuccessMsg('');
        setValidationErrors(data.errors && data.errors.length > 0 ? data.errors : [data.message || 'Check failed']);
      }
    },
    onError: (err: any) => {
      setValidationSuccessMsg('');
      setValidationErrors([err.response?.data?.error?.message || err.message || 'Check failed']);
    }
  });

  const postMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/odata/v4/production/postGoodsMovement', payload, { timeout: 15000 });
      return res.data;
    },
    onSuccess: (data: any) => {
      if (data.success || data.docNum) {
        const doc = data.docNum || '4900001330';
        setPostedDocNum(doc);
        setValidationSuccessMsg(data.message || `Material document ${doc} posted`);
        setValidationErrors([]);
        queryClient.invalidateQueries({ queryKey: ['giMovementsList'] });
        queryClient.invalidateQueries({ queryKey: ['giCurrentOrderData'] });
        queryClient.invalidateQueries({ queryKey: ['giCurrentPOData'] });
        queryClient.invalidateQueries({ queryKey: ['giCurrentMatDocData'] });
        queryClient.invalidateQueries({ queryKey: ['giOrdersList'] });
        queryClient.invalidateQueries({ queryKey: ['orderDetail'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['productionOrders'] });
        queryClient.invalidateQueries({ queryKey: ['statusChanges'] });
        refetchMovements();
      } else {
        setValidationErrors(data.errors && data.errors.length > 0 ? data.errors : [data.message || 'Posting failed']);
      }
    },
    onError: (err: any) => {
      setValidationErrors([err.response?.data?.error?.message || err.message || 'Posting failed']);
    }
  });

  const buildPayload = () => {
    if (currentActionCode === 'A04') {
      return { error: 'Display mode is READ-ONLY. Posting/Checking is disabled.' };
    }

    if (!activeDocNumber.trim() && currentRefCode !== 'R10') {
      return { error: `Please enter a valid ${getDocInputLabel().replace(':', '')}.` };
    }

    if (items.length === 0) {
      return { error: `Document ${activeDocNumber || ''} does not contain any selectable items.` };
    }

    const selectedOkItems = items.filter(i => i.ok);
    if (selectedOkItems.length === 0) {
      return { error: 'At least one item must be marked as OK before posting/checking.' };
    }

    const missingSlocItem = selectedOkItems.find(i => !i.slocCode || !i.slocCode.trim());
    if (missingSlocItem) {
      return { error: `Storage location is required for material ${missingSlocItem.materialCode}.` };
    }

    return {
      payload: {
        actionType: currentActionCode,
        refType: currentRefCode,
        docNumber: activeDocNumber,
        docYear: docYearInput,
        items: selectedOkItems.map(i => ({
          line: i.line,
          componentId: i.componentId,
          poItemId: i.poItemId,
          materialCode: i.materialCode,
          plantCode: i.plantCode,
          slocCode: i.slocCode,
          quantity: parseFloat(i.qtyInEntry || '0'),
          unit: i.unit,
          batchNumber: i.batchNumber,
          stockType: i.stockType,
          movementType: i.movementType,
          finalIssue: i.finalIssue
        }))
      }
    };
  };

  const handleCheck = () => {
    const res = buildPayload();
    if (res.error) {
      setValidationSuccessMsg('');
      setValidationErrors([res.error]);
      return;
    }
    checkMutation.mutate(res.payload);
  };

  const handlePost = () => {
    const res = buildPayload();
    if (res.error) {
      setValidationSuccessMsg('');
      setValidationErrors([res.error]);
      return;
    }
    postMutation.mutate(res.payload);
  };

  const filteredItems = items.filter(i => {
    if (!itemSearchQuery) return true;
    const q = itemSearchQuery.toLowerCase();
    return (
      (i.materialCode || '').toLowerCase().includes(q) ||
      (i.materialDesc || '').toLowerCase().includes(q) ||
      (i.slocCode || '').toLowerCase().includes(q)
    );
  });

  const selectedItem = items[selectedItemIdx] || null;

  return (
    <div style={{ padding: '1rem', fontFamily: 'var(--font-sans)', color: '#333', backgroundColor: '#f4f6f9', minHeight: 'calc(100vh - 48px)' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', backgroundColor: '#fff', padding: '0.75rem 1.25rem', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => navigate('/orders')} 
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0a6ed1', display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0a6ed1' }}>
              Goods Movement — {transType} ({currentActionCode})
            </h1>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              SAP S/4HANA Public Cloud Execution • Action: {transType} | Reference: {refType}
            </div>
          </div>
        </div>
      </div>

      {/* Validation Messages Bar */}
      {validationSuccessMsg && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: '#e6f4ea', border: '1px solid #b7e1cd', borderRadius: '4px', color: '#137333', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} />
          <span><strong>OK:</strong> {validationSuccessMsg}</span>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: '#fce8e6', border: '1px solid #f5c2c7', borderRadius: '4px', color: '#c5221f', fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={16} />
            Error Details ({validationErrors.length})
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Grid: Left Navigation Tree + Right Form Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1rem' }}>
        
        {/* Left Side Tree View Navigation */}
        <div className="sap-card" style={{ padding: '0.75rem', backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '0.82rem' }}>
          <div style={{ fontWeight: 700, color: '#0a6ed1', marginBottom: '0.75rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
            Reference Selection Tree
          </div>

          {/* Tree Section: Purchase Orders */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#333' }}
              onClick={() => setTreeExpanded({ ...treeExpanded, purchaseOrders: !treeExpanded.purchaseOrders })}
            >
              {treeExpanded.purchaseOrders ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={14} color="#0a6ed1" />
              <span>Purchase Orders</span>
            </div>
            {treeExpanded.purchaseOrders && (
              <div style={{ marginLeft: '1.25rem', marginTop: '2px' }}>
                {allPOs?.map((po: any) => (
                  <div 
                    key={po.ID}
                    onClick={() => {
                      setRefType('Purchase Order');
                      setDocInputNumber(po.poNumber);
                    }}
                    style={{ 
                      padding: '2px 6px', 
                      cursor: 'pointer',
                      borderRadius: '2px',
                      backgroundColor: (currentRefCode === 'R01' && activeDocNumber === po.poNumber) ? '#e5f0fa' : 'transparent',
                      color: (currentRefCode === 'R01' && activeDocNumber === po.poNumber) ? '#0a6ed1' : '#444',
                      fontWeight: (currentRefCode === 'R01' && activeDocNumber === po.poNumber) ? 600 : 'normal'
                    }}
                  >
                    {po.poNumber} ({po.supplier || 'Vendor'})
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tree Section: Orders */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#333' }}
              onClick={() => setTreeExpanded({ ...treeExpanded, orders: !treeExpanded.orders })}
            >
              {treeExpanded.orders ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={14} color="#0a6ed1" />
              <span>Production Orders</span>
            </div>
            {treeExpanded.orders && (
              <div style={{ marginLeft: '1.25rem', marginTop: '2px' }}>
                {allOrders?.map((ord: any) => (
                  <div 
                    key={ord.ID}
                    onClick={() => {
                      setRefType('Order');
                      setRawDocInput(ord.orderNumber);
                      triggerDocumentLookup(ord.orderNumber);
                    }}
                    style={{ 
                      padding: '2px 6px', 
                      cursor: 'pointer',
                      borderRadius: '2px',
                      backgroundColor: (currentRefCode === 'R08' && activeDocNumber === ord.orderNumber) ? '#e5f0fa' : 'transparent',
                      color: (currentRefCode === 'R08' && activeDocNumber === ord.orderNumber) ? '#0a6ed1' : '#444',
                      fontWeight: (currentRefCode === 'R08' && activeDocNumber === ord.orderNumber) ? 600 : 'normal'
                    }}
                  >
                    {ord.orderNumber} [{ord.status}]
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tree Section: Material Documents */}
          <div>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#333' }}
              onClick={() => setTreeExpanded({ ...treeExpanded, matDocs: !treeExpanded.matDocs })}
            >
              {treeExpanded.matDocs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={14} color="#0a6ed1" />
              <span>Material Documents</span>
            </div>
            {treeExpanded.matDocs && (
              <div style={{ marginLeft: '1.25rem', marginTop: '2px', maxHeight: '160px', overflowY: 'auto' }}>
                {allMovements?.map((mvt: any) => (
                  <div 
                    key={mvt.ID}
                    onClick={() => {
                      setRefType('Material Document');
                      setDocInputNumber(mvt.movementNumber);
                    }}
                    style={{ 
                      padding: '2px 6px', 
                      cursor: 'pointer',
                      borderRadius: '2px',
                      backgroundColor: (currentRefCode === 'R02' && activeDocNumber === mvt.movementNumber) ? '#e5f0fa' : 'transparent',
                      color: (currentRefCode === 'R02' && activeDocNumber === mvt.movementNumber) ? '#0a6ed1' : '#444',
                      fontWeight: (currentRefCode === 'R02' && activeDocNumber === mvt.movementNumber) ? 600 : 'normal'
                    }}
                  >
                    {mvt.movementNumber} ({mvt.movementType})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side Header & Line Items Panel */}
        <div>
          {/* Header Controls Card */}
          <div className="sap-card" style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.82rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '2px' }}>Action</label>
                <select className="sap-input" value={transType} onChange={e => handleActionChange(e.target.value)} style={{ width: '100%', padding: '4px' }}>
                  <option value="Goods Issue">A07 Goods Issue</option>
                  <option value="Goods Receipt">A01 Goods Receipt</option>
                  <option value="Cancellation">A03 Cancellation</option>
                  <option value="Display">A04 Display</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '2px' }}>Reference</label>
                <select className="sap-input" value={refType} onChange={e => handleRefChange(e.target.value)} style={{ width: '100%', padding: '4px' }}>
                  <option value="Order">R08 Order</option>
                  <option value="Purchase Order">R01 Purchase Order</option>
                  <option value="Material Document">R02 Material Document</option>
                  <option value="Reservation">R09 Reservation</option>
                  <option value="Other">R10 Other</option>
                </select>
              </div>

              {currentRefCode !== 'R10' && (
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '2px' }}>{getDocInputLabel()} *</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input 
                      type="text" 
                      className="sap-input" 
                      value={rawDocInput} 
                      onChange={e => setRawDocInput(e.target.value)}
                      onBlur={e => triggerDocumentLookup(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          triggerDocumentLookup(rawDocInput);
                        }
                      }}
                      placeholder="Enter doc # & press Enter" 
                      style={{ width: '100%', padding: '4px', fontWeight: 600, color: '#0a6ed1' }} 
                    />
                    <button
                      onClick={() => triggerDocumentLookup(rawDocInput)}
                      className="sap-btn sap-btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    >
                      Propose
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Item Grid Controls & Table */}
          <div className="sap-card" style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0a6ed1' }}>
                Goods Movement Line Items ({items.length} items loaded)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={14} color="#666" />
                <input 
                  type="text" 
                  placeholder="Search items..." 
                  value={itemSearchQuery} 
                  onChange={e => setItemSearchQuery(e.target.value)}
                  style={{ padding: '2px 6px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '3px' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '220px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f2f4f7', borderBottom: '1px solid #d9d9d9', color: '#555' }}>
                    <th style={{ padding: '6px 8px' }}>Line</th>
                    <th style={{ padding: '6px 8px' }}>OK</th>
                    <th style={{ padding: '6px 8px' }}>Material</th>
                    <th style={{ padding: '6px 8px' }}>Material Short Text</th>
                    <th style={{ padding: '6px 8px' }}>Qty in Entry</th>
                    <th style={{ padding: '6px 8px' }}>Unit</th>
                    <th style={{ padding: '6px 8px' }}>Plant</th>
                    <th style={{ padding: '6px 8px' }}>SLoc</th>
                    <th style={{ padding: '6px 8px' }}>Reference Doc</th>
                    <th style={{ padding: '6px 8px' }}>Mvt Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>
                        No line items loaded. Enter a valid {getDocInputLabel().replace(':', '')} to proposal.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr 
                        key={idx}
                        onClick={() => setSelectedItemIdx(idx)}
                        style={{ 
                          borderBottom: '1px solid #eee', 
                          backgroundColor: selectedItemIdx === idx ? '#e8f4fd' : (item.isCancelled ? '#fef2f2' : 'transparent'),
                          cursor: 'pointer'
                        }}
                      >
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>{item.line || idx + 1}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <input 
                            type="checkbox" 
                            checked={item.ok} 
                            disabled={currentActionCode === 'A04'}
                            onChange={e => {
                              const copy = [...items];
                              copy[idx].ok = e.target.checked;
                              setItems(copy);
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0a6ed1' }}>{item.materialCode}</td>
                        <td style={{ padding: '6px 8px' }}>{item.materialDesc}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <input 
                            type="number"
                            step="any"
                            value={item.qtyInEntry}
                            disabled={currentActionCode === 'A04' || currentActionCode === 'A03'}
                            onChange={e => {
                              const copy = [...items];
                              copy[idx].qtyInEntry = e.target.value;
                              setItems(copy);
                            }}
                            style={{ width: '80px', padding: '2px 4px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '3px' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>{item.unit}</td>
                        <td style={{ padding: '6px 8px' }}>{item.plantCode}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <select
                            value={item.slocCode}
                            disabled={currentActionCode === 'A04' || currentActionCode === 'A03'}
                            onChange={e => {
                              const copy = [...items];
                              copy[idx].slocCode = e.target.value;
                              setItems(copy);
                            }}
                            style={{ padding: '2px 4px', fontSize: '0.8rem', border: '1px solid #ccc', borderRadius: '3px', backgroundColor: '#fff' }}
                          >
                            {(allStorageLocations && allStorageLocations.length > 0
                              ? allStorageLocations.filter((s: any) => !s.plant || s.plant.code === item.plantCode)
                              : [{ code: item.slocCode || 'RAW1', name: 'Raw Materials' }, { code: 'SFG1', name: 'Semi-Finished' }, { code: 'SL01', name: 'Raw Material Storage' }, { code: 'SL02', name: 'Finished Stage' }]
                            ).map((s: any) => (
                              <option key={s.code || s.ID} value={s.code}>{s.code} {s.name ? `- ${s.name}` : ''}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px' }}>{item.orderNumber || item.poNumber || activeDocNumber}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                          {item.movementType || '261'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Item Details Tabs */}
          {selectedItem && (
            <div className="sap-card" style={{ padding: '1rem', backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
              <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #d9d9d9', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {['Material', 'Quantity', 'Where', 'Account Assignment'].map(tab => (
                  <div 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{ 
                      padding: '6px 12px', 
                      cursor: 'pointer',
                      borderBottom: activeTab === tab ? '2px solid #0a6ed1' : 'none',
                      color: activeTab === tab ? '#0a6ed1' : '#555',
                      fontWeight: activeTab === tab ? 700 : 500
                    }}
                  >
                    {tab}
                  </div>
                ))}
              </div>

              {/* Tab Content 1: Material */}
              {activeTab === 'Material' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Material Number</label>
                    <input type="text" className="sap-input" value={selectedItem.materialCode} readOnly style={{ width: '100%', backgroundColor: '#f5f5f5' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Material Short Text</label>
                    <input type="text" className="sap-input" value={selectedItem.materialDesc} readOnly style={{ width: '100%', backgroundColor: '#f5f5f5' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Material Group</label>
                    <input type="text" className="sap-input" value={selectedItem.materialGroup || 'RAW'} readOnly style={{ width: '100%', backgroundColor: '#f5f5f5' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Batch</label>
                    <input 
                      type="text" 
                      className="sap-input" 
                      value={selectedItem.batchNumber || 'B001'} 
                      disabled={currentActionCode === 'A04'}
                      onChange={e => {
                        const copy = [...items];
                        copy[selectedItemIdx].batchNumber = e.target.value;
                        setItems(copy);
                      }}
                      style={{ width: '100%' }} 
                    />
                  </div>
                </div>
              )}

              {/* Tab Content 2: Quantity */}
              {activeTab === 'Quantity' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Qty in Unit of Entry</label>
                    <input 
                      type="number" 
                      className="sap-input" 
                      value={selectedItem.qtyInEntry} 
                      disabled={currentActionCode === 'A04' || currentActionCode === 'A03'}
                      onChange={e => {
                        const copy = [...items];
                        copy[selectedItemIdx].qtyInEntry = e.target.value;
                        setItems(copy);
                      }}
                      style={{ width: '100%' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Unit of Entry</label>
                    <input type="text" className="sap-input" value={selectedItem.unit} readOnly style={{ width: '100%', backgroundColor: '#f5f5f5' }} />
                  </div>
                  {selectedItem.requiredQty !== undefined && (
                    <div>
                      <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Total Target / Ordered Qty</label>
                      <input type="text" className="sap-input" value={`${selectedItem.requiredQty} ${selectedItem.unit}`} readOnly style={{ width: '100%', backgroundColor: '#f5f5f5' }} />
                    </div>
                  )}
                  {selectedItem.issuedQty !== undefined && (
                    <div>
                      <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Already Issued / Received</label>
                      <input type="text" className="sap-input" value={`${selectedItem.issuedQty} ${selectedItem.unit}`} readOnly style={{ width: '100%', backgroundColor: '#f5f5f5' }} />
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content 3: Where */}
              {activeTab === 'Where' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Movement Type</label>
                    <input type="text" className="sap-input" value={`${selectedItem.movementType || '261'}`} readOnly style={{ width: '100%', backgroundColor: '#f5f5f5' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Plant</label>
                    <input type="text" className="sap-input" value={`${selectedItem.plantCode || '1102'}`} readOnly style={{ width: '100%', backgroundColor: '#f5f5f5' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Storage Location</label>
                    <select
                      className="sap-input"
                      value={selectedItem.slocCode}
                      disabled={currentActionCode === 'A04' || currentActionCode === 'A03'}
                      onChange={e => {
                        const copy = [...items];
                        copy[selectedItemIdx].slocCode = e.target.value;
                        setItems(copy);
                      }}
                      style={{ width: '100%', padding: '4px' }}
                    >
                      {(allStorageLocations && allStorageLocations.length > 0
                        ? allStorageLocations.filter((s: any) => !s.plant || s.plant.code === selectedItem.plantCode)
                        : [{ code: selectedItem.slocCode || 'RAW1', name: 'Raw Materials' }, { code: 'SFG1', name: 'Semi-Finished' }, { code: 'SL01', name: 'Raw Material Storage' }, { code: 'SL02', name: 'Finished Stage' }]
                      ).map((s: any) => (
                        <option key={s.code || s.ID} value={s.code}>{s.code} {s.name ? `- ${s.name}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Stock Type</label>
                    <input type="text" className="sap-input" value={selectedItem.stockType || 'Unrestricted-Use'} readOnly style={{ width: '100%', backgroundColor: '#f5f5f5' }} />
                  </div>
                </div>
              )}

              {/* Tab Content 4: Account Assignment */}
              {activeTab === 'Account Assignment' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Order / PO Reference</label>
                    <input type="text" className="sap-input" value={selectedItem.orderNumber || selectedItem.poNumber || activeDocNumber} readOnly style={{ width: '100%', backgroundColor: '#f5f5f5' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Company Code</label>
                    <input type="text" className="sap-input" value={selectedItem.companyCode || '1100'} readOnly style={{ width: '100%', backgroundColor: '#f5f5f5' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontWeight: 600 }}>Reservation Item</label>
                    <input type="text" className="sap-input" value={`${selectedItem.reservationNo || '570'} / ${selectedItem.reservationItem || selectedItem.line}`} readOnly style={{ width: '100%', backgroundColor: '#f5f5f5' }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Padding space so fixed footer never obscures content */}
      <div style={{ height: '60px' }} />

      {/* SAP S/4HANA Public Cloud Bottom Action Bar: [ Cancel ] [ Check ] [ POST ] */}
      <div 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          backgroundColor: '#fff', 
          borderTop: '1px solid #d9d9d9', 
          padding: '0.6rem 1.5rem', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          gap: '0.6rem', 
          boxShadow: '0 -2px 8px rgba(0,0,0,0.08)', 
          zIndex: 100 
        }}
      >
        <button 
          onClick={() => navigate('/orders')} 
          className="sap-btn sap-btn-secondary"
          style={{ padding: '6px 18px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#333' }}
        >
          Cancel
        </button>
        <button 
          onClick={handleCheck} 
          disabled={checkMutation.isPending || currentActionCode === 'A04'}
          className="sap-btn sap-btn-secondary"
          style={{ padding: '6px 18px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #0a6ed1', backgroundColor: '#fff', color: '#0a6ed1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <CheckCircle size={15} color="#0a6ed1" />
          Check
        </button>
        <button 
          onClick={handlePost} 
          disabled={postMutation.isPending || currentActionCode === 'A04'}
          className="sap-btn sap-btn-primary"
          style={{ padding: '6px 20px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '4px', border: 'none', backgroundColor: '#0a6ed1', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <FileText size={15} />
          POST
        </button>
      </div>
    </div>
  );
};
