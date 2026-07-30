import cds from '@sap/cds';

export default class ProductionService extends cds.ApplicationService {
    async init() {
        // Connect to S/4HANA OData services
        const sapOrderSrv   = await cds.connect.to('ZAPI_PRODUCTION_ORDER_2_SRV');
        const sapMatDocSrv  = await cds.connect.to('ZAPI_MATERIAL_DOCUMENT_SRV');
        const sapConfirmSrv = await cds.connect.to('API_PROD_ORDER_CONFIRMATION_2_SRV');

        const {
            A_ProductionOrder_2,
            A_ProductionOrderOperation_2,
            A_ProductionOrderComponent_2,
            A_ProductionOrderStatus_2
        } = sapOrderSrv.entities;

        const {
            A_MaterialDocumentHeader,
            A_MaterialDocumentItem
        } = sapMatDocSrv.entities;

        const {
            ProdnOrdConf2
        } = sapConfirmSrv.entities;

        // Stable deterministic UUID generator based on code
        const uuid = (str) => {
            if (!str) return null;
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            let hex = Math.abs(hash).toString(16).padEnd(8, '0').slice(0, 8);
            return `${hex}-0000-0000-0000-${str.padEnd(12, '0').slice(0, 12)}`;
        };

        const isSet = (flag) => String(flag || '').trim().toUpperCase() === 'X';

        const deriveOrderStatus = (o = {}) => {
            if (isSet(o.OrderIsClosed))                 return 'CLSD';
            if (isSet(o.OrderIsTechnicallyCompleted))   return 'TECO';
            if (isSet(o.OrderIsConfirmed))              return 'CNF';
            if (isSet(o.OrderIsPartiallyConfirmed))     return 'PCNF';
            if (isSet(o.OrderIsReleased))               return 'REL';
            return 'CRTD';
        };

        const deriveOperationStatus = (op = {}, orderStatus = 'CRTD') => {
            if (isSet(op.OperationIsConfirmed))          return 'CNF';
            if (isSet(op.OperationIsPartiallyConfirmed)) return 'PCNF';
            return orderStatus === 'CRTD' ? 'CRTD' : 'REL';
        };

        const deriveComponentStatus = (comp = {}) => {
            const required  = parseFloat(comp.RequiredQuantity)  || 0;
            const withdrawn = parseFloat(comp.WithdrawnQuantity) || 0;
            if (isSet(comp.ReservationIsFinallyIssued)) return 'ISSD';
            if (withdrawn <= 0)                         return 'RESV';
            if (withdrawn >= required)                  return 'ISSD';
            return 'MSPT';
        };

        // Helper: Fetch a single order with operations and components directly from SAP
        const fetchSapOrderFullDetails = async (orderNumber) => {
            const [sapOrder] = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).where({ ManufacturingOrder: orderNumber }));
            if (!sapOrder) return null;

            const sapOps = await sapOrderSrv.run(SELECT.from(A_ProductionOrderOperation_2).where({ ManufacturingOrder: orderNumber }));
            const sapComps = await sapOrderSrv.run(SELECT.from(A_ProductionOrderComponent_2).where({ ManufacturingOrder: orderNumber }));

            const orderStatus = deriveOrderStatus(sapOrder);
            const plantId = uuid(sapOrder.ProductionPlant);
            const materialId = uuid(sapOrder.Material);
            const slocId = uuid(sapOrder.StorageLocation);

