import cds from '@sap/cds';
import OrderRepository from './repositories/OrderRepository.js';
import MaterialRepository from './repositories/MaterialRepository.js';

const orderRepo = new OrderRepository();
const materialRepo = new MaterialRepository();

export default class ProductionService extends cds.ApplicationService {
    async init() {

        // ----------------------------------------------------------------
        // Connect to the three SAP on-premises OData services
        // Credentials and URLs are resolved from package.json / .env
        // ----------------------------------------------------------------
        const sapOrderSrv       = await cds.connect.to('ZAPI_PRODUCTION_ORDER_2_SRV');
        const sapMatDocSrv      = await cds.connect.to('ZAPI_MATERIAL_DOCUMENT_SRV');
        const sapConfirmSrv     = await cds.connect.to('API_PROD_ORDER_CONFIRMATION_2_SRV');

        // ----------------------------------------------------------------
        // SAP OData entity references
        // ----------------------------------------------------------------
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
            ProdnOrdConf2,
            ProdnOrdConfMatlDocItm
        } = sapConfirmSrv.entities;

        // ----------------------------------------------------------------
        // Helper: map SAP status codes → local portal status codes
        // ----------------------------------------------------------------
        const mapSapStatus = (sapStatus = '') => {
            const s = sapStatus.toUpperCase().trim();
            if (s.includes('REL'))   return 'REL';
            if (s.includes('PCNF'))  return 'PCNF';
            if (s.includes('CNF'))   return 'CNF';
            if (s.includes('DLV'))   return 'DLV';
            if (s.includes('TECO'))  return 'TECO';
            if (s.includes('CRTD'))  return 'CRTD';
            return 'CRTD';
        };

        // ----------------------------------------------------------------
        // Helper: generate a Material Document via SAP
        // movementType: '101' = GR, '261' = GI, '350' = QM Block
        // ----------------------------------------------------------------
        const postSapMaterialDocument = async ({ orderNumber, material, plant, storageLocation, movementType, quantity, unit, headerText }) => {
            try {
                const payload = {
                    DocumentDate  : new Date().toISOString().split('T')[0],
                    PostingDate   : new Date().toISOString().split('T')[0],
                    HeaderText    : headerText || `Posted by Order Management Portal`,
                    GoodsMovementCode: movementType === '101' ? '01' : '02',
                    items: [{
                        Material           : material,
                        Plant              : plant,
                        StorageLocation    : storageLocation || '',
                        GoodsMovementType  : movementType,
                        QuantityInBaseUnit : quantity,
                        BaseUnit           : unit || 'PC',
                        ManufacturingOrder : orderNumber,
                        ManufacturingOrderItem: '0001',
                        ItemText           : `Mvt ${movementType} for order ${orderNumber}`
                    }]
                };
                const result = await sapMatDocSrv.post(A_MaterialDocumentHeader, payload);
                return result;
            } catch (err) {
                console.error(`[SAP] Material Document POST failed (mvt ${movementType}):`, err.message);
                throw err;
            }
        };

        // ----------------------------------------------------------------
        // BEFORE CREATE ORDER: Validate, assign DRAFT status
        // ----------------------------------------------------------------
        this.before('CREATE', 'ProductionOrders', async (req) => {
            const order = req.data;
            if (!order.status) {
                order.status = 'DRAFT';
            }
            if (order.targetQty <= 0) {
                return req.error(400, 'Order Target Quantity must be greater than zero.');
            }

            // When creating directly in CRTD status: explode BOM + Routing from local master data
            // then mirror the order header to SAP
            if (order.status === 'CRTD') {
                await this._explodeBOMAndRouting(order, req);
                await this._syncOrderToSAP(sapOrderSrv, A_ProductionOrder_2, order);
            }
        });

