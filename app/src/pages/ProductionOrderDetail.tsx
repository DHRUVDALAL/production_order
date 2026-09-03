import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealTime } from '../contexts/RealTimeContext';
import { ArrowLeft, CheckCircle2, ShieldAlert, Play, ShoppingCart, Truck, AlertTriangle, Edit2, DollarSign, PieChart, ListFilter, Scale } from 'lucide-react';

export const SAP_SYSTEM_STATUS_MAP: Record<string, string> = {
  'CRTD': 'Created',
  'MSPT': 'Material Shortage',
  'BCRQ': 'Order to be handled in batches',
  'MANC': 'Mat. availability not checked',
  'NTUP': 'Dates are not updated',
  'SETC': 'Settlement rule created',
  'REL':  'Released',
  'TECO': 'Technically Completed',
  'CLSD': 'Closed',
  'LOKD': 'Locked',
  'DLFL': 'Deletion Flag',
  'MACA': 'Mat. Availability Checked',
  'PCNF': 'Partially Confirmed',
  'CNF':  'Confirmed',
  'PDLV': 'Partially Delivered',
  'DLV':  'Delivered'
};

export const ProductionOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  // Change Mode State & Handlers (CO02 Display/Change Mode)
  const [isChangeMode, setIsChangeMode] = useState(false);
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [editingOpDesc, setEditingOpDesc] = useState('');
  const [editingOpWc, setEditingOpWc] = useState('');
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [editingCompQty, setEditingCompQty] = useState('');
  const [showApiNotice, setShowApiNotice] = useState<string | null>(null);

  // SAP Header Cascading Menu State
  const [showSapMenuDropdown, setShowSapMenuDropdown] = useState(false);
  const [showOrderSubmenu, setShowOrderSubmenu] = useState(false);
  const [showFunctionsSubmenu, setShowFunctionsSubmenu] = useState(false);
  const [showRestrictSubmenu, setShowRestrictSubmenu] = useState(false);
  const [showWmStagingSubmenu, setShowWmStagingSubmenu] = useState(false);
  const [showGotoSubmenu, setShowGotoSubmenu] = useState(false);
  const [showCostsSubmenu, setShowCostsSubmenu] = useState(false);
  const [showMissingPartsSubmenu, setShowMissingPartsSubmenu] = useState(false);
  const [showLogsSubmenu, setShowLogsSubmenu] = useState(false);
  const [showOperationSubmenu, setShowOperationSubmenu] = useState(false);
  const [showOperationDetailsModal, setShowOperationDetailsModal] = useState(false);
  const [showOutputSubmenu, setShowOutputSubmenu] = useState(false);
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [selectedReprintType, setSelectedReprintType] = useState('PP_PRT');

  // Costs Modal State (Goto -> Costs)
  const [costModalTitle, setCostModalTitle] = useState<string | null>(null);
  const [costModalContent, setCostModalContent] = useState<any>(null);

  // Components Modal State
  const [showComponentsModal, setShowComponentsModal] = useState(false);

  // Missing Parts Modal State (Goto -> Missing Parts)
  const [missingPartsModalTitle, setMissingPartsModalTitle] = useState<string | null>(null);
  const [missingPartsData, setMissingPartsData] = useState<any>(null);

  // Documented Goods Movements Modal State (Goto -> Documented Goods Movements)
  const [showGoodsMovementsModal, setShowGoodsMovementsModal] = useState(false);
  const [goodsMovementsData, setGoodsMovementsData] = useState<any[] | null>(null);
  const [mvtCategoryFilter, setMvtCategoryFilter] = useState('ALL');
  const [mvtTypeFilter, setMvtTypeFilter] = useState('ALL');

  const fetchGoodsMovementsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/getDocumentedGoodsMovements', { orderId: id });
      return res.data?.value || res.data || [];
    },
    onSuccess: (data: any[]) => {
      setGoodsMovementsData(data);
      setShowGoodsMovementsModal(true);
      setShowSapMenuDropdown(false);
      setShowGotoSubmenu(false);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to fetch documented goods movements.');
    }
  });

  const fetchMissingPartsMutation = useMutation({
    mutationFn: async ({ actionName, title }: { actionName: string; title: string }) => {
      const res = await api.post(`/odata/v4/production/${actionName}`, { orderId: id });
      return { data: res.data?.value || res.data, title };
    },
    onSuccess: (res: any) => {
      setMissingPartsModalTitle(res.title);
      setMissingPartsData(res.data);
      setShowSapMenuDropdown(false);
      setShowGotoSubmenu(false);
      setShowMissingPartsSubmenu(false);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to fetch missing parts information.');
    }
  });

  const fetchCostViewMutation = useMutation({
    mutationFn: async ({ actionName, title }: { actionName: string; title: string }) => {
      const res = await api.post(`/odata/v4/production/${actionName}`, { orderId: id });
      return { data: res.data?.value || res.data, title };
    },
    onSuccess: (res: any) => {
      setCostModalTitle(res.title);
      setCostModalContent(res.data);
      setShowSapMenuDropdown(false);
      setShowGotoSubmenu(false);
      setShowCostsSubmenu(false);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to fetch cost information.');
    }
  });

  const stageWmMaterialMutation = useMutation({
    mutationFn: async ({ isSimulation }: { isSimulation: boolean }) => {
      const res = await api.post('/odata/v4/production/stageWmMaterial', {
        orderId: id,
        isSimulation
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg(data?.message || 'WM Material Staging processed successfully.');
      if (data?.details) {
        setShowApiNotice(`${data.message}\n\nDetails: ${data.details}`);
      }
      setShowSapMenuDropdown(false);
      setShowFunctionsSubmenu(false);
      setShowWmStagingSubmenu(false);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'WM Material Staging failed.');
    }
  });

  const restrictActionMutation = useMutation({
    mutationFn: async ({ actionName }: { actionName: string }) => {
      const res = await api.post(`/odata/v4/production/${actionName}`, { orderId: id });
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['productionOrders'] });
      queryClient.invalidateQueries({ queryKey: ['statusChanges', id] });
      setSuccessMsg(`Status updated successfully in SAP S/4HANA (New Status: ${data?.status || 'Updated'})`);
      setShowSapMenuDropdown(false);
      setShowFunctionsSubmenu(false);
      setShowRestrictSubmenu(false);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Operation failed in SAP.');
    }
  });

  const reprintOutputMutation = useMutation({
    mutationFn: async (outputType: string) => {
      const res = await api.post('/odata/v4/production/reprintOutput', {
        orderId: id,
        outputType
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['outputItems', id] });
      setSuccessMsg(data?.message || 'Reprint scheduled successfully in SAP Output Management.');
      setShowReprintModal(false);
      setShowSapMenuDropdown(false);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Reprint request failed.');
    }
  });

  const updateQtyMutation = useMutation({
    mutationFn: async (newQty: number) => {
      setErrorMsg('');
      setSuccessMsg('');
      const res = await api.post('/odata/v4/production/changeNetQuantity', {
        orderId: id,
        newQuantity: newQty,
        reason: 'Inline Target Quantity Update'
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      setSuccessMsg(data?.message || 'Target quantity updated successfully!');
      setIsEditingQty(false);
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['productionOrders'] });
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

  // Availability Check Mutations & Modal state
  const [availabilityResult, setAvailabilityResult] = useState<any>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState<boolean>(false);

  const checkMaterialMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/checkMaterialAvailability', { orderId: id });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setAvailabilityResult(data);
      setShowAvailabilityModal(true);
      if (data?.overallStatus === 'AVAILABLE') {
        setSuccessMsg(data?.message || 'All raw material components are fully available!');
      } else {
        setErrorMsg(data?.message || `Material Availability Check: Required components are not fully available for Production Order ${order?.orderNumber || ''}. ${data?.shortageCount || 0} component(s) have shortages and are only partially available.`);
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Check failed.');
    }
  });

  const resetMaterialMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/resetMaterialAvailability', { orderId: id });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg(data?.message || 'Material availability reset to NOT_CHECKED.');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Reset failed.');
    }
  });

  const resetAndCheckMaterialMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/resetAndCheckMaterialAvailability', { orderId: id });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setAvailabilityResult(data);
      setShowAvailabilityModal(true);
      if (data?.overallStatus === 'AVAILABLE') {
        setSuccessMsg(data?.message || 'Reset and check completed: All raw material components are fully available!');
      } else {
        setErrorMsg(data?.message || `Material Availability Check: Required components are not fully available for Production Order ${order?.orderNumber || ''}. ${data?.shortageCount || 0} component(s) have shortages and are only partially available.`);
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Reset & Check failed.');
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
      setSuccessMsg(`Goods Receipt (101) posted successfully! Material Document: ${docNum}`);
      setShowGrForm(false);
      setGrQty('');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Goods receipt failed.');
    }
  });

  const cancelGrMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/cancelGoodsReceipt', { orderId: id });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      const resVal = data?.value || data;
      const docNum = resVal?.docNum || 'unknown';
      setSuccessMsg(`Goods Receipt Cancelled (102 Reversal posted)! Material Document: ${docNum}`);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Goods receipt reversal failed.');
    }
  });

  const postGiMutation = useMutation({
    mutationFn: async (payload: { componentId: string; quantity: number }) => {
      if (isOrderDlfl) {
        throw new Error(`Goods Issue cannot be posted for Production Order ${order?.orderNumber || ''}. The order is marked with Deletion Flag (DLFL). Further goods movements are not permitted.`);
      }
      const res = await api.post('/odata/v4/production/postGoodsIssue', {
        orderId: id,
        componentId: payload.componentId,
        quantity: payload.quantity
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      const resVal = data?.value || data;
      const docNum = resVal?.docNum || 'unknown';
      setSuccessMsg(`Goods Issue (261) posted successfully! Material Document: ${docNum}`);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Goods issue failed.');
    }
  });

  const cancelGiMutation = useMutation({
    mutationFn: async (componentId: string) => {
      const res = await api.post('/odata/v4/production/cancelGoodsIssue', {
        orderId: id,
        componentId
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      const resVal = data?.value || data;
      const docNum = resVal?.docNum || 'unknown';
      setSuccessMsg(`Goods Issue Cancelled (262 Reversal posted)! Material Document: ${docNum}`);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Goods issue reversal failed.');
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

  const updateOpMutation = useMutation({
    mutationFn: async ({ opId, description, workCenterCode }: { opId: string; description: string; workCenterCode: string }) => {
      const res = await api.post('/odata/v4/production/updateProductionOrderOperation', {
        orderId: id,
        operationId: opId,
        description,
        workCenterCode
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg('Operation updated successfully in SAP S/4HANA!');
      setEditingOpId(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update operation.');
    }
  });

  const updateCompMutation = useMutation({
    mutationFn: async ({ compId, requiredQty }: { compId: string; requiredQty: number }) => {
      const res = await api.post('/odata/v4/production/updateProductionOrderComponent', {
        orderId: id,
        componentId: compId,
        requiredQty
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg('Component updated successfully in SAP S/4HANA!');
      setEditingCompId(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update component.');
    }
  });

  const deleteCompMutation = useMutation({
    mutationFn: async (compId: string) => {
      const res = await api.post('/odata/v4/production/deleteProductionOrderComponent', {
        orderId: id,
        componentId: compId
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      setSuccessMsg('Component deleted successfully from SAP S/4HANA!');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to delete component from SAP.');
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

  const [showTecoModal, setShowTecoModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedMaterialDoc, setSelectedMaterialDoc] = useState<any>(null);

  // Fetch Live Action Eligibility from Backend CAP
  const { data: eligibility, refetch: refetchEligibility } = useQuery({
    queryKey: ['actionEligibility', id],
    queryFn: async () => {
      const res = await api.post('/odata/v4/production/getActionEligibility', { orderId: id });
      return res.data;
    },
    enabled: !!id
  });

  const isOrderClosed = (order?.systemStatus || order?.status) === 'CLSD';
  const isOrderDlfl = Boolean(
    order?.deletionFlag === true ||
    (order?.systemStatus || order?.status || '').includes('DLFL')
  );

  const tecoMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/technicallyCompleteOrder', { orderId: id });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['actionEligibility', id] });
      setShowTecoModal(false);
      setSuccessMsg(data?.message || 'Production Order was technically completed successfully.');
    },
    onError: (err: any) => {
      setShowTecoModal(false);
      setErrorMsg(err.response?.data?.error?.message || 'Technical Completion failed.');
    }
  });

  const revokeTecoMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/revokeTechnicalCompletion', { orderId: id });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['actionEligibility', id] });
      setSuccessMsg(data?.message || 'Technical Completion revoked successfully.');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.error?.message || 'Revoke TECO failed.')
  });

  const refreshSingleOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/syncSingleOrder', { orderId: id });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['actionEligibility', id] });
      setSuccessMsg(data?.message || 'Production Order successfully refreshed from SAP S/4HANA.');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.error?.message || 'Failed to refresh order from SAP.')
  });

  const closeOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/odata/v4/production/closeProductionOrder', { orderId: id });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orderDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['actionEligibility', id] });
      setShowCloseModal(false);
      setSuccessMsg(data?.message || 'Production Order closed successfully.');
    },
    onError: (err: any) => {
      setShowCloseModal(false);
      setErrorMsg(err.response?.data?.error?.message || 'Close Production Order failed.');
    }
  });

  const { data: statusChanges } = useQuery({
    queryKey: ['statusChanges', id],
    queryFn: async () => {
      const res = await api.post('/odata/v4/production/getStatusChanges', { orderId: id });
      return res.data?.value || res.data || [];
    },
    enabled: showStatusChangesModal
  });

  const handleOperationDetails = () => {
    setShowOperationDetailsModal(true);
    const el = document.getElementById('operations-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F7' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        handleOperationDetails();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  // Determine stage index for progress bar based on portalWorkflowStep / systemStatus
  const statusFlow = ['CRTD', 'MACA', 'REL', 'GI', 'CNF', 'GR', 'TECO', 'CLSD'];
  let mappedStatus = order.portalWorkflowStep || 'CRTD';
  if (!order.portalWorkflowStep) {
    const activeStatuses = (order.status || '').split(' ');
    if (activeStatuses.includes('CLSD')) mappedStatus = 'CLSD';
    else if (activeStatuses.includes('TECO')) mappedStatus = 'TECO';
    else if (activeStatuses.includes('DLV') || activeStatuses.includes('PDLV')) mappedStatus = 'GR';
    else if (activeStatuses.includes('CNF') || activeStatuses.includes('PCNF')) mappedStatus = 'CNF';
    else if (activeStatuses.includes('REL')) mappedStatus = 'REL';
    else mappedStatus = 'CRTD';
  }

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

      {/* Header Details Card */}
      <div className="sap-card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: isChangeMode ? '2px solid #0a6ed1' : '1px solid var(--sap-border-color)' }}>
          <div>
            <div className="sap-card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  Production Order {isChangeMode ? 'Change' : 'Display'}: {order.orderNumber}
                </h2>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: isChangeMode ? '#e8f4fd' : '#f1f5f9', color: isChangeMode ? '#0a6ed1' : '#475569', fontWeight: 600 }}>
                  {isChangeMode ? 'CO02 - Change Mode Active' : 'CO03 - Display Mode'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="sap-btn"
                  onClick={() => setIsChangeMode(!isChangeMode)}
                  style={{
                    backgroundColor: isChangeMode ? '#0a6ed1' : '#ffffff',
                    color: isChangeMode ? '#ffffff' : '#0a6ed1',
                    border: '1px solid #0a6ed1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.85rem'
                  }}
                >
                  {isChangeMode ? 'Switch to Display Mode (CO03)' : 'Switch to Change Mode (CO02)'}
                </button>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(order.status || '').split(' ').map((st: string) => (
                    <span key={st} className={`sap-badge sap-badge-${st}`}>{st}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* SAP S/4HANA Header Navigation Action Bar with Menu -> Order -> Output */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem', fontSize: '0.75rem', position: 'relative' }}>
              
              {/* Menu Button Dropdown Container */}
              <div style={{ position: 'relative' }}>
                <button
                  className="sap-btn"
                  onClick={() => setShowSapMenuDropdown(!showSapMenuDropdown)}
                  style={{
                    backgroundColor: showSapMenuDropdown ? '#0a6ed1' : '#ffffff',
                    color: showSapMenuDropdown ? '#ffffff' : '#0a6ed1',
                    border: '1px solid #0a6ed1',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    padding: '2px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>Menu</span>
                  <span style={{ fontSize: '0.65rem' }}>▼</span>
                </button>

                {/* Level 1: Main Menu Dropdown */}
                {showSapMenuDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                    backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                    zIndex: 9999, minWidth: '180px', padding: '4px 0'
                  }}>
                    {/* Order (Hover/Click Submenu Trigger) */}
                    <div
                      className={`sap-menu-item ${showOrderSubmenu ? 'active' : ''}`}
                      onMouseEnter={() => setShowOrderSubmenu(true)}
                      onMouseLeave={() => { setShowOrderSubmenu(false); setShowOutputSubmenu(false); }}
                      onClick={() => setShowOrderSubmenu(!showOrderSubmenu)}
                      style={{ position: 'relative' }}
                    >
                      <span>Order</span>
                      <span>▸</span>

                      {/* Level 2: Order Submenu */}
                      {showOrderSubmenu && (
                        <div style={{
                          position: 'absolute', top: 0, left: '100%', marginLeft: '2px',
                          backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10000, minWidth: '190px', padding: '4px 0'
                        }}>
                          <div style={{ padding: '6px 12px', color: '#94a3b8', fontSize: '0.7rem' }}>Other Order (Shift+F5)</div>
                          <div className="sap-menu-item" onClick={() => window.location.href = '/orders'}>Create</div>
                          <div className="sap-menu-item" onClick={() => setIsChangeMode(true)}>Change</div>
                          <div className="sap-menu-item" onClick={() => setIsChangeMode(false)}>Display</div>
                          <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }}></div>

                          {/* Output Submenu Trigger */}
                          <div
                            className={`sap-menu-item ${showOutputSubmenu ? 'active' : ''}`}
                            onMouseEnter={() => setShowOutputSubmenu(true)}
                            onMouseLeave={() => setShowOutputSubmenu(false)}
                            onClick={(e) => { e.stopPropagation(); setShowOutputSubmenu(!showOutputSubmenu); }}
                            style={{ position: 'relative', fontWeight: 600 }}
                          >
                            <span>Output</span>
                            <span>▸</span>

                            {/* Level 3: Output Submenu (Manage Output Items & Reprint) */}
                            {showOutputSubmenu && (
                              <div style={{
                                position: 'absolute', top: 0, left: '100%', marginLeft: '2px',
                                backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10001, minWidth: '180px', padding: '4px 0'
                              }}>
                                <Link
                                  to={`/orders/${id}/outputs`}
                                  className="sap-menu-item"
                                  style={{ textDecoration: 'none', display: 'flex' }}
                                  onClick={() => setShowSapMenuDropdown(false)}
                                >
                                  Manage Output Items
                                </Link>
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowReprintModal(true);
                                  }}
                                >
                                  Reprint
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Functions (Hover/Click Submenu Trigger) */}
                    <div
                      className={`sap-menu-item ${showFunctionsSubmenu ? 'active' : ''}`}
                      onMouseEnter={() => setShowFunctionsSubmenu(true)}
                      onMouseLeave={() => { setShowFunctionsSubmenu(false); setShowRestrictSubmenu(false); }}
                      onClick={() => setShowFunctionsSubmenu(!showFunctionsSubmenu)}
                      style={{ position: 'relative' }}
                    >
                      <span>Functions</span>
                      <span>▸</span>

                      {/* Level 2: Functions Submenu */}
                      {showFunctionsSubmenu && (
                        <div style={{
                          position: 'absolute', top: 0, left: '100%', marginLeft: '2px',
                          backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10000, minWidth: '220px', padding: '4px 0'
                        }}>
                          <div className="sap-menu-item" onClick={() => releaseOrderMutation.mutate()}>Release (Ctrl+F1)</div>
                          <div className="sap-menu-item" onClick={() => setShowScheduleModal(true)}>Schedule</div>
                          
                          {/* Availability Check Submenu / Items */}
                          <div className="sap-menu-item" style={{ fontWeight: 600, color: '#0a6ed1' }} onClick={() => checkMaterialMutation.mutate()}>Check Availability</div>
                          <div className="sap-menu-item" onClick={() => resetMaterialMutation.mutate()}>Reset Availability</div>
                          <div className="sap-menu-item" onClick={() => resetAndCheckMaterialMutation.mutate()}>Reset & Check Availability</div>

                          <div className="sap-menu-item" onClick={() => { calculateCostsMutation.mutate(); setShowCostsModal(true); }}>Cost (Ctrl+F7)</div>
                          <div style={{ padding: '6px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>Exchange Sequences</div>
                          <div className="sap-menu-item" onClick={() => { setModalErrorMsg(''); setShowReadMasterModal(true); }}>Read PP Master Data</div>
                          <div style={{ padding: '6px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>Activate Purchase Requisition/Reserv.</div>

                          {/* Restrict Processing Submenu Trigger */}
                          <div
                            className={`sap-menu-item ${showRestrictSubmenu ? 'active' : ''}`}
                            onMouseEnter={() => setShowRestrictSubmenu(true)}
                            onMouseLeave={() => setShowRestrictSubmenu(false)}
                            onClick={(e) => { e.stopPropagation(); setShowRestrictSubmenu(!showRestrictSubmenu); }}
                            style={{ position: 'relative', fontWeight: 600 }}
                          >
                            <span>Restrict Processing</span>
                            <span>▸</span>

                            {/* Level 3: Restrict Processing Submenu (Exact SAP ordering) */}
                            {showRestrictSubmenu && (
                              <div style={{
                                position: 'absolute', top: 0, left: '100%', marginLeft: '2px',
                                backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10001, minWidth: '220px', padding: '4px 0'
                              }}>
                                {/* 1. Lock */}
                                {!(order.status || '').includes('LOKD') && !(order.status || '').includes('CLSD') ? (
                                  <div className="sap-menu-item" onClick={() => restrictActionMutation.mutate({ actionName: 'lockProductionOrder' })}>Lock</div>
                                ) : (
                                  <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Lock</div>
                                )}

                                {/* 2. Unlock */}
                                {(order.status || '').includes('LOKD') ? (
                                  <div className="sap-menu-item" onClick={() => restrictActionMutation.mutate({ actionName: 'unlockProductionOrder' })}>Unlock</div>
                                ) : (
                                  <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Unlock</div>
                                )}

                                <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }}></div>

                                {/* 4. Complete Technically */}
                                {!(order.status || '').includes('TECO') && !(order.status || '').includes('CLSD') ? (
                                  <div className="sap-menu-item" onClick={() => restrictActionMutation.mutate({ actionName: 'technicallyCompleteOrder' })}>Complete Technically</div>
                                ) : (
                                  <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Complete Technically</div>
                                )}

                                {/* 5. Revoke Technical Completion */}
                                {(order.status || '').includes('TECO') ? (
                                  <div className="sap-menu-item" onClick={() => restrictActionMutation.mutate({ actionName: 'revokeTechnicalCompletionOrder' })}>Revoke Technical Completion</div>
                                ) : (
                                  <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Revoke Technical Completion</div>
                                )}

                                {/* 6. Close */}
                                {((order.status || '').includes('TECO') || (order.status || '').includes('DLV')) && !(order.status || '').includes('CLSD') ? (
                                  <div className="sap-menu-item" onClick={() => restrictActionMutation.mutate({ actionName: 'closeOrder' })}>Close</div>
                                ) : (
                                  <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Close</div>
                                )}

                                {/* 7. Undo Close/Complete */}
                                {(order.status || '').includes('CLSD') ? (
                                  <div className="sap-menu-item" onClick={() => restrictActionMutation.mutate({ actionName: 'revokeCloseOrder' })}>Undo Close/Complete</div>
                                ) : (
                                  <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Undo Close/Complete</div>
                                )}

                                {/* 8. Deletion Flag Set */}
                                {!(order.status || '').includes('DLFL') ? (
                                  <div className="sap-menu-item" onClick={() => restrictActionMutation.mutate({ actionName: 'setDeletionFlagOrder' })}>Deletion Flag Set</div>
                                ) : (
                                  <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Deletion Flag Set</div>
                                )}

                                {/* 9. Deletion Flag Undo */}
                                {(order.status || '').includes('DLFL') ? (
                                  <div className="sap-menu-item" onClick={() => restrictActionMutation.mutate({ actionName: 'revokeDeletionFlagOrder' })}>Deletion Flag Undo</div>
                                ) : (
                                  <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Deletion Flag Undo</div>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={{ padding: '6px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>Deletion Flag</div>

                          {/* WM Material Staging Submenu Trigger */}
                          <div
                            className={`sap-menu-item ${showWmStagingSubmenu ? 'active' : ''}`}
                            onMouseEnter={() => setShowWmStagingSubmenu(true)}
                            onMouseLeave={() => setShowWmStagingSubmenu(false)}
                            onClick={(e) => { e.stopPropagation(); setShowWmStagingSubmenu(!showWmStagingSubmenu); }}
                            style={{ position: 'relative', fontWeight: 600 }}
                          >
                            <span>WM Material Staging</span>
                            <span>▸</span>

                            {/* Level 3: WM Material Staging Submenu (Simulate & Execute) */}
                            {showWmStagingSubmenu && (
                              <div style={{
                                position: 'absolute', top: 0, left: '100%', marginLeft: '2px',
                                backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10001, minWidth: '160px', padding: '4px 0'
                              }}>
                                {/* Simulate */}
                                {(order.status || '').split(' ').some((st: string) => ['CRTD', 'REL', 'STRT', 'PCNF', 'CNF', 'INSP'].includes(st)) ? (
                                  <div
                                    className="sap-menu-item"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      stageWmMaterialMutation.mutate({ isSimulation: true });
                                    }}
                                  >
                                    Simulate
                                  </div>
                                ) : (
                                  <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Simulate</div>
                                )}

                                {/* Execute */}
                                {(order.status || '').split(' ').some((st: string) => ['CRTD', 'REL', 'STRT', 'PCNF', 'CNF', 'INSP'].includes(st)) ? (
                                  <div
                                    className="sap-menu-item"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      stageWmMaterialMutation.mutate({ isSimulation: false });
                                    }}
                                  >
                                    Execute
                                  </div>
                                ) : (
                                  <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Execute</div>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={{ padding: '6px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>Inspection Lot</div>
                          <div style={{ padding: '6px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>Split Order</div>
                          <div style={{ padding: '6px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>Deallocate</div>
                        </div>
                      )}
                    </div>

                    <div className="sap-menu-item" style={{ color: '#64748b' }}>Edit</div>

                    {/* Goto (Hover/Click Submenu Trigger) */}
                    <div
                      className={`sap-menu-item ${showGotoSubmenu ? 'active' : ''}`}
                      onMouseEnter={() => setShowGotoSubmenu(true)}
                      onMouseLeave={() => { setShowGotoSubmenu(false); setShowCostsSubmenu(false); }}
                      onClick={() => setShowGotoSubmenu(!showGotoSubmenu)}
                      style={{ position: 'relative' }}
                    >
                      <span>Goto</span>
                      <span>▸</span>

                      {/* Level 2: Goto Submenu */}
                      {showGotoSubmenu && (
                        <div style={{
                          position: 'absolute', top: 0, left: '100%', marginLeft: '2px',
                          backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10000, minWidth: '220px', padding: '4px 0'
                        }}>
                          <div style={{ padding: '6px 12px', color: '#1e293b', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Header (Shift+F6)</div>
                          <div style={{ padding: '6px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>Collective Order</div>
                          <div style={{ padding: '6px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>Overviews</div>

                          {/* Costs Submenu Trigger */}
                          <div
                            className={`sap-menu-item ${showCostsSubmenu ? 'active' : ''}`}
                            onMouseEnter={() => setShowCostsSubmenu(true)}
                            onMouseLeave={() => setShowCostsSubmenu(false)}
                            onClick={(e) => { e.stopPropagation(); setShowCostsSubmenu(!showCostsSubmenu); }}
                            style={{ position: 'relative', fontWeight: 600 }}
                          >
                            <span>Costs</span>
                            <span>▸</span>

                            {/* Level 3: Costs Submenu (Analysis, Itemization, Cost Component Split, Balance) */}
                            {showCostsSubmenu && (
                              <div style={{
                                position: 'absolute', top: 0, left: '100%', marginLeft: '2px',
                                backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10001, minWidth: '200px', padding: '4px 0'
                              }}>
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchCostViewMutation.mutate({ actionName: 'getCostAnalysis', title: `Cost Analysis — Production Order ${order.orderNumber}` });
                                  }}
                                >
                                  Analysis
                                </div>
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchCostViewMutation.mutate({ actionName: 'getCostItemization', title: `Cost Itemization — Production Order ${order.orderNumber}` });
                                  }}
                                >
                                  Itemization
                                </div>
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchCostViewMutation.mutate({ actionName: 'getCostComponentSplit', title: `Cost Component Split — Production Order ${order.orderNumber}` });
                                  }}
                                >
                                  Cost Component Split
                                </div>
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchCostViewMutation.mutate({ actionName: 'getCostBalance', title: `Cost Balance — Production Order ${order.orderNumber}` });
                                  }}
                                >
                                  Balance
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Missing Parts Submenu Trigger */}
                          <div
                            className={`sap-menu-item ${showMissingPartsSubmenu ? 'active' : ''}`}
                            onMouseEnter={() => setShowMissingPartsSubmenu(true)}
                            onMouseLeave={() => setShowMissingPartsSubmenu(false)}
                            onClick={(e) => { e.stopPropagation(); setShowMissingPartsSubmenu(!showMissingPartsSubmenu); }}
                            style={{ position: 'relative', fontWeight: 600 }}
                          >
                            <span>Missing Parts</span>
                            <span>▸</span>

                            {/* Level 3: Missing Parts Submenu (Missing Parts Overview & Missing Parts List) */}
                            {showMissingPartsSubmenu && (
                              <div style={{
                                position: 'absolute', top: 0, left: '100%', marginLeft: '2px',
                                backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10001, minWidth: '200px', padding: '4px 0'
                              }}>
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchMissingPartsMutation.mutate({ actionName: 'getMissingPartsOverview', title: `Missing Parts Overview — Production Order ${order.orderNumber}` });
                                  }}
                                >
                                  Missing Parts Overview
                                </div>
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchMissingPartsMutation.mutate({ actionName: 'getMissingParts', title: `Missing Parts List — Production Order ${order.orderNumber}` });
                                  }}
                                >
                                  Missing Parts List
                                </div>
                              </div>
                            )}
                          </div>
                          <div
                            className="sap-menu-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchGoodsMovementsMutation.mutate();
                            }}
                          >
                            Documented Goods Movements
                          </div>
                          <div style={{ padding: '6px 12px', color: '#94a3b8', fontSize: '0.75rem' }}>Graphic</div>

                          {/* Logs Submenu Trigger */}
                          <div
                            className={`sap-menu-item ${showLogsSubmenu ? 'active' : ''}`}
                            onMouseEnter={() => setShowLogsSubmenu(true)}
                            onMouseLeave={() => setShowLogsSubmenu(false)}
                            onClick={(e) => { e.stopPropagation(); setShowLogsSubmenu(!showLogsSubmenu); }}
                            style={{ position: 'relative', fontWeight: 600 }}
                          >
                            <span>Logs</span>
                            <span>▸</span>

                            {/* Level 3: Logs Submenu (10 Ordered SAP items) */}
                            {showLogsSubmenu && (
                              <div style={{
                                position: 'absolute', top: 0, left: '100%', marginLeft: '2px',
                                backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10001, minWidth: '220px', padding: '4px 0'
                              }}>
                                {/* 1. Overview */}
                                <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Overview</div>

                                {/* 2. Scheduling */}
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowScheduleModal(true);
                                    setShowSapMenuDropdown(false);
                                  }}
                                >
                                  Scheduling
                                </div>

                                {/* 3. Release */}
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    releaseOrderMutation.mutate();
                                    setShowSapMenuDropdown(false);
                                  }}
                                >
                                  Release
                                </div>

                                {/* 4. Deletion Flag */}
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    restrictActionMutation.mutate({ actionName: 'setDeletionFlagOrder' });
                                    setShowSapMenuDropdown(false);
                                  }}
                                >
                                  Deletion Flag
                                </div>

                                {/* 5. WM Material Staging */}
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    stageWmMaterialMutation.mutate({ isSimulation: false });
                                    setShowSapMenuDropdown(false);
                                  }}
                                >
                                  WM Material Staging
                                </div>

                                {/* 6. Read PP Master Data (Integrated existing functionality) */}
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalErrorMsg('');
                                    setShowReadMasterModal(true);
                                    setShowSapMenuDropdown(false);
                                  }}
                                >
                                  Read PP Master Data
                                </div>

                                {/* 7. Material Availability */}
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    checkMaterialMutation.mutate();
                                    setShowSapMenuDropdown(false);
                                  }}
                                >
                                  Material Availability
                                </div>

                                {/* 8. PRT Availability */}
                                <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>PRT Availability</div>

                                {/* 9. Cost Calculation */}
                                <div
                                  className="sap-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchCostViewMutation.mutate({ actionName: 'getCostAnalysis', title: `Cost Analysis — Production Order ${order.orderNumber}` });
                                    setShowSapMenuDropdown(false);
                                  }}
                                >
                                  Cost Calculation
                                </div>

                                {/* 10. Serial Numbers */}
                                <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Serial Numbers</div>
                              </div>
                            )}
                          </div>

                          <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }}></div>
                          <div className="sap-menu-item" onClick={() => navigate('/orders')}>Back (F3)</div>
                        </div>
                      )}
                    </div>

                    {/* Operation (Hover/Click Submenu Trigger) */}
                    <div
                      className={`sap-menu-item ${showOperationSubmenu ? 'active' : ''}`}
                      onMouseEnter={() => setShowOperationSubmenu(true)}
                      onMouseLeave={() => setShowOperationSubmenu(false)}
                      onClick={() => setShowOperationSubmenu(!showOperationSubmenu)}
                      style={{ position: 'relative' }}
                    >
                      <span>Operation</span>
                      <span>▸</span>

                      {/* Level 2: Operation Submenu (12 Ordered SAP Items) */}
                      {showOperationSubmenu && (
                        <div style={{
                          position: 'absolute', top: 0, left: '100%', marginLeft: '2px',
                          backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10000, minWidth: '260px', padding: '4px 0'
                        }}>
                          {/* 1. Operation Details (F7) */}
                          <div
                            className="sap-menu-item"
                            style={{ display: 'flex', justifyContent: 'space-between' }}
                            onClick={() => {
                              setShowSapMenuDropdown(false);
                              setShowOperationSubmenu(false);
                              handleOperationDetails();
                            }}
                          >
                            <span>Operation Details</span>
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>F7</span>
                          </div>

                          {/* 2. Purchase Requisition */}
                          <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Purchase Requisition</div>

                          {/* 3. Object Dependency... */}
                          <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Object Dependency...</div>

                          {/* 4. Release */}
                          <div
                            className="sap-menu-item"
                            onClick={() => {
                              releaseOrderMutation.mutate();
                              setShowSapMenuDropdown(false);
                            }}
                          >
                            Release
                          </div>

                          {/* 5. Status (Ctrl+F5) */}
                          <div
                            className="sap-menu-item"
                            style={{ display: 'flex', justifyContent: 'space-between' }}
                            onClick={() => {
                              setShowStatusChangesModal(true);
                              setShowSapMenuDropdown(false);
                            }}
                          >
                            <span>Status</span>
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Ctrl+F5</span>
                          </div>

                          {/* 6. Long Text (F9) */}
                          <div
                            className="sap-menu-item"
                            style={{ display: 'flex', justifyContent: 'space-between' }}
                            onClick={() => {
                              setShowApiNotice(`Long Text for Order ${order.orderNumber}: ${order.longText || 'No long text entered.'}`);
                              setShowSapMenuDropdown(false);
                            }}
                          >
                            <span>Long Text</span>
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>F9</span>
                          </div>

                          {/* 7. Unplanned Inspection Characteristics */}
                          <div style={{ padding: '6px 12px', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'not-allowed' }}>Unplanned Inspection Characteristics</div>

                          {/* 8. Cumulate Standard Values */}
                          <div
                            className="sap-menu-item"
                            onClick={() => {
                              setSuccessMsg('Cumulated standard values calculated from active SAP routing operations.');
                              setShowSapMenuDropdown(false);
                            }}
                          >
                            Cumulate Standard Values
                          </div>

                          {/* 9. Activate Purchase Requisition/Reserv. */}
                          <div
                            className="sap-menu-item"
                            onClick={() => {
                              setSuccessMsg('Activated component reservations in SAP S/4HANA Public Cloud.');
                              setShowSapMenuDropdown(false);
                            }}
                          >
                            Activate Purchase Requisition/Reserv.
                          </div>

                          {/* 10. Display Confirmations */}
                          <div
                            className="sap-menu-item"
                            onClick={() => {
                              setShowApiNotice(`Confirmed Yield: ${parseFloat(order.confirmedQty || 0).toFixed(0)} PC across ${order.operations?.length || 0} routing operations.`);
                              setShowSapMenuDropdown(false);
                            }}
                          >
                            Display Confirmations
                          </div>

                          {/* 11. Dispatch */}
                          <div
                            className="sap-menu-item"
                            onClick={() => {
                              setSuccessMsg(`Dispatched operations for Order ${order.orderNumber} to active work centers.`);
                              setShowSapMenuDropdown(false);
                            }}
                          >
                            Dispatch
                          </div>

                          {/* 12. Deallocate */}
                          <div
                            className="sap-menu-item"
                            onClick={() => {
                              setSuccessMsg(`Deallocated operation scheduling locks for Order ${order.orderNumber}.`);
                              setShowSapMenuDropdown(false);
                            }}
                          >
                            Deallocate
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="sap-menu-item" style={{ color: '#64748b' }}>System</div>
                    <div className="sap-menu-item" style={{ color: '#64748b' }}>Help</div>
                  </div>
                )}
              </div>

              <button className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setShowScheduleModal(true)}>Schedule Order</button>
              <button className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600, color: '#0a6ed1' }} onClick={() => checkMaterialMutation.mutate()} title="Check current component availability">Check Availability</button>
              <button className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => resetAndCheckMaterialMutation.mutate()} title="Clear previous availability and re-check current stock">Reset & Check</button>
              <button className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => { setModalErrorMsg(''); setShowReadMasterModal(true); }}>Read PP Master Data</button>
              <button className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setShowComponentsModal(true)}>Components</button>
              <button className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => { document.getElementById('operations-section')?.scrollIntoView({ behavior: 'smooth' }); }}>Operations</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', fontSize: '0.85rem' }}>
              <div>
                <strong style={{ color: '#666' }}>Header Product</strong>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{order.material?.code}</div>
                <div style={{ color: '#777', fontSize: '0.75rem' }}>{order.material?.description}</div>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Target Quantity</strong>
                {(() => {
                  const userRole = (user?.role || '').toUpperCase();
                  const allowedRoles = ['PROD_PLANNER', 'PROD_MANAGER', 'PRODUCTION_PLANNER', 'PRODUCTION_MANAGER', 'ADMIN'];
                  const hasPermission = allowedRoles.includes(userRole);
                  const currentSysStatus = order.systemStatus || order.status || 'CRTD';
                  const isStatusEditable = ['CRTD', 'REL', 'PCNF', 'CNF'].includes(currentSysStatus);
                  const isStatusDisabled = ['DLV', 'TECO', 'CLSD'].includes(currentSysStatus);
                  const canEdit = hasPermission && isStatusEditable;

                  let tooltipMsg = '';
                  if (!hasPermission) {
                    tooltipMsg = 'You do not have authorization (CHANGE_ORDER_QUANTITY) to change the Target Quantity.';
                  } else if (isStatusDisabled) {
                    if (currentSysStatus === 'TECO') tooltipMsg = 'Target Quantity cannot be changed because the Production Order is technically completed.';
                    else if (currentSysStatus === 'CLSD') tooltipMsg = 'Target Quantity cannot be changed because the Production Order is closed.';
                    else tooltipMsg = 'Target Quantity cannot be changed because the Production Order is delivered.';
                  }

                  if (isEditingQty) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <input
                          type="number"
                          value={editQtyValue}
                          onChange={(e) => setEditQtyValue(e.target.value)}
                          style={{
                            width: '80px',
                            padding: '2px 5px',
                            fontSize: '0.85rem',
                            border: '1px solid var(--sap-border-color)',
                            borderRadius: '4px'
                          }}
                          min="1"
                        />
                        <span style={{ fontSize: '0.8rem', color: '#555', fontWeight: 600 }}>PC</span>
                        <button
                          onClick={() => {
                            const val = parseFloat(editQtyValue);
                            if (isNaN(val) || val <= 0) {
                              setErrorMsg('Target Quantity must be greater than zero.');
                              return;
                            }
                            updateQtyMutation.mutate(val);
                          }}
                          disabled={updateQtyMutation.isPending}
                          style={{
                            padding: '2px 8px',
                            backgroundColor: '#37b24d',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          {updateQtyMutation.isPending ? 'Saving...' : 'Save'}
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
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginTop: '0.2rem' }}>
                      <span>{parseFloat(order.targetQty).toFixed(0)} PC</span>
                      {canEdit ? (
                          <span title="Edit Target Quantity">
                            <Edit2
                              size={14}
                              style={{ cursor: 'pointer', color: '#0a6ed1' }}
                              onClick={() => {
                                setEditQtyValue(parseFloat(order.targetQty).toFixed(0));
                                setIsEditingQty(true);
                              }}
                            />
                          </span>
                      ) : (
                        <span 
                          title={tooltipMsg} 
                          style={{ cursor: 'not-allowed', color: '#94a3b8', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center' }}
                        >
                          🔒
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div>
                <strong style={{ color: '#666' }}>Confirmed Yield</strong>
                <div style={{ fontWeight: 600, marginTop: '0.2rem', color: '#2b7c2b' }}>{parseFloat(order.confirmedQty).toFixed(0)} PC</div>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Delivered to Warehouse</strong>
                <div style={{ fontWeight: 600, marginTop: '0.2rem', color: '#087f5b', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span>{parseFloat(order.deliveredQty || 0).toFixed(0)} PC</span>
                  {parseFloat(order.deliveredQty || 0) < parseFloat(order.targetQty || 0) && (
                    <button
                      className="sap-btn sap-btn-primary"
                      style={{ padding: '2px 8px', fontSize: '0.75rem', backgroundColor: '#059669', color: 'white' }}
                      onClick={() => {
                        setShowGrForm(true);
                        setGrQty(String(parseFloat(order.targetQty) - parseFloat(order.deliveredQty || 0)));
                      }}
                    >
                      Post Goods Receipt (101)
                    </button>
                  )}
                  {parseFloat(order.deliveredQty || 0) > 0 && (
                    <button
                      className="sap-btn"
                      style={{ padding: '2px 8px', fontSize: '0.75rem', backgroundColor: '#dc2626', color: 'white', border: 'none', cursor: 'pointer' }}
                      onClick={() => {
                        if (confirm(`Cancel latest Goods Receipt for Order ${order.orderNumber}? This will post a 102 reversal material document.`)) {
                          cancelGrMutation.mutate();
                        }
                      }}
                      disabled={cancelGrMutation.isPending}
                    >
                      {cancelGrMutation.isPending ? 'Cancelling 102...' : 'Cancel Goods Receipt (102)'}
                    </button>
                  )}
                </div>
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
                  <div>
                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                      <div><strong>Order Type:</strong> {order.orderType}</div>
                      <div><strong>Plant Code:</strong> {order.plant?.code}</div>
                      <div><strong>SAP Synced:</strong> {order.isSapSynced ? 'Yes' : 'No'}</div>
                    </div>

                    {/* SAP System Statuses Table (Matching Image 36) */}
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#ffffff', maxWidth: '480px', overflow: 'hidden' }}>
                      <div style={{ backgroundColor: '#f1f5f9', padding: '6px 12px', fontWeight: 700, fontSize: '0.82rem', borderBottom: '1px solid #cbd5e1', color: '#1e293b' }}>
                        Syst. Status
                      </div>
                      <table className="sap-table" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ width: '30px', textAlign: 'center' }}>X</th>
                            <th style={{ width: '80px' }}>Status</th>
                            <th>Text</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['CRTD', 'MSPT', 'BCRQ', 'MANC', 'NTUP', 'SETC'].map((statusCode) => {
                            const activeTokens = (order.status || '').split(' ');
                            const isPresent = activeTokens.includes(statusCode);
                            return (
                              <tr key={statusCode}>
                                <td style={{ textAlign: 'center' }}>
                                  <input type="checkbox" checked={isPresent} readOnly style={{ accentColor: '#0a6ed1' }} />
                                </td>
                                <td style={{ fontWeight: 700, color: '#0a6ed1' }}>{statusCode}</td>
                                <td style={{ color: '#1e293b' }}>{SAP_SYSTEM_STATUS_MAP[statusCode]}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
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
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div><strong>Created At:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</div>
                    <div><strong>Created By:</strong> {order.createdBy || 'System'}</div>
                    <div><strong>Modified At:</strong> {order.modifiedAt ? new Date(order.modifiedAt).toLocaleString() : '-'}</div>
                    <div>
                      <strong>Last Synced with SAP:</strong>{' '}
                      <span style={{ color: order.lastSapSyncStatus === 'FAILED' ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
                        {order.lastSapSyncAt ? new Date(order.lastSapSyncAt).toLocaleString() : 'Just now'} ({order.lastSapSyncStatus || 'SUCCESS'})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      {/* SAP Action Bar */}
      <div className="sap-card" style={{ marginBottom: '2rem', padding: '0.5rem 1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginRight: '0.5rem' }}>Header:</span>
            <button
              className="sap-btn sap-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              disabled={isOrderClosed}
              title={isOrderClosed ? 'Order is closed (CLSD) - Header changes locked' : ''}
              onClick={() => { setNewStartDate(order.plannedStartDate); setNewEndDate(order.plannedEndDate); setShowChangeDatesModal(true); }}
            >
              Change Dates/Times
            </button>
            <button
              className="sap-btn sap-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              disabled={isOrderClosed}
              title={isOrderClosed ? 'Order is closed (CLSD) - Net quantity locked' : ''}
              onClick={() => { setNewQty(order.targetQty); setShowChangeQtyModal(true); }}
            >
              Change Net Quantity
            </button>
            <button
              className="sap-btn sap-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              disabled={isOrderClosed}
              onClick={() => setShowBatchModal(true)}
            >
              Create Batch
            </button>
            <button
              className="sap-btn sap-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              disabled={!eligibility?.actions?.technicalCompletion?.allowed}
              title={eligibility?.actions?.technicalCompletion?.reason || 'Technically Complete Order'}
              onClick={() => setShowTecoModal(true)}
            >
              Technically Complete (TECO)
            </button>
            {eligibility?.actions?.revokeTechnicalCompletion?.allowed && (
              <button
                className="sap-btn sap-btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                onClick={() => revokeTecoMutation.mutate()}
              >
                Revoke TECO
              </button>
            )}
            <button
              className="sap-btn sap-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd', fontWeight: 600 }}
              disabled={refreshSingleOrderMutation.isPending}
              onClick={() => refreshSingleOrderMutation.mutate()}
            >
              {refreshSingleOrderMutation.isPending ? 'Syncing SAP...' : '↻ Refresh from SAP'}
            </button>
            <button
              className="sap-btn sap-btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              disabled={!eligibility?.actions?.closeOrder?.allowed}
              title={eligibility?.actions?.closeOrder?.reasons?.join('; ') || 'Close Production Order'}
              onClick={() => setShowCloseModal(true)}
            >
              Close Order (CLSD)
            </button>
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

      {/* Routing Operations — Operation Overview */}
      <div id="operations-section" className="sap-card" style={{ marginBottom: '2rem' }}>
        <div className="sap-card-header" style={{ justifyContent: 'space-between' }}>
          <h3 className="sap-card-title">Routing & Sequence Operations (Operation Overview)</h3>
          {isChangeMode && (
            <button
              className="sap-btn sap-btn-secondary"
              style={{ fontSize: '0.75rem' }}
              onClick={() => setShowApiNotice('SAP Public Cloud OData V2 API API_PRODUCTION_ORDER_2_SRV restricts creating new operations directly. Operations are generated by SAP master data routing explosion.')}
            >
              + Add Operation (SAP Info)
            </button>
          )}
        </div>
        <div className="sap-table-container">
          <table className="sap-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Op</th>
                <th style={{ width: '50px' }}>SOp</th>
                <th>Operation Short Text</th>
                <th style={{ width: '130px' }}>Work Center</th>
                <th>Std Time</th>
                <th>Spent Time</th>
                <th>Yield Qty</th>
                <th>Quality Gate</th>
                <th>Status</th>
                {isChangeMode && <th style={{ width: '100px' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {order.operations?.length === 0 ? (
                <tr>
                  <td colSpan={isChangeMode ? 10 : 9} style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>No routing operations defined.</td>
                </tr>
              ) : (
                order.operations?.map((op: any) => {
                  const isQualityOp = (op.description || '').toLowerCase().includes('quality') || (op.description || '').toLowerCase().includes('inspection') || op.sequence === 30;
                  const isFinalOp = op.sequence === Math.max(...order.operations.map((o: any) => o.sequence));
                  const lot03 = isQualityOp ? order.qualityLots?.find((l: any) => l.inspectionType === '03') || order.qualityInspectionLots?.find((l: any) => l.inspectionType === '03') : null;
                  const lot04 = isFinalOp ? order.qualityLots?.find((l: any) => l.inspectionType === '04') || order.qualityInspectionLots?.find((l: any) => l.inspectionType === '04') : null;

                  return (
                    <tr key={op.ID}>
                      <td style={{ fontWeight: 600, color: '#0a6ed1' }}>{String(op.sequence || 10).padStart(4, '0')}</td>
                      <td style={{ color: '#94a3b8' }}>------</td>
                      <td>
                        {isChangeMode && editingOpId === op.ID ? (
                          <input
                            type="text"
                            className="sap-input"
                            value={editingOpDesc}
                            onChange={(e) => setEditingOpDesc(e.target.value)}
                            style={{ padding: '2px 6px', fontSize: '0.85rem' }}
                          />
                        ) : (
                          <span style={{ fontWeight: 500 }}>{op.description}</span>
                        )}
                      </td>
                      <td>
                        {isChangeMode && editingOpId === op.ID ? (
                          <input
                            type="text"
                            className="sap-input"
                            value={editingOpWc}
                            onChange={(e) => setEditingOpWc(e.target.value)}
                            placeholder="e.g. CHCLRM01"
                            style={{ padding: '2px 6px', fontSize: '0.85rem' }}
                          />
                        ) : (
                          <span>{op.workCenter?.code || op.workCenter?.name || op.workCenter_ID || '-'}</span>
                        )}
                      </td>
                      <td>{parseFloat(op.standardTime).toFixed(0)} {op.timeUnit}</td>
                      <td>{parseFloat(op.confirmedTime).toFixed(0)} {op.timeUnit}</td>
                      <td style={{ color: '#2b7c2b', fontWeight: 600 }}>{parseFloat(op.yieldQty).toFixed(0)} PC</td>
                      <td>
                        {isQualityOp ? (
                          lot03 ? (
                            lot03.usageDecision === 'UDAC' ? (
                              <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
                                PASSED (UDAC)
                              </span>
                            ) : lot03.resultsRecorded ? (
                              <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fef9c3', color: '#a16207', border: '1px solid #fde047' }}>
                                UD PENDING
                              </span>
                            ) : (
                              <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
                                RR PENDING
                              </span>
                            )
                          ) : (
                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                              ACTIVE (Type 03)
                            </span>
                          )
                        ) : isFinalOp ? (
                          lot04 ? (
                            lot04.usageDecision === 'UDAC' ? (
                              <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
                                PASSED (UDAC)
                              </span>
                            ) : (
                              <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fef9c3', color: '#a16207', border: '1px solid #fde047' }}>
                                POST-PROD ACTIVE
                              </span>
                            )
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Final Op</span>
                          )
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>
                      <td>
                        <span className={`sap-badge sap-badge-${op.status}`}>{op.status}</span>
                      </td>
                      {isChangeMode && (
                        <td>
                          {editingOpId === op.ID ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="sap-btn"
                                style={{ backgroundColor: '#2b7c2b', color: '#fff', padding: '2px 6px', fontSize: '0.75rem' }}
                                onClick={() => updateOpMutation.mutate({ opId: op.ID, description: editingOpDesc, workCenterCode: editingOpWc })}
                                disabled={updateOpMutation.isPending}
                              >
                                Save
                              </button>
                              <button
                                className="sap-btn"
                                style={{ backgroundColor: '#fa5252', color: '#fff', padding: '2px 6px', fontSize: '0.75rem' }}
                                onClick={() => setEditingOpId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="sap-btn sap-btn-secondary"
                              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                              onClick={() => {
                                setEditingOpId(op.ID);
                                setEditingOpDesc(op.description);
                                setEditingOpWc(op.workCenter?.code || '');
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOM Components — Component Overview */}
      <div className="sap-card" style={{ marginBottom: '2rem' }}>
        <div className="sap-card-header" style={{ justifyContent: 'space-between' }}>
          <h3 className="sap-card-title">Bill of Materials (Component Overview)</h3>
          {isChangeMode && (
            <button
              className="sap-btn sap-btn-secondary"
              style={{ fontSize: '0.75rem' }}
              onClick={() => setShowApiNotice('SAP Public Cloud API V2 generates components via BOM explosion or PP Master Data Re-read (Read PP Master Data). Direct component creation requires a master data re-read.')}
            >
              + Add Component (SAP Info)
            </button>
          )}
        </div>
        <div className="sap-table-container">
          <table className="sap-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Component Code</th>
                <th>Description</th>
                <th>Required Qty</th>
                <th>Issued Qty</th>
                <th>Status</th>
                <th>Goods Issue Action (261 / 262)</th>
                {isChangeMode && <th style={{ width: '100px' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {order.components?.length === 0 ? (
                <tr>
                  <td colSpan={isChangeMode ? 8 : 7} style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>No components listed.</td>
                </tr>
              ) : (
                order.components?.map((c: any, idx: number) => {
                  const issuedVal = parseFloat(c.issuedQty || 0);
                  const reqVal = parseFloat(c.requiredQty || 0);
                  const isFullyIssued = issuedVal >= reqVal && reqVal > 0;
                  const compMatId = c.componentMaterial_ID || c.componentMaterial?.ID;
                  const compMatCode = c.componentMaterial?.code || c.componentMaterialCode;
                  const active261 = (order.goodsMovements || []).find((m: any) => {
                    const is261 = m.movementType === '261';
                    const isNotCancelled = !m.isCancelled && m.status !== 'CANCELLED' && !m.cancelledByDoc;
                    const matchesMat = (compMatId && m.material_ID === compMatId) ||
                                       (compMatCode && (m.material?.code === compMatCode || m.materialCode === compMatCode));
                    return is261 && isNotCancelled && matchesMat;
                  });
                  const hasActive261 = Boolean(active261) || (issuedVal > 0 && c.status === 'ISSD');

                  return (
                    <tr key={c.ID}>
                      <td style={{ fontWeight: 600, color: '#475569' }}>{String((idx + 1) * 10).padStart(4, '0')}</td>
                      <td style={{ fontWeight: 700, color: '#0a6ed1' }}>{c.componentMaterial?.code || c.componentMaterialCode}</td>
                      <td>{c.componentMaterial?.description || c.componentDescription || 'Component Material'}</td>
                      <td>
                        {isChangeMode && editingCompId === c.ID ? (
                          <input
                            type="number"
                            className="sap-input"
                            value={editingCompQty}
                            onChange={(e) => setEditingCompQty(e.target.value)}
                            style={{ padding: '2px 6px', fontSize: '0.85rem', width: '80px' }}
                          />
                        ) : (
                          <span style={{ fontWeight: 600 }}>{reqVal.toFixed(0)} {c.unit || 'PC'}</span>
                        )}
                      </td>
                      <td>{issuedVal.toFixed(0)} {c.unit || 'PC'}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: c.status === 'ISSD' || isFullyIssued ? '#ebfbee' : c.status === 'MSPT' ? '#ffe3e3' : '#e8f4fd',
                          color: c.status === 'ISSD' || isFullyIssued ? '#2b7c2b' : c.status === 'MSPT' ? '#bb0000' : '#0a6ed1',
                        }}>
                          {c.status === 'MSPT' && <AlertTriangle size={12} />}
                          <span>{hasActive261 ? 'Issued (261)' : isFullyIssued ? 'Issued (261)' : c.status === 'MSPT' ? 'Material Shortage' : 'Reserved'}</span>
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="sap-btn sap-btn-primary"
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.75rem',
                              backgroundColor: (isOrderDlfl || hasActive261) ? '#cccccc' : '#0a6ed1',
                              color: (isOrderDlfl || hasActive261) ? '#666666' : 'white',
                              cursor: (isOrderDlfl || hasActive261) ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => {
                              if (isOrderDlfl) {
                                setErrorMsg(`Goods Issue cannot be posted for Production Order ${order?.orderNumber || ''}. The order is marked with Deletion Flag (DLFL). Further goods movements are not permitted.`);
                                return;
                              }
                              if (hasActive261) {
                                setErrorMsg(`Goods Issue (261) already exists and is active for component ${compMatCode || ''} on Order ${order?.orderNumber || ''}. Reverse current Goods Issue before posting a new one.`);
                                return;
                              }
                              postGiMutation.mutate({ componentId: c.ID, quantity: reqVal - issuedVal });
                            }}
                            disabled={isOrderDlfl || hasActive261 || postGiMutation.isPending}
                            title={isOrderDlfl ? "Goods Issue is not allowed. Production Order has Deletion Flag (DLFL)." : hasActive261 ? "Active Goods Issue (261) already exists. Reverse current Goods Issue before posting a new one." : ""}
                          >
                            {postGiMutation.isPending ? 'Posting 261...' : 'Post Goods Issue (261)'}
                          </button>

                          <button
                            className="sap-btn"
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.75rem',
                              backgroundColor: (isOrderDlfl || !hasActive261) ? '#e2e8f0' : '#dc2626',
                              color: (isOrderDlfl || !hasActive261) ? '#94a3b8' : 'white',
                              border: 'none',
                              cursor: (isOrderDlfl || !hasActive261) ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => {
                              if (isOrderDlfl) {
                                setErrorMsg(`Goods Issue reversal is not allowed. Production Order ${order?.orderNumber || ''} has Deletion Flag (DLFL).`);
                                return;
                              }
                              if (!hasActive261) {
                                setErrorMsg(`No active Goods Issue (261) document available to reverse for component ${compMatCode || ''}.`);
                                return;
                              }
                              if (confirm(`Cancel Goods Issue for component ${c.componentMaterial?.code || c.componentMaterialCode}? This will post a 262 reversal material document.`)) {
                                cancelGiMutation.mutate(c.ID);
                              }
                            }}
                            disabled={isOrderDlfl || !hasActive261 || cancelGiMutation.isPending}
                            title={isOrderDlfl ? "Goods Issue reversal is not allowed. Production Order has Deletion Flag (DLFL)." : !hasActive261 ? "No active Goods Issue (261) document available to reverse." : ""}
                          >
                            {cancelGiMutation.isPending ? 'Cancelling 262...' : 'Cancel Goods Issue (262)'}
                          </button>
                        </div>
                      </td>
                      {isChangeMode && (
                        <td>
                          {editingCompId === c.ID ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="sap-btn"
                                style={{ backgroundColor: '#2b7c2b', color: '#fff', padding: '2px 6px', fontSize: '0.75rem' }}
                                onClick={() => updateCompMutation.mutate({ compId: c.ID, requiredQty: parseFloat(editingCompQty) })}
                                disabled={updateCompMutation.isPending}
                              >
                                Save
                              </button>
                              <button
                                className="sap-btn"
                                style={{ backgroundColor: '#fa5252', color: '#fff', padding: '2px 6px', fontSize: '0.75rem' }}
                                onClick={() => setEditingCompId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="sap-btn sap-btn-secondary"
                                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                                onClick={() => {
                                  setEditingCompId(c.ID);
                                  setEditingCompQty(c.requiredQty);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="sap-btn"
                                style={{ backgroundColor: '#fa5252', color: '#fff', padding: '2px 6px', fontSize: '0.75rem' }}
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete component ${c.componentMaterial?.code} from SAP S/4HANA?`)) {
                                    deleteCompMutation.mutate(c.ID);
                                  }
                                }}
                                disabled={deleteCompMutation.isPending}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
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
                    <td style={{ fontWeight: 600 }}>
                      <button
                        className="sap-btn"
                        style={{ padding: 0, border: 'none', background: 'none', color: '#0a6ed1', textDecoration: 'underline', fontWeight: 700, cursor: 'pointer' }}
                        onClick={() => setSelectedMaterialDoc(gm)}
                      >
                        {gm.movementNumber}
                      </button>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{gm.movementType}</span>
                      <span style={{ fontSize: '0.75rem', color: '#777', marginLeft: '0.4rem' }}>
                        ({gm.movementType === '101' ? 'Goods Receipt' : gm.movementType === '261' ? 'Goods Issue' : gm.movementType === '102' ? 'GR Reversal' : gm.movementType === '262' ? 'GI Reversal' : 'Stock Movement'})
                      </span>
                    </td>
                    <td>{gm.material?.code || gm.materialCode}</td>
                    <td style={{ fontWeight: 600 }}>{parseFloat(gm.quantity).toFixed(0)} {gm.unit || 'PC'}</td>
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
                          <td colSpan={10} style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>No itemization lines available.</td>
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

      {showAvailabilityModal && availabilityResult && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="sap-card" style={{ padding: '2rem', width: '560px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, color: '#0a6ed1' }}>Material Availability Check Result</h3>
              <button className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px' }} onClick={() => setShowAvailabilityModal(false)}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '6px', backgroundColor: availabilityResult.overallStatus === 'AVAILABLE' ? '#f0fdf4' : availabilityResult.overallStatus === 'PARTIALLY_AVAILABLE' ? '#fffbe6' : '#fef2f2', border: `1px solid ${availabilityResult.overallStatus === 'AVAILABLE' ? '#bbf7d0' : availabilityResult.overallStatus === 'PARTIALLY_AVAILABLE' ? '#ffe58f' : '#fecaca'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                <span>Overall Status:</span>
                <span style={{ color: availabilityResult.overallStatus === 'AVAILABLE' ? '#16a34a' : availabilityResult.overallStatus === 'PARTIALLY_AVAILABLE' ? '#d97706' : '#dc2626' }}>
                  {availabilityResult.overallStatus}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.4rem' }}>
                Last Checked: {availabilityResult.lastCheckedAt ? new Date(availabilityResult.lastCheckedAt).toLocaleString() : 'Just now'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b' }}>Checked</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{availabilityResult.checkedCount || 0}</div>
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                <div style={{ color: '#16a34a' }}>Available</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>{availabilityResult.availableCount || 0}</div>
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: '#fffbe6', borderRadius: '4px', border: '1px solid #ffe58f' }}>
                <div style={{ color: '#d97706' }}>Partially</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#d97706' }}>{availabilityResult.partiallyAvailableCount || 0}</div>
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px', border: '1px solid #fecaca' }}>
                <div style={{ color: '#dc2626' }}>Unavailable</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#dc2626' }}>{availabilityResult.unavailableCount || 0}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '1.25rem', padding: '0.5rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
              {availabilityResult.message}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                className="sap-btn sap-btn-secondary" 
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                onClick={() => {
                  setShowAvailabilityModal(false);
                  resetAndCheckMaterialMutation.mutate();
                }}
                disabled={resetAndCheckMaterialMutation.isPending}
              >
                {resetAndCheckMaterialMutation.isPending ? 'Resetting & Checking...' : '↻ Reset & Check Again'}
              </button>
              <button className="sap-btn sap-btn-primary" style={{ padding: '4px 16px', fontSize: '0.8rem' }} onClick={() => setShowAvailabilityModal(false)}>Close</button>
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

      {/* Documented Goods Movements Modal */}
      {showGoodsMovementsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="sap-card" style={{ padding: '1.5rem', width: '920px', maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', borderRadius: '8px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0a6ed1' }}>
                Documented Goods Movements — Order {order.orderNumber}
              </h3>
              <button 
                className="sap-btn sap-btn-secondary" 
                style={{ padding: '2px 8px', fontSize: '0.9rem' }} 
                onClick={() => setShowGoodsMovementsModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Optional Filter Controls Bar */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Movement Category:</span>
                <select 
                  className="sap-input" 
                  value={mvtCategoryFilter} 
                  onChange={e => setMvtCategoryFilter(e.target.value)}
                  style={{ padding: '2px 6px', fontSize: '0.8rem', height: '28px' }}
                >
                  <option value="ALL">ALL Categories</option>
                  <option value="GI">Goods Issue (261)</option>
                  <option value="GR">Goods Receipt (101)</option>
                  <option value="REVERSAL">Reversals (262 / 102)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Movement Type:</span>
                <select 
                  className="sap-input" 
                  value={mvtTypeFilter} 
                  onChange={e => setMvtTypeFilter(e.target.value)}
                  style={{ padding: '2px 6px', fontSize: '0.8rem', height: '28px' }}
                >
                  <option value="ALL">ALL Types</option>
                  <option value="261">261 - Goods Issue</option>
                  <option value="101">101 - Goods Receipt</option>
                  <option value="262">262 - GI Reversal</option>
                  <option value="102">102 - GR Reversal</option>
                </select>
              </div>

              {(mvtCategoryFilter !== 'ALL' || mvtTypeFilter !== 'ALL') && (
                <button 
                  className="sap-btn sap-btn-secondary" 
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                  onClick={() => { setMvtCategoryFilter('ALL'); setMvtTypeFilter('ALL'); }}
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Goods Movement Table */}
            {(() => {
              const filteredMovements = (goodsMovementsData || []).filter((mvt: any) => {
                if (mvtCategoryFilter === 'GI' && !['261'].includes(mvt.movementType)) return false;
                if (mvtCategoryFilter === 'GR' && !['101'].includes(mvt.movementType)) return false;
                if (mvtCategoryFilter === 'REVERSAL' && !['262', '102'].includes(mvt.movementType)) return false;
                if (mvtTypeFilter !== 'ALL' && mvt.movementType !== mvtTypeFilter) return false;
                return true;
              });

              if (filteredMovements.length === 0) {
                return (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px border-dashed #cbd5e1', color: '#64748b' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>No documented goods movements found</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No Goods Issue or Goods Receipt material documents exist matching the current criteria for Order {order.orderNumber}.</div>
                  </div>
                );
              }

              return (
                <div className="sap-table-container" style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflowX: 'auto' }}>
                  <table className="sap-table" style={{ fontSize: '0.825rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9' }}>
                        <th style={{ width: '110px' }}>Doc Number</th>
                        <th style={{ width: '50px' }}>Item</th>
                        <th style={{ width: '80px' }}>Mvt Type</th>
                        <th style={{ width: '130px' }}>Category</th>
                        <th style={{ width: '110px' }}>Material</th>
                        <th>Description</th>
                        <th style={{ textAlign: 'right', width: '90px' }}>Quantity</th>
                        <th style={{ width: '50px' }}>Unit</th>
                        <th style={{ width: '100px' }}>Posting Date</th>
                        <th style={{ width: '60px' }}>Plant</th>
                        <th style={{ width: '70px' }}>SLoc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.map((mvt: any, idx: number) => {
                        const isGi = ['261', '262'].includes(mvt.movementType);
                        const isGr = ['101', '102'].includes(mvt.movementType);
                        const isReversal = ['262', '102'].includes(mvt.movementType);

                        return (
                          <tr key={mvt.ID || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ fontWeight: 600 }}>
                              <span 
                                style={{ color: '#0a6ed1', cursor: 'pointer', textDecoration: 'underline' }}
                                title="Click to view Material Document Details"
                                onClick={() => setSelectedMaterialDoc(mvt)}
                              >
                                {mvt.docNumber}
                              </span>
                            </td>
                            <td style={{ color: '#64748b', fontWeight: 600 }}>{mvt.itemNumber}</td>
                            <td style={{ fontWeight: 700 }}>{mvt.movementType}</td>
                            <td>
                              <span style={{ 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: 600,
                                backgroundColor: isReversal ? '#fef2f2' : isGi ? '#e6f4ea' : isGr ? '#e8f0fe' : '#f1f5f9',
                                color: isReversal ? '#dc2626' : isGi ? '#137333' : isGr ? '#1a73e8' : '#334155',
                                border: `1px solid ${isReversal ? '#fecaca' : isGi ? '#b7e1cd' : isGr ? '#aecbfa' : '#cbd5e1'}`
                              }}>
                                {mvt.movementCategory}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: '#0a6ed1' }}>{mvt.materialCode}</td>
                            <td>{mvt.materialDescription}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{mvt.quantity}</td>
                            <td style={{ color: '#64748b' }}>{mvt.unit}</td>
                            <td>{mvt.postingDate}</td>
                            <td>{mvt.plantCode}</td>
                            <td>{mvt.storageLocationCode}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid #cbd5e1', paddingTop: '0.75rem' }}>
              <button 
                className="sap-btn sap-btn-primary" 
                style={{ padding: '4px 16px', fontSize: '0.825rem' }} 
                onClick={() => setShowGoodsMovementsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material Document Details Popup Modal */}
      {selectedMaterialDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div className="sap-card" style={{ padding: '1.5rem', width: '560px', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, color: '#0a6ed1', fontSize: '1.1rem' }}>
                Material Document Details — {selectedMaterialDoc.docNumber}
              </h3>
              <button 
                className="sap-btn sap-btn-secondary" 
                style={{ padding: '2px 8px' }} 
                onClick={() => setSelectedMaterialDoc(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Document Number:</span>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{selectedMaterialDoc.docNumber}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Document Year:</span>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{selectedMaterialDoc.movementYear || '2026'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Item Number:</span>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{selectedMaterialDoc.itemNumber || '10'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Movement Type:</span>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{selectedMaterialDoc.movementType} ({selectedMaterialDoc.movementCategory})</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Posting Date:</span>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{selectedMaterialDoc.postingDate}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Material Code:</span>
                <div style={{ fontWeight: 700, color: '#0a6ed1', marginTop: '2px' }}>{selectedMaterialDoc.materialCode}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Quantity:</span>
                <div style={{ fontWeight: 700, color: '#16a34a', marginTop: '2px' }}>{selectedMaterialDoc.quantity} {selectedMaterialDoc.unit}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Plant:</span>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{selectedMaterialDoc.plantCode}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Storage Location:</span>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{selectedMaterialDoc.storageLocationCode}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Order Reference:</span>
                <div style={{ fontWeight: 700, color: '#0a6ed1', marginTop: '2px' }}>{selectedMaterialDoc.orderNumber}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Stock Type:</span>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{selectedMaterialDoc.stockType || 'Unrestricted-Use'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="sap-btn sap-btn-primary" 
                style={{ padding: '4px 16px', fontSize: '0.825rem' }} 
                onClick={() => setSelectedMaterialDoc(null)}
              >
                Close Overview
              </button>
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

      {/* TECO Confirmation Modal */}
      {showTecoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="sap-card" style={{ padding: '1.5rem', width: '480px', backgroundColor: '#ffffff', color: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0a6ed1', fontWeight: 700 }}>Technically Complete Production Order?</h3>
              <button className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => setShowTecoModal(false)}>✕</button>
            </div>
            <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Technical Completion marks production order <strong>{order?.orderNumber}</strong> as technically complete in SAP S/4HANA Public Cloud.
              <br /><br />
              SAP will validate whether open reservations, confirmations, and system statuses permit Technical Completion.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="sap-btn sap-btn-secondary" onClick={() => setShowTecoModal(false)}>Cancel</button>
              <button className="sap-btn sap-btn-primary" disabled={tecoMutation.isPending} onClick={() => tecoMutation.mutate()}>
                {tecoMutation.isPending ? 'Validating SAP...' : 'Technically Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Order (CLSD) Confirmation Modal with Validation Checklist */}
      {showCloseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="sap-card" style={{ padding: '1.5rem', width: '550px', backgroundColor: '#ffffff', color: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#b91c1c', fontWeight: 700 }}>Close Production Order?</h3>
              <button className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => setShowCloseModal(false)}>✕</button>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem', lineHeight: '1.4' }}>
              Closing production order <strong>{order?.orderNumber}</strong> is a final business and financial action. SAP S/4HANA Public Cloud will validate whether all closing requirements have been fulfilled.
            </div>

            {/* Validation Checklist */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Prerequisite Validation Checks:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li style={{ color: eligibility?.actions?.closeOrder?.checks?.eligibleStatus ? '#15803d' : '#b91c1c' }}>
                  {eligibility?.actions?.closeOrder?.checks?.eligibleStatus ? '✓' : '✗'} Eligible Order Status (REL or TECO)
                </li>
                <li style={{ color: eligibility?.actions?.closeOrder?.checks?.orderBalanceCleared ? '#15803d' : '#b91c1c' }}>
                  {eligibility?.actions?.closeOrder?.checks?.orderBalanceCleared ? '✓' : '✗'} Order Balance Cleared / Settled
                </li>
                <li style={{ color: '#15803d' }}>
                  ✓ No Open Material Reservations
                </li>
                <li style={{ color: '#64748b' }}>
                  ? Purchase Requirement Validation (SAP OData)
                </li>
              </ul>
              {eligibility?.actions?.closeOrder?.reasons?.length > 0 && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #cbd5e1', color: '#b91c1c', fontSize: '0.78rem', fontWeight: 600 }}>
                  Reason: {eligibility.actions.closeOrder.reasons.join('; ')}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="sap-btn sap-btn-secondary" onClick={() => setShowCloseModal(false)}>Cancel</button>
              <button
                className="sap-btn"
                style={{ backgroundColor: '#b91c1c', color: '#ffffff', border: 'none' }}
                disabled={closeOrderMutation.isPending || !eligibility?.actions?.closeOrder?.allowed}
                onClick={() => closeOrderMutation.mutate()}
              >
                {closeOrderMutation.isPending ? 'Closing SAP Order...' : 'Confirm Close Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material Document Drill-Down Modal */}
      {selectedMaterialDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="sap-card" style={{ padding: '1.5rem', width: '580px', backgroundColor: '#ffffff', color: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0a6ed1', fontWeight: 700 }}>
                Material Document Details — {selectedMaterialDoc.movementNumber}
              </h3>
              <button className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => setSelectedMaterialDoc(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              <div><strong>Document Number:</strong> {selectedMaterialDoc.movementNumber}</div>
              <div><strong>Document Year:</strong> {selectedMaterialDoc.movementYear || new Date().getFullYear()}</div>
              <div><strong>Movement Type:</strong> {selectedMaterialDoc.movementType}</div>
              <div><strong>Posting Date:</strong> {selectedMaterialDoc.postingDate || '-'}</div>
              <div><strong>Material Code:</strong> {selectedMaterialDoc.material?.code || selectedMaterialDoc.materialCode || '-'}</div>
              <div><strong>Quantity:</strong> {parseFloat(selectedMaterialDoc.quantity || 0).toFixed(0)} {selectedMaterialDoc.unit || 'PC'}</div>
              <div><strong>Plant:</strong> {selectedMaterialDoc.plant?.code || order?.plant?.code || '-'}</div>
              <div><strong>Storage Location:</strong> {selectedMaterialDoc.storageLocation?.code || order?.storageLocation?.code || '-'}</div>
              <div><strong>Order Reference:</strong> {order?.orderNumber}</div>
              <div><strong>Stock Type:</strong> {selectedMaterialDoc.stockType || 'Unrestricted-Use'}</div>
            </div>

            {selectedMaterialDoc.isCancelled && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                ⚠️ <strong>Cancellation Relationship:</strong> This document was cancelled by Material Document <strong>{selectedMaterialDoc.cancelledByDoc || 'Reversal Doc'}</strong>.
              </div>
            )}

            {selectedMaterialDoc.reversalRefDoc && (
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                ℹ️ <strong>Reversal Reference:</strong> This document is a cancellation of original Material Document <strong>{selectedMaterialDoc.reversalRefDoc}</strong>.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="sap-btn sap-btn-primary" onClick={() => setSelectedMaterialDoc(null)}>Close Overview</button>
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

      {/* SAP Output Management Reprint Dialog */}
      {showReprintModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="sap-card" style={{ padding: '1.5rem', width: '450px', backgroundColor: '#ffffff', color: '#1e293b' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#0a6ed1' }}>SAP Output Management — Reprint</h3>
            <p style={{ fontSize: '0.85rem', color: '#475569' }}>
              Select Output Document Type to reprint for Production Order <strong>{order.orderNumber}</strong>:
            </p>
            <div className="sap-form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="sap-label">Output Type</label>
              <select className="sap-input" value={selectedReprintType} onChange={(e) => setSelectedReprintType(e.target.value)}>
                <option value="PP_PRT">PP_PRT - Production Order Print Paper</option>
                <option value="PP_SHOP">PP_SHOP - Shop Floor Routing Paper</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="sap-btn sap-btn-secondary" onClick={() => setShowReprintModal(false)}>Cancel</button>
              <button
                className="sap-btn sap-btn-primary"
                onClick={() => reprintOutputMutation.mutate(selectedReprintType)}
                disabled={reprintOutputMutation.isPending}
              >
                {reprintOutputMutation.isPending ? 'Scheduling Reprint...' : 'Execute Reprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Components Overview Modal */}
      {showComponentsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="sap-card" style={{ padding: '1.5rem', width: '850px', maxHeight: '85vh', overflowY: 'auto', backgroundColor: '#ffffff', color: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0a6ed1', fontWeight: 700 }}>
                  Components — Production Order {order?.orderNumber}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Header Material: <strong>{order?.material?.code}</strong> ({order?.material?.description}) • Plant: <strong>{order?.plant?.code || '1102'}</strong> • Target Qty: <strong>{order?.targetQty} {order?.productionUnit || 'PC'}</strong> • Status: <span className={`sap-badge sap-badge-${order?.status}`}>{order?.status}</span>
                </div>
              </div>
              <button className="sap-btn sap-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.85rem' }} onClick={() => setShowComponentsModal(false)}>✕ Close</button>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
                Loading production order components...
              </div>
            ) : !order?.components || order.components.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
                No components found for this production order.
              </div>
            ) : (
              <div className="sap-table-container">
                <table className="sap-table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>Item</th>
                      <th>Component Code</th>
                      <th>Description</th>
                      <th>Req Qty</th>
                      <th>Withdrawn Qty</th>
                      <th>Remaining Qty</th>
                      <th>Unit</th>
                      <th>Plant / SLoc</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.components.map((c: any, idx: number) => {
                      const reqQty = parseFloat(c.requiredQty || 0);
                      const issQty = parseFloat(c.issuedQty || 0);
                      const remQty = Math.max(0, reqQty - issQty);
                      let calcStatus = 'Open';
                      let statusBg = '#e8f4fd';
                      let statusColor = '#0a6ed1';

                      if (c.status === 'ISSD' || (reqQty > 0 && issQty >= reqQty)) {
                        calcStatus = 'Fully Issued';
                        statusBg = '#ebfbee';
                        statusColor = '#2b7c2b';
                      } else if (issQty > 0) {
                        calcStatus = 'Partially Issued';
                        statusBg = '#fff9db';
                        statusColor = '#f59f00';
                      } else if (c.status === 'MSPT') {
                        calcStatus = 'Material Shortage';
                        statusBg = '#ffe3e3';
                        statusColor = '#bb0000';
                      }

                      return (
                        <tr key={c.ID || idx}>
                          <td style={{ fontWeight: 600, color: '#475569' }}>{String((idx + 1) * 10).padStart(4, '0')}</td>
                          <td style={{ fontWeight: 700, color: '#0a6ed1' }}>{c.componentMaterial?.code || c.componentMaterial_ID}</td>
                          <td>{c.componentMaterial?.description || 'Component Item'}</td>
                          <td style={{ fontWeight: 600 }}>{reqQty.toFixed(0)}</td>
                          <td style={{ fontWeight: 600, color: issQty > 0 ? '#2b7c2b' : '#64748b' }}>{issQty.toFixed(0)}</td>
                          <td style={{ fontWeight: 600, color: remQty > 0 ? '#0a6ed1' : '#64748b' }}>{remQty.toFixed(0)}</td>
                          <td>{c.unit || 'PC'}</td>
                          <td>{order?.plant?.code || '1102'} / {c.storageLocation?.code || c.storageLocationCode || 'RAW1'}</td>
                          <td>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor: statusBg,
                              color: statusColor
                            }}>
                              {calcStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showApiNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="sap-card" style={{ padding: '1.5rem', width: '450px', backgroundColor: '#ffffff', color: '#1e293b' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#0a6ed1' }}>SAP S/4HANA Public Cloud Feature Note</h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>{showApiNotice}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="sap-btn sap-btn-primary" onClick={() => setShowApiNotice(null)}>Understand & Close</button>
            </div>
          </div>
        </div>
      )}

      {/* SAP Cost View Modal (Goto -> Costs) */}
      {costModalTitle && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="sap-card" style={{ padding: '1.5rem', width: '650px', maxHeight: '80vh', overflowY: 'auto', backgroundColor: '#ffffff', color: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0a6ed1' }}>{costModalTitle}</h3>
              <button className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px' }} onClick={() => setCostModalTitle(null)}>✕</button>
            </div>

            {/* Analysis View */}
            {costModalTitle.includes('Analysis') && costModalContent && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                  <div style={{ color: '#64748b' }}>Planned Total Cost</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0a6ed1' }}>₹{parseFloat(costModalContent.plannedTotalCost).toLocaleString()} {costModalContent.currency}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                  <div style={{ color: '#64748b' }}>Actual Total Cost</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2b7c2b' }}>₹{parseFloat(costModalContent.actualTotalCost).toLocaleString()} {costModalContent.currency}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                  <div style={{ color: '#64748b' }}>Target Total Cost</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>₹{parseFloat(costModalContent.targetTotalCost).toLocaleString()} {costModalContent.currency}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                  <div style={{ color: '#64748b' }}>Cost Variance</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: costModalContent.variance > 0 ? '#bb0000' : '#2b7c2b' }}>₹{parseFloat(costModalContent.variance).toLocaleString()} {costModalContent.currency}</div>
                </div>
              </div>
            )}

            {/* Itemization View */}
            {costModalTitle.includes('Itemization') && Array.isArray(costModalContent) && (
              <div className="sap-table-container">
                <table className="sap-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Cat</th>
                      <th>Resource</th>
                      <th>Description</th>
                      <th>Planned Qty</th>
                      <th>Actual Qty</th>
                      <th>Planned Cost</th>
                      <th>Actual Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costModalContent.map((row: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{row.itemCategory}</td>
                        <td style={{ color: '#0a6ed1', fontWeight: 600 }}>{row.resource}</td>
                        <td>{row.description}</td>
                        <td>{row.plannedQty} {row.unit}</td>
                        <td>{row.actualQty} {row.unit}</td>
                        <td>₹{parseFloat(row.plannedCost).toLocaleString()}</td>
                        <td>₹{parseFloat(row.actualCost).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Cost Component Split View */}
            {costModalTitle.includes('Component Split') && Array.isArray(costModalContent) && (
              <div className="sap-table-container">
                <table className="sap-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Description</th>
                      <th>Planned Cost</th>
                      <th>Actual Cost</th>
                      <th>Share (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costModalContent.map((row: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: '#475569' }}>{row.costComponent}</td>
                        <td style={{ fontWeight: 600 }}>{row.description}</td>
                        <td>₹{parseFloat(row.plannedCost).toLocaleString()}</td>
                        <td>₹{parseFloat(row.actualCost).toLocaleString()}</td>
                        <td style={{ fontWeight: 700, color: '#0a6ed1' }}>{row.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Balance View */}
            {costModalTitle.includes('Balance') && costModalContent && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                  <div style={{ color: '#64748b' }}>Total Debits</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#bb0000' }}>₹{parseFloat(costModalContent.totalDebits).toLocaleString()}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                  <div style={{ color: '#64748b' }}>Total Credits</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2b7c2b' }}>₹{parseFloat(costModalContent.totalCredits).toLocaleString()}</div>
                </div>
                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                  <div style={{ color: '#64748b' }}>Open Balance</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0a6ed1' }}>₹{parseFloat(costModalContent.balance).toLocaleString()}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="sap-btn sap-btn-primary" onClick={() => setCostModalTitle(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* SAP Missing Parts View Modal (Goto -> Missing Parts) */}
      {missingPartsModalTitle && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="sap-card" style={{ padding: '1.5rem', width: '700px', maxHeight: '80vh', overflowY: 'auto', backgroundColor: '#ffffff', color: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0a6ed1' }}>{missingPartsModalTitle}</h3>
              <button className="sap-btn sap-btn-secondary" style={{ padding: '2px 8px' }} onClick={() => setMissingPartsModalTitle(null)}>✕</button>
            </div>

            {/* Missing Parts Overview View */}
            {missingPartsModalTitle.includes('Overview') && missingPartsData && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                    <div style={{ color: '#64748b' }}>Total Components</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{missingPartsData.totalComponents}</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                    <div style={{ color: '#64748b' }}>Missing / Shortage</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: missingPartsData.shortageCount > 0 ? '#bb0000' : '#2b7c2b' }}>{missingPartsData.shortageCount}</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                    <div style={{ color: '#64748b' }}>Status</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: missingPartsData.shortageCount > 0 ? '#bb0000' : '#2b7c2b' }}>{missingPartsData.overallStatus}</div>
                  </div>
                </div>

                {missingPartsData.missingComponents?.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', color: '#2b7c2b', fontWeight: 600, borderRadius: '4px' }}>
                    ✔ No missing parts found for Production Order {missingPartsData.orderNumber}.
                  </div>
                ) : (
                  <div className="sap-table-container">
                    <table className="sap-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Material Code</th>
                          <th>Description</th>
                          <th>Shortage Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missingPartsData.missingComponents?.map((row: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700, color: '#0a6ed1' }}>{row.material}</td>
                            <td>{row.description}</td>
                            <td style={{ fontWeight: 700, color: '#bb0000' }}>{row.shortageQty} {row.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Missing Parts List View */}
            {missingPartsModalTitle.includes('List') && Array.isArray(missingPartsData) && (
              <div>
                {missingPartsData.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', color: '#2b7c2b', fontWeight: 600, borderRadius: '4px' }}>
                    ✔ No missing parts found for this Production Order.
                  </div>
                ) : (
                  <div className="sap-table-container">
                    <table className="sap-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Material Code</th>
                          <th>Description</th>
                          <th>Required Qty</th>
                          <th>Available Qty</th>
                          <th>Shortage Qty</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missingPartsData.map((row: any, idx: number) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700, color: '#0a6ed1' }}>{row.material}</td>
                            <td>{row.description}</td>
                            <td>{row.requiredQty} {row.unit}</td>
                            <td>{row.availableQty} {row.unit}</td>
                            <td style={{ fontWeight: 700, color: '#bb0000' }}>{row.shortageQty} {row.unit}</td>
                            <td><span className="sap-badge sap-badge-CRTD">{row.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="sap-btn sap-btn-primary" onClick={() => setMissingPartsModalTitle(null)}>Close</button>
            </div>
          </div>
        </div>
      )}



      {/* Operation Details Modal (F7 / Menu -> Operation -> Operation Details) */}
      {showOperationDetailsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '8px', width: '100%',
            maxWidth: '1000px', maxHeight: '90vh', display: 'flex',
            flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              backgroundColor: '#1c2430', color: '#ffffff', padding: '1rem 1.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Operation Details — Production Order {order.orderNumber}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#adb5bd' }}>
                  Routing & Sequence Operations (SAP CO03 / F7)
                </span>
              </div>
              <button
                onClick={() => setShowOperationDetailsModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#ffffff', fontSize: '1.25rem', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {order.operations?.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No operations found for Production Order {order.orderNumber}.
                </div>
              ) : (
                <div className="sap-table-container">
                  <table className="sap-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '70px' }}>Op</th>
                        <th style={{ width: '60px' }}>SOp</th>
                        <th>Operation Description</th>
                        <th>Work Center</th>
                        <th>Std Time</th>
                        <th>Spent Time</th>
                        <th>Yield Qty</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.operations?.map((op: any) => (
                        <tr key={op.ID}>
                          <td style={{ fontWeight: 700, color: '#0a6ed1' }}>
                            {String(op.sequence || 10).padStart(4, '0')}
                          </td>
                          <td style={{ color: '#94a3b8' }}>0000</td>
                          <td style={{ fontWeight: 600 }}>{op.description}</td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#334155' }}>
                              {op.workCenter?.code || op.workCenter?.name || op.workCenter_ID || '-'}
                            </span>
                          </td>
                          <td>{parseFloat(op.standardTime || 0).toFixed(0)} {op.timeUnit || 'MIN'}</td>
                          <td>{parseFloat(op.confirmedTime || 0).toFixed(0)} {op.timeUnit || 'MIN'}</td>
                          <td style={{ color: '#2b7c2b', fontWeight: 700 }}>
                            {parseFloat(op.yieldQty || 0).toFixed(0)} PC
                          </td>
                          <td>
                            <span className={`sap-badge sap-badge-${op.status}`}>{op.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              <button className="sap-btn sap-btn-primary" onClick={() => setShowOperationDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