            const mappedOrder = {
                ID: uuid(orderNumber),
                orderNumber: orderNumber,
                material_ID: materialId,
                plant_ID: plantId,
                storageLocation_ID: slocId,
                targetQty: parseFloat(sapOrder.TotalQuantity) || 0,
                confirmedQty: parseFloat(sapOrder.MfgOrderConfirmedYieldQty) || 0,
                deliveredQty: parseFloat(sapOrder.MfgOrderConfirmedYieldQty) || 0, // Fallback delivered qty
                status: orderStatus,
                plannedStartDate: sapOrder.MfgOrderPlannedStartDate || null,
                plannedEndDate: sapOrder.MfgOrderPlannedEndDate || null,
                actualStartDate: sapOrder.MfgOrderActualReleaseDate || null,
                actualEndDate: null,
                material: {
                    ID: materialId,
                    code: sapOrder.Material,
                    description: `Finished Material ${sapOrder.Material}`,
                    materialGroup: 'FINISHED',
                    baseUnit: sapOrder.ProductionUnit || 'PC'
                },
                plant: {
                    ID: plantId,
                    code: sapOrder.ProductionPlant,
                    name: `Plant ${sapOrder.ProductionPlant}`
                },
                storageLocation: {
                    ID: slocId,
                    code: sapOrder.StorageLocation,
                    name: `Storage ${sapOrder.StorageLocation}`
                },
                operations: sapOps.map(op => ({
                    ID: uuid(`${orderNumber}-OP-${op.ManufacturingOrderOperation}`),
                    order_ID: uuid(orderNumber),
                    sequence: parseInt(op.ManufacturingOrderOperation) || 0,
                    workCenter_ID: uuid(op.WorkCenter),
                    workCenter: {
                        ID: uuid(op.WorkCenter),
                        code: op.WorkCenter,
                        name: `Work Center ${op.WorkCenter}`
                    },
                    description: op.MfgOrderOperationText || `Operation ${op.ManufacturingOrderOperation}`,
                    standardTime: parseFloat(op.WorkCenterStandardWorkQty1) || 0,
                    timeUnit: op.WorkCenterStandardWorkQtyUnit1 || 'MIN',
                    confirmedTime: parseFloat(op.WorkCenterStandardWorkQty1) || 0, // Placeholder
                    yieldQty: parseFloat(op.OpTotalConfirmedYieldQty) || 0,
                    scrapQty: 0,
                    status: deriveOperationStatus(op, orderStatus)
                })),
                components: sapComps.map(comp => ({
                    ID: uuid(`${orderNumber}-COMP-${comp.Reservation}-${comp.ReservationItem}`),
                    order_ID: uuid(orderNumber),
                    componentMaterial_ID: uuid(comp.Material),
                    componentMaterial: {
                        ID: uuid(comp.Material),
                        code: comp.Material,
                        description: `Component ${comp.Material}`,
                        materialGroup: 'COMPONENT',
                        baseUnit: comp.BaseUnit || 'PC'
                    },
                    requiredQty: parseFloat(comp.RequiredQuantity) || 0,
                    issuedQty: parseFloat(comp.WithdrawnQuantity) || 0,
                    unit: comp.BaseUnit || 'PC',
                    isBackflushed: !!comp.MatlCompIsMarkedForBackflush,
                    status: deriveComponentStatus(comp)
                }))
            };