        // ----------------------------------------------------------------
        // BEFORE UPDATE ORDER: Explode BOM/Routing on DRAFT→CRTD transition
        // ----------------------------------------------------------------
        this.before('UPDATE', 'ProductionOrders', async (req) => {
            const orderUpdates = req.data;
            if (!orderUpdates.ID) return;

            const existingOrder = await orderRepo.selectById(orderUpdates.ID);
            if (!existingOrder) return;

            // Transition from DRAFT to CRTD
            if (existingOrder.status === 'DRAFT' && orderUpdates.status === 'CRTD') {
                const fullOrder = { ...existingOrder, ...orderUpdates };
                await this._explodeBOMAndRouting(fullOrder, req);
                orderUpdates.orderNumber = fullOrder.orderNumber;
                orderUpdates.operations  = fullOrder.operations;
                orderUpdates.components  = fullOrder.components;

                // Mirror to SAP after exploding
                await this._syncOrderToSAP(sapOrderSrv, A_ProductionOrder_2, fullOrder);
            }
        });

        // ----------------------------------------------------------------
        // ACTION: Check Material Availability (ATP check via SAP components)
        // ----------------------------------------------------------------
        this.on('checkMaterialAvailability', async (req) => {
            const { orderId } = req.data;

            const order = await orderRepo.selectWithOperationsAndComponents(orderId);
            if (!order) {
                return req.error(404, `Production Order with ID ${orderId} not found.`);
            }

            if (order.status !== 'CRTD' && order.status !== 'MACA') {
                return req.error(400, `Material check only allowed in CRTD or MACA status. Current status is ${order.status}.`);
            }

            let shortageCount = 0;

            // ----- Fetch live component availability from SAP -----
            let sapComponents = [];
            try {
                sapComponents = await sapOrderSrv.run(
                    SELECT.from(A_ProductionOrderComponent_2)
                          .where({ ManufacturingOrder: order.orderNumber })
                );
            } catch (err) {
                console.warn('[SAP] Could not fetch components from SAP, falling back to local data:', err.message);
            }

            // Cross-reference SAP withdrawn quantities with required quantities
            for (const component of order.components) {
                const sapComp = sapComponents.find(c => c.Material === component.componentMaterialCode);
                let hasShortage;

                if (sapComp) {
                    // Use live SAP stock data: required vs withdrawn
                    hasShortage = parseFloat(sapComp.RequiredQuantity) > parseFloat(sapComp.WithdrawnQuantity + (sapComp.WithdrawnQuantity || 0));
                } else {
                    // Fallback: check local GoodsMovements ledger
                    const movements = await SELECT.from('sap.production.portal.GoodsMovements')
                        .where({
                            material_ID: component.componentMaterial_ID,
                            plant_ID: order.plant_ID
                        });

                    let currentStock = 0;
                    for (const mov of movements) {
                        if (mov.movementType === '101' || mov.movementType === '561') {
                            currentStock += parseFloat(mov.quantity);
                        } else if (mov.movementType === '261' || mov.movementType === '551') {
                            currentStock -= parseFloat(mov.quantity);
                        }
                    }
                    hasShortage = currentStock < parseFloat(component.requiredQty);
                }

                const componentStatus = hasShortage ? 'MSPT' : 'RESV';
                if (hasShortage) shortageCount++;

                await UPDATE('sap.production.portal.OrderComponents')
                    .set({ status: componentStatus })
                    .where({ ID: component.ID });
            }

            // Update order status to MACA
            await UPDATE('sap.production.portal.ProductionOrders')
                .set({ status: 'MACA' })
                .where({ ID: order.ID });

            const notifMsg = shortageCount > 0
                ? `Material availability check completed for Order ${order.orderNumber}. Found shortage in ${shortageCount} component(s).`
                : `Material availability check completed for Order ${order.orderNumber}. All components are fully available.`;

            await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                type: shortageCount > 0 ? 'ALERT' : 'INFO',
                order_ID: order.ID,
                message: notifMsg,
                isRead: false
            });

            await this._logAudit(req.headers['x-user-id'], 'CHECK_ATP', 'ProductionOrders', order.ID,
                JSON.stringify({ status: order.status }),
                JSON.stringify({ status: 'MACA', shortageCount })
            );

            return { success: true, shortageCount };
        });

        // ----------------------------------------------------------------
        // ACTION: Release Production Order (POST to SAP)
        // ----------------------------------------------------------------
        this.on('releaseOrder', async (req) => {
            const { orderId } = req.data;
            const order = await orderRepo.selectById(orderId);
            if (!order) return req.error(404, `Order ${orderId} not found.`);

            if (order.status !== 'CRTD' && order.status !== 'MACA') {
                return req.error(400, `Cannot release order in status ${order.status}. Must be in CRTD or MACA.`);
            }

            // ----- Release on SAP -----
            try {
                // SAP Release is triggered by PATCH on ManufacturingOrderStatus
                await sapOrderSrv.run(
                    UPDATE(A_ProductionOrder_2)
                        .set({ ManufacturingOrderStatus: 'REL' })
                        .where({ ManufacturingOrder: order.orderNumber })
                );
            } catch (err) {
                console.warn('[SAP] Could not release order on SAP, updating local status only:', err.message);
            }

            // Update local status
            await UPDATE('sap.production.portal.ProductionOrders')
                .set({ status: 'REL' })
                .where({ ID: order.ID });

            await UPDATE('sap.production.portal.OrderOperations')
                .set({ status: 'REL' })
                .where({ order_ID: order.ID });

            await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                type: 'INFO',
                order_ID: order.ID,
                message: `Production Order ${order.orderNumber} released for execution.`,
                isRead: false
            });

            await this._logAudit(req.headers['x-user-id'], 'RELEASE_ORDER', 'ProductionOrders', order.ID,
                JSON.stringify({ status: order.status }),
                JSON.stringify({ status: 'REL' })
            );

            return { success: true, status: 'REL' };
        });

        // ----------------------------------------------------------------
        // ACTION: Start Production Execution
        // ----------------------------------------------------------------
        this.on('startOrder', async (req) => {
            const { orderId } = req.data;
            const order = await orderRepo.selectById(orderId);
            if (!order) return req.error(404, `Order ${orderId} not found.`);

            if (order.status !== 'REL') {
                return req.error(400, `Cannot start order in status ${order.status}. Must be in REL.`);
            }

            const startDate = new Date().toISOString();

            await UPDATE('sap.production.portal.ProductionOrders')
                .set({ status: 'STRT', actualStartDate: startDate })
                .where({ ID: order.ID });

            const firstOp = await SELECT.one.from('sap.production.portal.OrderOperations')
                .where({ order_ID: order.ID })
                .orderBy('sequence asc');

            if (firstOp) {
                await UPDATE('sap.production.portal.OrderOperations')
                    .set({ status: 'STRT' })
                    .where({ ID: firstOp.ID });
            }

            await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                type: 'INFO',
                order_ID: order.ID,
                message: `Manufacturing execution started for Order ${order.orderNumber}.`,
                isRead: false
            });

            await this._logAudit(req.headers['x-user-id'], 'START_ORDER', 'ProductionOrders', order.ID,
                JSON.stringify({ status: 'REL' }),
                JSON.stringify({ status: 'STRT' })
            );

            return { success: true, status: 'STRT' };
        });

        // ----------------------------------------------------------------
        // ACTION: Confirm Operation — POST to SAP ProdnOrdConf2
        // ----------------------------------------------------------------
        this.on('confirmOperation', async (req) => {
            const { orderId, operationId, yieldQty, scrapQty, timeSpent, isFinalConfirmation } = req.data;

            const order = await orderRepo.selectWithOperationsAndComponents(orderId);
            if (!order) return req.error(404, `Order ${orderId} not found.`);

            const op = order.operations.find(o => o.ID === operationId);
            if (!op) return req.error(404, `Operation ${operationId} not found on this order.`);

            if (op.status === 'CNF') {
                return req.error(400, `Operation ${op.sequence} is already fully confirmed.`);
            }

            // Sequence Check
            const priorOps    = order.operations.filter(o => o.sequence < op.sequence);
            const openPriorOps = priorOps.filter(o => o.status !== 'CNF');
            if (openPriorOps.length > 0) {
                return req.error(400, `Cannot confirm operation ${op.sequence}. Previous operation ${openPriorOps[0].sequence} is not confirmed.`);
            }

            // Tolerance Check
            const maxAllowed        = parseFloat(order.targetQty) * 1.10;
            const newCumulativeYield = parseFloat(op.yieldQty) + parseFloat(yieldQty);
            if (newCumulativeYield > maxAllowed) {
                return req.error(400, `Confirmed yield (${newCumulativeYield}) exceeds target quantity (${order.targetQty}) plus 10% tolerance.`);
            }

            // ----- POST confirmation to SAP -----
            let sapConfirmationCounter = null;
            try {
                const confPayload = {
                    ManufacturingOrder          : order.orderNumber,
                    ManufacturingOrderOperation  : String(op.sequence).padStart(4, '0'),
                    ManufacturingOrderSequence   : '000001',
                    ConfirmedYieldQuantity       : parseFloat(yieldQty),
                    ConfirmedScrapQuantity       : parseFloat(scrapQty),
                    ConfirmedWorkQuantity        : parseFloat(timeSpent),
                    ConfirmationWorkQuantityUnit : op.timeUnit || 'MIN',
                    IsFinalConfirmation          : isFinalConfirmation,
                    ConfirmationText             : `Confirmed by portal user ${req.headers['x-user-id'] || 'unknown'}`,
                    Plant                        : order.plantCode || ''
                };

                const sapResult = await sapConfirmSrv.post(ProdnOrdConf2, confPayload);
                sapConfirmationCounter = sapResult?.ConfirmationCounter;
                console.log(`[SAP] Confirmation posted. Counter: ${sapConfirmationCounter}`);
            } catch (err) {
                console.warn('[SAP] Confirmation POST failed, continuing with local update:', err.message);
            }

            const targetOpStatus = isFinalConfirmation ? 'CNF' : 'PCNF';
            const oldOpValues    = { status: op.status, yieldQty: op.yieldQty, scrapQty: op.scrapQty, confirmedTime: op.confirmedTime };

            await UPDATE('sap.production.portal.OrderOperations')
                .set({
                    status       : targetOpStatus,
                    yieldQty     : newCumulativeYield,
                    scrapQty     : parseFloat(op.scrapQty) + parseFloat(scrapQty),
                    confirmedTime: parseFloat(op.confirmedTime) + parseFloat(timeSpent)
                })
                .where({ ID: op.ID });

            // ----- Backflush GI via SAP if final confirmation -----
            if (isFinalConfirmation) {
                for (const comp of order.components) {
                    if (comp.issuedQty < comp.requiredQty) {
                        const issueQty = parseFloat(comp.requiredQty) - parseFloat(comp.issuedQty);

                        try {
                            // Post GI 261 via SAP Material Document API
                            await postSapMaterialDocument({
                                orderNumber    : order.orderNumber,
                                material       : comp.componentMaterialCode || comp.componentMaterial_ID,
                                plant          : order.plantCode || '',
                                storageLocation: order.storageLocationCode || '',
                                movementType   : '261',
                                quantity       : issueQty,
                                unit           : comp.unit,
                                headerText     : `GI backflush for order ${order.orderNumber}`
                            });
                        } catch (err) {
                            console.warn(`[SAP] GI 261 failed for component ${comp.componentMaterial_ID}:`, err.message);
                        }

                        // Mirror to local GoodsMovements
                        await INSERT.into('sap.production.portal.GoodsMovements').entries({
                            movementNumber  : 'GI' + Math.floor(100000 + Math.random() * 900000),
                            order_ID        : order.ID,
                            material_ID     : comp.componentMaterial_ID,
                            plant_ID        : order.plant_ID,
                            storageLocation_ID: order.storageLocation_ID,
                            movementType    : '261',
                            quantity        : issueQty,
                            unit            : comp.unit,
                            postingDate     : new Date().toISOString().split('T')[0]
                        });

                        await UPDATE('sap.production.portal.OrderComponents')
                            .set({ issuedQty: comp.requiredQty, status: 'ISSD' })
                            .where({ ID: comp.ID });
                    }
                }
            }

            // Check if all operations are confirmed
            const updatedOps   = await SELECT.from('sap.production.portal.OrderOperations').where({ order_ID: order.ID });
            const allConfirmed = updatedOps.every(o => o.status === 'CNF');
            let finalOrderStatus = allConfirmed ? 'CNF' : 'PCNF';

            if (allConfirmed) {
                const lotNum = '04' + Math.floor(1000000000 + Math.random() * 9000000000);

                await INSERT.into('sap.production.portal.QualityInspectionLots').entries({
                    lotNumber    : lotNum,
                    order_ID     : order.ID,
                    material_ID  : order.material_ID,
                    plant_ID     : order.plant_ID,
                    lotQty       : newCumulativeYield,
                    inspectedQty : 0,
                    approvedQty  : 0,
                    rejectedQty  : 0,
                    usageDecision: '',
                    status       : 'CRTD'
                });

                finalOrderStatus = 'INSP';

                await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                    type    : 'ALERT',
                    order_ID: order.ID,
                    message : `Operation confirmations complete. Quality Inspection Lot ${lotNum} generated. Order is on Quality Hold.`,
                    isRead  : false
                });
            }

            await UPDATE('sap.production.portal.ProductionOrders')
                .set({ status: finalOrderStatus })
                .where({ ID: order.ID });

            await this._logAudit(req.headers['x-user-id'], 'CONFIRM_OP', 'OrderOperations', op.ID,
                JSON.stringify(oldOpValues),
                JSON.stringify({ status: targetOpStatus, yieldQty: newCumulativeYield, sapConfirmationCounter })
            );

            return { success: true, status: targetOpStatus };
        });

        // ----------------------------------------------------------------
        // ACTION: Record Quality Inspection Usage Decision
        // ----------------------------------------------------------------
        this.on('submitUsageDecision', async (req) => {
            const { lotId, approvedQty, rejectedQty, usageDecision } = req.data;

            const lot = await SELECT.one.from('sap.production.portal.QualityInspectionLots').where({ ID: lotId });
            if (!lot) return req.error(404, `Inspection Lot ${lotId} not found.`);

            if (lot.status === 'COMP') {
                return req.error(400, 'Usage decision has already been submitted for this inspection lot.');
            }

            const totalPost = parseFloat(approvedQty) + parseFloat(rejectedQty);
            if (totalPost !== parseFloat(lot.lotQty)) {
                return req.error(400, `Sum of Approved (${approvedQty}) and Rejected (${rejectedQty}) must equal Inspection Lot quantity (${lot.lotQty}).`);
            }

            await UPDATE('sap.production.portal.QualityInspectionLots')
                .set({ status: 'COMP', approvedQty, rejectedQty, usageDecision, decisionDate: new Date().toISOString() })
                .where({ ID: lot.ID });

            const order = await orderRepo.selectById(lot.order_ID);

            if (usageDecision === 'UDAC') {
                await UPDATE('sap.production.portal.ProductionOrders')
                    .set({ status: 'CNF' })
                    .where({ ID: lot.order_ID });

                await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                    type    : 'INFO',
                    order_ID: lot.order_ID,
                    message : `Quality Inspection approved. Production Order ${order.orderNumber} is released for Goods Receipt.`,
                    isRead  : false
                });
            } else {
                // ----- Post rejection to SAP as blocked stock (350) -----
                try {
                    await postSapMaterialDocument({
                        orderNumber    : order.orderNumber,
                        material       : order.materialCode || order.material_ID,
                        plant          : order.plantCode || '',
                        storageLocation: order.storageLocationCode || '',
                        movementType   : '350',
                        quantity       : rejectedQty,
                        unit           : 'PC',
                        headerText     : `QM rejection for order ${order.orderNumber}`
                    });
                } catch (err) {
                    console.warn('[SAP] QM Block 350 posting failed:', err.message);
                }

                // Mirror to local
                await INSERT.into('sap.production.portal.GoodsMovements').entries({
                    movementNumber  : 'QM' + Math.floor(100000 + Math.random() * 900000),
                    order_ID        : lot.order_ID,
                    material_ID     : lot.material_ID,
                    plant_ID        : lot.plant_ID,
                    storageLocation_ID: order.storageLocation_ID,
                    movementType    : '350',
                    quantity        : rejectedQty,
                    unit            : 'PC',
                    postingDate     : new Date().toISOString().split('T')[0]
                });

                await UPDATE('sap.production.portal.ProductionOrders')
                    .set({ status: 'TECO' })
                    .where({ ID: lot.order_ID });

                await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                    type    : 'ALERT',
                    order_ID: lot.order_ID,
                    message : `Quality Inspection failed. ${rejectedQty} units posted to blocked stock. Order ${order.orderNumber} technically completed (TECO).`,
                    isRead  : false
                });
            }

            await this._logAudit(req.headers['x-user-id'], 'USAGE_DECISION', 'QualityInspectionLots', lot.ID,
                JSON.stringify({ status: 'CRTD' }),
                JSON.stringify({ status: 'COMP', usageDecision, approvedQty, rejectedQty })
            );

            return { success: true, status: 'COMP' };
        });

        // ----------------------------------------------------------------
        // ACTION: Post Goods Receipt (GR 101) via SAP Material Document API
        // ----------------------------------------------------------------
        this.on('postGoodsReceipt', async (req) => {
            const { orderId, quantity, slocId } = req.data;

            const order = await orderRepo.selectById(orderId);
            if (!order) return req.error(404, `Production Order ${orderId} not found.`);

            if (order.status !== 'CNF' && order.status !== 'PCNF') {
                return req.error(400, `Goods Receipt not permitted in status ${order.status}. Must be in Confirmed (CNF) state.`);
            }

            const currentDelivered = parseFloat(order.deliveredQty);
            const target           = parseFloat(order.targetQty);
            const proposedTotal    = currentDelivered + parseFloat(quantity);
            const maxAllowed       = target * 1.10;

            if (proposedTotal > maxAllowed) {
                return req.error(400, `Proposed GR quantity (${quantity}) puts cumulative delivery (${proposedTotal}) above target (${target}) + 10% tolerance.`);
            }

            // ----- Post GR 101 to SAP -----
            let docNum = 'GR' + Math.floor(10000000 + Math.random() * 90000000);
            try {
                const sapGR = await postSapMaterialDocument({
                    orderNumber    : order.orderNumber,
                    material       : order.materialCode || order.material_ID,
                    plant          : order.plantCode || '',
                    storageLocation: order.storageLocationCode || '',
                    movementType   : '101',
                    quantity,
                    unit           : 'PC',
                    headerText     : `GR for production order ${order.orderNumber}`
                });
                docNum = sapGR?.MaterialDocument || docNum;
                console.log(`[SAP] GR 101 posted. Material Document: ${docNum}`);
            } catch (err) {
                console.warn('[SAP] GR 101 POST failed, recording locally:', err.message);
            }

            // Mirror to local GoodsMovements
            const slocRecord = slocId ? await SELECT.one.from('sap.production.portal.StorageLocations').where({ ID: slocId }) : null;
            await INSERT.into('sap.production.portal.GoodsMovements').entries({
                movementNumber  : docNum,
                order_ID        : order.ID,
                material_ID     : order.material_ID,
                plant_ID        : order.plant_ID,
                storageLocation_ID: slocId || order.storageLocation_ID,
                movementType    : '101',
                quantity,
                unit            : 'PC',
                postingDate     : new Date().toISOString().split('T')[0]
            });

            const finalDelivered = currentDelivered + parseFloat(quantity);
            const isFullDelivery = finalDelivered >= target;
            const newStatus      = isFullDelivery ? 'DLV' : 'PDLV';

            await UPDATE('sap.production.portal.ProductionOrders')
                .set({
                    deliveredQty : finalDelivered,
                    status       : newStatus,
                    actualEndDate: isFullDelivery ? new Date().toISOString() : null
                })
                .where({ ID: order.ID });

            if (isFullDelivery) {
                await UPDATE('sap.production.portal.ProductionOrders')
                    .set({ status: 'TECO' })
                    .where({ ID: order.ID });

                await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                    type    : 'INFO',
                    order_ID: order.ID,
                    message : `Goods Receipt posted for ${quantity} units. Order fully delivered and technically completed (TECO). SAP Doc: ${docNum}`,
                    isRead  : false
                });
            } else {
                await INSERT.into('sap.production.portal.ProductionNotifications').entries({
                    type    : 'INFO',
                    order_ID: order.ID,
                    message : `Partial Goods Receipt posted for ${quantity} units. Status updated to PDLV. SAP Doc: ${docNum}`,
                    isRead  : false
                });
            }

            await this._logAudit(req.headers['x-user-id'], 'GOODS_RECEIPT', 'ProductionOrders', order.ID,
                JSON.stringify({ deliveredQty: currentDelivered, status: order.status }),
                JSON.stringify({ deliveredQty: finalDelivered, status: isFullDelivery ? 'TECO' : newStatus, sapDoc: docNum })
            );

            return { success: true, docNum };
        });

        await super.init();
    }

    // ----------------------------------------------------------------
    // PRIVATE: Sync order header to SAP (CREATE/PATCH A_ProductionOrder_2)
    // Called when an order transitions to CRTD status
    // ----------------------------------------------------------------
    async _syncOrderToSAP(sapOrderSrv, A_ProductionOrder_2, order) {
        try {
            const payload = {
                ManufacturingOrder        : order.orderNumber,
                ManufacturingOrderType    : 'PP01',
                Material                  : order.materialCode || '',
                MfgOrderPlannedTotalQty   : parseFloat(order.targetQty),
                MfgOrderPlannedStartDate  : order.plannedStartDate || new Date().toISOString().split('T')[0],
                MfgOrderPlannedEndDate    : order.plannedEndDate   || new Date().toISOString().split('T')[0],
                ProductionPlant           : order.plantCode || '',
                StorageLocation           : order.storageLocationCode || ''
            };
            await sapOrderSrv.post(A_ProductionOrder_2, payload);
            console.log(`[SAP] Order ${order.orderNumber} synced to SAP.`);
        } catch (err) {
            console.warn(`[SAP] Could not sync order ${order.orderNumber} to SAP:`, err.message);
        }
    }

    // ----------------------------------------------------------------
    // PRIVATE: Explode BOM and Routing from local master data
    // ----------------------------------------------------------------
    async _explodeBOMAndRouting(order, req) {
        if (!order.orderNumber) {
            const maxOrder = await SELECT.one.from('sap.production.portal.ProductionOrders')
                .columns('max(orderNumber) as maxNum');
            const nextNum  = maxOrder && maxOrder.maxNum
                ? (parseInt(maxOrder.maxNum) + 1).toString()
                : '100000000001';
            order.orderNumber = nextNum;
        }

        const bom = await this._getBOMAndComponents(order.material_ID, order.plant_ID);
        if (!bom) {
            return req.error(400, `No active Bill of Materials (BOM) found for Material ID ${order.material_ID} in Plant ID ${order.plant_ID}.`);
        }

        const routing = await this._getRoutingAndOperations(order.material_ID, order.plant_ID);
        if (!routing) {
            return req.error(400, `No active Routing found for Material ID ${order.material_ID} in Plant ID ${order.plant_ID}.`);
        }

        order.components = bom.components.map(comp => ({
            componentMaterial_ID: comp.componentMaterial_ID,
            requiredQty         : comp.requiredQty * order.targetQty,
            issuedQty           : 0,
            unit                : comp.unit,
            isBackflushed       : false,
            status              : 'RESV'
        }));

        order.operations = routing.operations.map(op => ({
            sequence     : op.sequence,
            workCenter_ID: op.workCenter_ID,
            description  : op.description,
            standardTime : op.standardTime,
            timeUnit     : op.timeUnit,
            confirmedTime: 0,
            yieldQty     : 0,
            scrapQty     : 0,
            status       : 'CRTD'
        }));
    }

    async _getBOMAndComponents(materialId, plantId) {
        return await SELECT.one.from('sap.production.portal.BOMs')
            .where({ material_ID: materialId, plant_ID: plantId })
            .columns(b => { b('*'); b.components(c => { c('*') }); });
    }

    async _getRoutingAndOperations(materialId, plantId) {
        return await SELECT.one.from('sap.production.portal.Routings')
            .where({ material_ID: materialId, plant_ID: plantId })
            .columns(r => { r('*'); r.operations(o => { o('*') }); });
    }

    // ----------------------------------------------------------------
    // PRIVATE: Log event to AuditLogs
    // ----------------------------------------------------------------
    async _logAudit(userId, action, entityName, entityId, oldValues, newValues) {
        try {
            await INSERT.into('sap.production.portal.AuditLogs').entries({
                user_ID   : userId || null,
                action,
                entityName,
                entityId,
                oldValues : oldValues || '',
                newValues : newValues || ''
            });
        } catch (e) {
            console.error('Audit logging failed: ', e);
        }
    }
}