            return mappedOrder;
        };

        // ================================================================
        // READ: ProductionOrders
        // ================================================================
        this.on('READ', 'ProductionOrders', async (req) => {
            const id = req.data?.ID;
            
            // Check if reading a specific order by UUID (ID)
            if (id) {
                // Find orderNumber from the deterministic UUID hash if possible
                // Otherwise fetch all and match (since we map UUID deterministically, we can scan the top orders)
                const sapOrders = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).limit(100));
                const matched = sapOrders.find(o => uuid(o.ManufacturingOrder) === id);
                if (!matched) return req.error(404, `Order with ID ${id} not found in SAP.`);
                
                const details = await fetchSapOrderFullDetails(matched.ManufacturingOrder);
                return details;
            }

            // Fetch list of orders from SAP in real time
            const sapOrders = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).orderBy('ManufacturingOrder desc').limit(100));
            const mappedList = [];

            for (const sapOrder of sapOrders) {
                const orderStatus = deriveOrderStatus(sapOrder);
                const plantId = uuid(sapOrder.ProductionPlant);
                const materialId = uuid(sapOrder.Material);
                const slocId = uuid(sapOrder.StorageLocation);

                mappedList.push({
                    ID: uuid(sapOrder.ManufacturingOrder),
                    orderNumber: sapOrder.ManufacturingOrder,
                    material_ID: materialId,
                    plant_ID: plantId,
                    storageLocation_ID: slocId,
                    targetQty: parseFloat(sapOrder.TotalQuantity) || 0,
                    confirmedQty: parseFloat(sapOrder.MfgOrderConfirmedYieldQty) || 0,
                    deliveredQty: parseFloat(sapOrder.MfgOrderConfirmedYieldQty) || 0,
                    status: orderStatus,
                    plannedStartDate: sapOrder.MfgOrderPlannedStartDate || null,
                    plannedEndDate: sapOrder.MfgOrderPlannedEndDate || null,
                    actualStartDate: sapOrder.MfgOrderActualReleaseDate || null,
                    actualEndDate: null,
                    material: {
                        ID: materialId,
                        code: sapOrder.Material,
                        description: `Material ${sapOrder.Material}`,
                        materialGroup: 'FINISHED',
                        baseUnit: sapOrder.ProductionUnit || 'PC'
                    },
                    plant: {
                        ID: plantId,
                        code: sapOrder.ProductionPlant,
                        name: `Plant ${sapOrder.ProductionPlant}`
                    },
                    storageLocation: {
                        ID: slocId,
                        code: sapOrder.StorageLocation,
                        name: `Storage ${sapOrder.StorageLocation}`
                    }
                });
            }

            return mappedList;
        });

        // ================================================================
        // READ: OrderOperations
        // ================================================================
        this.on('READ', 'OrderOperations', async (req) => {
            const orderId = req.data?.order_ID;
            if (!orderId) return [];

            // Find orderNumber matching the orderId
            const sapOrders = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).limit(100));
            const matched = sapOrders.find(o => uuid(o.ManufacturingOrder) === orderId);
            if (!matched) return [];

            const details = await fetchSapOrderFullDetails(matched.ManufacturingOrder);
            return details?.operations || [];
        });

        // ================================================================
        // READ: OrderComponents
        // ================================================================
        this.on('READ', 'OrderComponents', async (req) => {
            const orderId = req.data?.order_ID;
            if (!orderId) return [];

            const sapOrders = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).limit(100));
            const matched = sapOrders.find(o => uuid(o.ManufacturingOrder) === orderId);
            if (!matched) return [];

            const details = await fetchSapOrderFullDetails(matched.ManufacturingOrder);
            return details?.components || [];
        });

        // ================================================================
        // READ: GoodsMovements
        // ================================================================
        this.on('READ', 'GoodsMovements', async (req) => {
            const sapDocs = await sapMatDocSrv.run(SELECT.from(A_MaterialDocumentHeader).limit(100));
            const mappedMovements = [];

            for (const doc of sapDocs) {
                const sapItems = await sapMatDocSrv.run(
                    SELECT.from(A_MaterialDocumentItem)
                          .where({ MaterialDocument: doc.MaterialDocument, MaterialDocumentYear: doc.MaterialDocumentYear })
                );

                for (const item of sapItems) {
                    const plantId = uuid(item.Plant);
                    const materialId = uuid(item.Material);
                    const slocId = uuid(item.StorageLocation);
                    const orderId = item.ManufacturingOrder ? uuid(item.ManufacturingOrder) : null;

                    mappedMovements.push({
                        ID: uuid(`${doc.MaterialDocument}-${item.MaterialDocumentItem}`),
                        movementNumber: `${doc.MaterialDocument}-${item.MaterialDocumentItem}`,
                        order_ID: orderId,
                        material_ID: materialId,
                        plant_ID: plantId,
                        storageLocation_ID: slocId,
                        movementType: item.GoodsMovementType || '101',
                        quantity: parseFloat(item.QuantityInBaseUnit) || 0,
                        unit: item.MaterialBaseUnit || 'PC',
                        postingDate: doc.PostingDate || new Date().toISOString().split('T')[0]
                    });
                }
            }
            return mappedMovements;
        });

        // ================================================================
        // READ: Plants
        // ================================================================
        this.on('READ', 'Plants', async (req) => {
            const sapOrders = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).columns('ProductionPlant').limit(100));
            const uniquePlants = [...new Set(sapOrders.map(o => o.ProductionPlant).filter(Boolean))];
            return uniquePlants.map(code => ({
                ID: uuid(code),
                code: code,
                name: `Plant ${code}`,
                description: `SAP Plant ${code}`,
                isSapSynced: true
            }));
        });

        // ================================================================
        // READ: StorageLocations
        // ================================================================
        this.on('READ', 'StorageLocations', async (req) => {
            const sapOrders = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).columns('ProductionPlant', 'StorageLocation').limit(100));
            const uniqueSlocs = [];
            const seen = new Set();
            for (const o of sapOrders) {
                if (o.StorageLocation && o.ProductionPlant) {
                    const key = `${o.ProductionPlant}-${o.StorageLocation}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueSlocs.push({
                            ID: uuid(`${o.ProductionPlant}-${o.StorageLocation}`),
                            code: o.StorageLocation,
                            name: `Storage ${o.StorageLocation}`,
                            plant_ID: uuid(o.ProductionPlant),
                            isSapSynced: true
                        });
                    }
                }
            }
            return uniqueSlocs;
        });

        // ================================================================
        // READ: Materials
        // ================================================================
        this.on('READ', 'Materials', async (req) => {
            const sapOrders = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).columns('Material').limit(100));
            const uniqueMats = [...new Set(sapOrders.map(o => o.Material).filter(Boolean))];
            return uniqueMats.map(code => ({
                ID: uuid(code),
                code: code,
                description: `Finished Material ${code}`,
                materialGroup: 'FINISHED',
                baseUnit: 'PC',
                standardPrice: 0,
                currency: 'USD',
                isActive: true,
                isSapSynced: true
            }));
        });

        // ================================================================
        // READ: WorkCenters
        // ================================================================
        this.on('READ', 'WorkCenters', async (req) => {
            const sapOps = await sapOrderSrv.run(SELECT.from(A_ProductionOrderOperation_2).columns('WorkCenter').limit(1000));
            const uniqueWcs = [...new Set(sapOps.map(op => op.WorkCenter).filter(Boolean))];
            return uniqueWcs.map(code => ({
                ID: uuid(code),
                code: code,
                name: `Work Center ${code}`,
                category: 'Machine'
            }));
        });

        // ================================================================
        // CREATE: ProductionOrders
        // ================================================================
        this.before('CREATE', 'ProductionOrders', async (req) => {
            const order = req.data;
            if (!order.status) {
                order.status = 'DRAFT';
            }
            if (order.targetQty <= 0) {
                return req.error(400, 'Order Target Quantity must be greater than zero.');
            }

            // Resolve plant code and material code dynamically
            const plantRecord = await SELECT.one.from('sap.production.portal.Plants').where({ ID: order.plant_ID });
            const matRecord = await SELECT.one.from('sap.production.portal.Materials').where({ ID: order.material_ID });
            const slocRecord = order.storageLocation_ID ? await SELECT.one.from('sap.production.portal.StorageLocations').where({ ID: order.storageLocation_ID }) : null;

            const plantCode = plantRecord?.code || 'PL01';
            const matCode = matRecord?.code || 'MAT01';
            const slocCode = slocRecord?.code || '';

            if (order.status === 'CRTD') {
                const payload = {
                    ManufacturingOrderType    : cds.env.requires.ZAPI_PRODUCTION_ORDER_2_SRV?.orderType || 'ZPPS',
                    Material                  : matCode,
                    ProductionPlant           : plantCode,
                    StorageLocation           : slocCode,
                    TotalQuantity             : parseFloat(order.targetQty),
                    ProductionUnit            : 'PC',
                    MfgOrderPlannedStartDate  : order.plannedStartDate || new Date().toISOString().split('T')[0],
                    MfgOrderPlannedEndDate    : order.plannedEndDate   || new Date().toISOString().split('T')[0]
                };

                try {
                    const result = await sapOrderSrv.post(A_ProductionOrder_2, payload);
                    order.orderNumber = result.ManufacturingOrder;
                    order.ID = uuid(result.ManufacturingOrder);
                    console.log(`[SAP] Order ${order.orderNumber} created live in SAP S/4HANA Cloud.`);
                } catch (err) {
                    return req.error(500, `SAP S/4HANA Cloud Error: ${err.message}`);
                }
            }
        });

        // ================================================================
        // ACTION: Check Material Availability (ATP Check)
        // ================================================================
        this.on('checkMaterialAvailability', async (req) => {
            const { orderId } = req.data;
            const sapOrders = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).limit(100));
            const matched = sapOrders.find(o => uuid(o.ManufacturingOrder) === orderId);
            if (!matched) return req.error(404, `Order with ID ${orderId} not found in SAP.`);

            let shortageCount = 0;
            let sapComponents = [];
            let sapStatusCodes = [];

            try {
                sapComponents = await sapOrderSrv.run(
                    SELECT.from(A_ProductionOrderComponent_2)
                          .where({ ManufacturingOrder: matched.ManufacturingOrder })
                );

                const statuses = await sapOrderSrv.run(
                    SELECT.from(A_ProductionOrderStatus_2)
                          .where({ ManufacturingOrder: matched.ManufacturingOrder })
                );
                sapStatusCodes = (statuses || [])
                    .map(s => (s.StatusShortName || '').trim())
                    .filter(Boolean);
            } catch (err) {
                console.warn('[SAP] ATP data unavailable from SAP:', err.message);
            }

            for (const comp of sapComponents) {
                const reqQty = parseFloat(comp.RequiredQuantity) || 0;
                const confQty = parseFloat(comp.ConfirmedAvailableQuantity) || 0;
                if (confQty < reqQty) {
                    shortageCount++;
                }
            }

            const sapSaysMissingParts = sapStatusCodes.includes('MSPT') || shortageCount > 0;
            const notifMsg = `Material availability check completed for Order ${matched.ManufacturingOrder}. SAP status: ${sapStatusCodes.join(', ') || 'N/A'}. Shortage count: ${shortageCount}.`;

            await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                type: sapSaysMissingParts ? 'ALERT' : 'INFO',
                order_ID: orderId,
                message: notifMsg,
                isRead: false
            });

            return { success: true, shortageCount };
        });

        // ================================================================
        // ACTION: Release Production Order (POST to SAP)
        // ================================================================
        this.on('releaseOrder', async (req) => {
            const { orderId } = req.data;
            const sapOrders = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).limit(100));
            const matched = sapOrders.find(o => uuid(o.ManufacturingOrder) === orderId);
            if (!matched) return req.error(404, `Order with ID ${orderId} not found in SAP.`);

            try {
                const etag = await this._fetchSapOrderEtag(sapOrderSrv, A_ProductionOrder_2, matched.ManufacturingOrder);
                if (!etag) return req.error(404, `Order ${matched.ManufacturingOrder} not found in SAP.`);

                await sapOrderSrv.send({
                    method : 'POST',
                    path   : `ReleaseOrder?ManufacturingOrder='${encodeURIComponent(matched.ManufacturingOrder)}'`,
                    headers: { 'If-Match': etag }
                });
                console.log(`[SAP] Order ${matched.ManufacturingOrder} released successfully.`);
            } catch (err) {
                return req.error(500, `SAP Release Error: ${err.message}`);
            }

            await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                type: 'INFO',
                order_ID: orderId,
                message: `Production Order ${matched.ManufacturingOrder} released for execution.`,
                isRead: false
            });

            return { success: true, status: 'REL' };
        });

        // ================================================================
        // ACTION: Start Production Execution
        // ================================================================
        this.on('startOrder', async (req) => {
            const { orderId } = req.data;
            const sapOrders = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).limit(100));
            const matched = sapOrders.find(o => uuid(o.ManufacturingOrder) === orderId);
            if (!matched) return req.error(404, `Order with ID ${orderId} not found in SAP.`);

            await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                type: 'INFO',
                order_ID: orderId,
                message: `Manufacturing execution started for Order ${matched.ManufacturingOrder}.`,
                isRead: false
            });

            return { success: true, status: 'STRT' };
        });

        // ================================================================
        // ACTION: Confirm Operation
        // ================================================================
        this.on('confirmOperation', async (req) => {
            const { orderId, operationId, yieldQty, scrapQty, timeSpent, isFinalConfirmation, postingDate } = req.data;

            const sapOrders = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).limit(100));
            const matchedOrder = sapOrders.find(o => uuid(o.ManufacturingOrder) === orderId);
            if (!matchedOrder) return req.error(404, `Order with ID ${orderId} not found in SAP.`);

            const details = await fetchSapOrderFullDetails(matchedOrder.ManufacturingOrder);
            const op = details?.operations?.find(o => o.ID === operationId);
            if (!op) return req.error(404, `Operation not found on SAP order.`);

            try {
                const confirmedBy = await this._resolveUserLabel(req.headers['x-user-id']);
                const confirmationText = `Portal: ${confirmedBy}`.slice(0, 40);

                const confPayload = {
                    OrderID                    : matchedOrder.ManufacturingOrder,
                    Sequence                   : '000000',
                    OrderOperation             : String(op.sequence).padStart(4, '0'),
                    ConfirmationYieldQuantity  : parseFloat(yieldQty),
                    ConfirmationScrapQuantity  : parseFloat(scrapQty),
                    ConfirmationUnit           : 'PC',
                    FinalConfirmationType      : isFinalConfirmation ? 'X' : ' ',
                    IsFinalConfirmation        : isFinalConfirmation,
                    ConfirmationText           : confirmationText,
                    Plant                      : matchedOrder.ProductionPlant || ''
                };

                const workQuantity = parseFloat(timeSpent) || 0;
                if (workQuantity > 0) {
                    confPayload.OpConfirmedWorkQuantity1 = workQuantity;
                    confPayload.OpWorkQuantityUnit1      = 'MIN';
                }

                if (postingDate) {
                    confPayload.PostingDate = postingDate;
                }

                await sapConfirmSrv.post(ProdnOrdConf2, confPayload);
                console.log(`[SAP] Confirmation posted live for Order ${matchedOrder.ManufacturingOrder} Sequence ${op.sequence}.`);
            } catch (err) {
                return req.error(500, `SAP Confirmation Error: ${err.message}`);
            }

            // Generate Quality inspection lot locally if final confirmation
            if (isFinalConfirmation && op.sequence === Math.max(...details.operations.map(o => o.sequence))) {
                const lotNum = '04' + Math.floor(1000000000 + Math.random() * 9000000000);
                await INSERT.into('sap.production.portal.QualityInspectionLots').entries({
                    lotNumber    : lotNum,
                    order_ID     : orderId,
                    material_ID  : uuid(matchedOrder.Material),
                    plant_ID     : uuid(matchedOrder.ProductionPlant),
                    lotQty       : parseFloat(yieldQty),
                    inspectedQty : 0,
                    approvedQty  : 0,
                    rejectedQty  : 0,
                    usageDecision: '',
                    status       : 'CRTD'
                });

                await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                    type    : 'ALERT',
                    order_ID: orderId,
                    message : `Operation confirmations complete. Quality Inspection Lot ${lotNum} generated. Order is on Quality Hold.`,
                    isRead  : false
                });
            }

            return { success: true, status: isFinalConfirmation ? 'CNF' : 'PCNF' };
        });

        // ================================================================
        // Helper: postGoodsReceipt (OData Action)
        // ================================================================
        this.on('postGoodsReceipt', async (req) => {
            const { orderId, quantity, slocId, postingDate } = req.data;

            const sapOrders = await sapOrderSrv.run(SELECT.from(A_ProductionOrder_2).limit(100));
            const matchedOrder = sapOrders.find(o => uuid(o.ManufacturingOrder) === orderId);
            if (!matchedOrder) return req.error(404, `Order with ID ${orderId} not found in SAP.`);

            const slocRecord = slocId ? await SELECT.one.from('sap.production.portal.StorageLocations').where({ ID: slocId }) : null;
            const slocCode = slocRecord?.code || matchedOrder.StorageLocation || '';

            try {
                const today = new Date().toISOString().split('T')[0];
                const postingOn = postingDate || today;

                const payload = {
                    DocumentDate  : postingOn,
                    PostingDate   : postingOn,
                    MaterialDocumentHeaderText: 'Portal Goods Receipt',
                    GoodsMovementCode: '02',
                    to_MaterialDocumentItem: [{
                        Material           : matchedOrder.Material,
                        Plant              : matchedOrder.ProductionPlant,
                        StorageLocation    : slocCode,
                        GoodsMovementType  : '101',
                        QuantityInEntryUnit: parseFloat(quantity),
                        EntryUnit          : 'PC',
                        ManufacturingOrder : matchedOrder.ManufacturingOrder,
                        GoodsMovementRefDocType: 'F',
                        MaterialDocumentItemText: `GR via Portal`
                    }]
                };

                const sapGR = await sapMatDocSrv.post(A_MaterialDocumentHeader, payload);
                const docNum = sapGR?.MaterialDocument || 'GR-POSTED';

                await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                    type    : 'INFO',
                    order_ID: orderId,
                    message : `Goods Receipt posted for ${quantity} units. SAP Doc: ${docNum}`,
                    isRead  : false
                });

                return { success: true, docNum };
            } catch (err) {
                return req.error(500, `SAP Goods Receipt Error: ${err.message}`);
            }
        });

        await super.init();
    }

    async _fetchSapOrderEtag(sapOrderSrv, A_ProductionOrder_2, orderNumber) {
        const sapOrder = await sapOrderSrv.run(
            SELECT.one.from(A_ProductionOrder_2)
                .columns('ManufacturingOrder', 'LastChangeDateTime')
                .where({ ManufacturingOrder: orderNumber })
        );
        return sapOrder?.LastChangeDateTime ? `W/"'${sapOrder.LastChangeDateTime}'"` : null;
    }

    async _resolveUserLabel(userId) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || '')) {
            return 'portal';
        }
        try {
            const user = await SELECT.one.from('sap.production.portal.Users')
                .columns('username', 'name')
                .where({ ID: userId });
            return user?.username || user?.name || 'portal';
        } catch {
            return 'portal';
        }
    }
}
