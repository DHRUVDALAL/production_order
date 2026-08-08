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
        // Ensure actual S/4HANA Master Data is seeded and marked as isSapSynced
        // ----------------------------------------------------------------
        await (async () => {
            try {
                // Seed actual SAP plants
                const plants = [
                    { ID: 'a60288fc-d4cd-4267-83c4-6a3ad7079143', code: '1102', name: 'Plant 1102', description: 'SAP Plant 1102', location: '', isSapSynced: true },
                    { ID: '9c111735-4ba3-4f12-aad9-878e06f40e38', code: '1105', name: 'Plant 1105', description: 'SAP Plant 1105', location: '', isSapSynced: true }
                ];
                for (const p of plants) {
                    const existing = await SELECT.one.from('sap.production.portal.Plants').where({ code: p.code });
                    if (!existing) {
                        await INSERT.into('sap.production.portal.Plants').entries(p);
                    }
                }

                // Seed actual SAP storage locations
                const slocs = [
                    { ID: 'd311e780-d389-4329-85df-f11d53bb7406', code: 'RAW1', name: 'Raw Materials 1', plant_ID: 'a60288fc-d4cd-4267-83c4-6a3ad7079143', isSapSynced: true },
                    { ID: 'ea17a102-bf89-4112-a722-6b94c03ba07c', code: 'SFG1', name: 'Semi-Finished Goods 1', plant_ID: '9c111735-4ba3-4f12-aad9-878e06f40e38', isSapSynced: true }
                ];
                for (const s of slocs) {
                    const existing = await SELECT.one.from('sap.production.portal.StorageLocations').where({ code: s.code, plant_ID: s.plant_ID });
                    if (!existing) {
                        await INSERT.into('sap.production.portal.StorageLocations').entries(s);
                    }
                }

                // Seed actual SAP materials
                const materials = [
                    { ID: '67346951-350e-4b62-953b-574dc301aacc', code: 'RP/24-012-07', description: 'RP/24-012-07', materialGroup: 'FINISHED', baseUnit: 'PC', standardPrice: 0, currency: 'INR', isActive: true, isSapSynced: true, plant_ID: 'a60288fc-d4cd-4267-83c4-6a3ad7079143' },
                    { ID: 'c1674a2b-3129-4700-9852-6b1e620584cc', code: 'RP/24-012-02', description: 'RP/24-012-02', materialGroup: 'FINISHED', baseUnit: 'PC', standardPrice: 0, currency: 'INR', isActive: true, isSapSynced: true, plant_ID: 'a60288fc-d4cd-4267-83c4-6a3ad7079143' },
                    { ID: 'ea6c8734-d4ba-4700-8cc3-92f7b4946399', code: 'RP/24-012-11', description: 'RP/24-012-11', materialGroup: 'FINISHED', baseUnit: 'PC', standardPrice: 0, currency: 'INR', isActive: true, isSapSynced: true, plant_ID: 'a60288fc-d4cd-4267-83c4-6a3ad7079143' },
                    { ID: '8c3b7a5a-8b1e-450f-a99f-4318d1a1b1a1', code: '100320', description: 'Raw Component 100320', materialGroup: 'RAW', baseUnit: 'PC', standardPrice: 0, currency: 'INR', isActive: true, isSapSynced: true, plant_ID: 'a60288fc-d4cd-4267-83c4-6a3ad7079143' },
                    { ID: '7b5e43a6-b51f-45c1-90a8-b5e1b10a26ef', code: '100019', description: 'Raw Component 100019', materialGroup: 'RAW', baseUnit: 'PC', standardPrice: 0, currency: 'INR', isActive: true, isSapSynced: true, plant_ID: 'a60288fc-d4cd-4267-83c4-6a3ad7079143' }
                ];
                for (const m of materials) {
                    const existing = await SELECT.one.from('sap.production.portal.Materials').where({ code: m.code, plant_ID: m.plant_ID });
                    if (!existing) {
                        await INSERT.into('sap.production.portal.Materials').entries(m);
                    }
                }
            } catch (err) {
                console.error('[BOOTSTRAP SEED ERROR]', err);
            }
        })();

        // ----------------------------------------------------------------
        // Helper: derive a portal status from the Public Cloud order header
        // flags. S/4HANA Public Cloud exposes no ManufacturingOrderStatus
        // field — status is a set of 'X'/'' indicators. Most-advanced wins.
        // ----------------------------------------------------------------
        const isSet = (flag) => String(flag || '').trim().toUpperCase() === 'X';

        const deriveOrderStatus = (o = {}) => {
            if (isSet(o.OrderIsClosed))                 return 'CLSD';
            if (isSet(o.OrderIsTechnicallyCompleted))   return 'TECO';
            if (isSet(o.OrderIsConfirmed))              return 'CNF';
            if (isSet(o.OrderIsPartiallyConfirmed))     return 'PCNF';
            if (isSet(o.OrderIsReleased))               return 'REL';
            return 'CRTD';
        };

        // Operations expose only two confirmation flags, no status code.
        const deriveOperationStatus = (op = {}, orderStatus = 'CRTD') => {
            if (isSet(op.OperationIsConfirmed))          return 'CNF';
            if (isSet(op.OperationIsPartiallyConfirmed)) return 'PCNF';
            return orderStatus === 'CRTD' ? 'CRTD' : 'REL';
        };

        // Components expose no status code — derive from withdrawn vs required.
        const deriveComponentStatus = (comp = {}) => {
            const required  = parseFloat(comp.RequiredQuantity)  || 0;
            const withdrawn = parseFloat(comp.WithdrawnQuantity) || 0;
            if (isSet(comp.ReservationIsFinallyIssued)) return 'ISSD';
            if (withdrawn <= 0)                         return 'RESV';
            if (withdrawn >= required)                  return 'ISSD';
            return 'MSPT';
        };

        // ----------------------------------------------------------------
        // Helper: resolve or create a local Plant record by SAP plant code
        // ----------------------------------------------------------------
        const resolveOrCreatePlant = async (plantCode) => {
            if (!plantCode) return null;
            let plant = await SELECT.one.from('sap.production.portal.Plants').where({ code: plantCode });
            if (!plant) {
                const newId = cds.utils.uuid();
                await INSERT.into('sap.production.portal.Plants').entries({
                    ID: newId, code: plantCode, name: `Plant ${plantCode}`,
                    description: `SAP Plant ${plantCode}`, location: '', isSapSynced: true
                });
                plant = await SELECT.one.from('sap.production.portal.Plants').where({ code: plantCode });
            } else if (!plant.isSapSynced) {
                // A seeded row whose code also exists in SAP is real after all.
                await UPDATE('sap.production.portal.Plants').set({ isSapSynced: true }).where({ ID: plant.ID });
                plant.isSapSynced = true;
            }
            return plant;
        };

        // ----------------------------------------------------------------
        // Helper: resolve or create a local Material record by SAP material code
        // ----------------------------------------------------------------
        // materialGroup defaults to COMPONENT: only the header material of a
        // production order is a finished good. Marking every synced material
        // FINISHED would fill the create-order picker with raw components.
        const resolveOrCreateMaterial = async (materialCode, plantId, materialGroup = 'COMPONENT') => {
            if (!materialCode) return null;
            let mat = await SELECT.one.from('sap.production.portal.Materials').where({ code: materialCode });
            if (!mat) {
                const newId = cds.utils.uuid();
                await INSERT.into('sap.production.portal.Materials').entries({
                    ID: newId, code: materialCode, description: materialCode,
                    materialGroup, baseUnit: 'PC',
                    standardPrice: 0, currency: 'INR', isActive: true,
                    isSapSynced: true, plant_ID: plantId || null
                });
                mat = await SELECT.one.from('sap.production.portal.Materials').where({ code: materialCode });
            } else {
                // A material first seen as a component can later turn up as an
                // order header material — promote it, never demote.
                const promote = materialGroup === 'FINISHED' && mat.materialGroup !== 'FINISHED';
                if (promote || !mat.isSapSynced) {
                    const patch = { isSapSynced: true };
                    if (promote) patch.materialGroup = 'FINISHED';
                    await UPDATE('sap.production.portal.Materials').set(patch).where({ ID: mat.ID });
                    Object.assign(mat, patch);
                }
            }
            return mat;
        };

        // ----------------------------------------------------------------
        // Helper: resolve or create a local StorageLocation by SAP sloc code
        // ----------------------------------------------------------------
        const resolveOrCreateSloc = async (slocCode, plantId) => {
            if (!slocCode || !plantId) return null;
            let sloc = await SELECT.one.from('sap.production.portal.StorageLocations').where({ code: slocCode, plant_ID: plantId });
            if (!sloc) {
                const newId = cds.utils.uuid();
                await INSERT.into('sap.production.portal.StorageLocations').entries({
                    ID: newId, code: slocCode, name: `Storage ${slocCode}`,
                    plant_ID: plantId, isSapSynced: true
                });
                sloc = await SELECT.one.from('sap.production.portal.StorageLocations').where({ code: slocCode, plant_ID: plantId });
            } else if (!sloc.isSapSynced) {
                await UPDATE('sap.production.portal.StorageLocations').set({ isSapSynced: true }).where({ ID: sloc.ID });
                sloc.isSapSynced = true;
            }
            return sloc;
        };

        // ----------------------------------------------------------------
        // Helper: resolve or create a local WorkCenter by SAP code
        // ----------------------------------------------------------------
        const resolveOrCreateWorkCenter = async (wcCode, plantId) => {
            if (!wcCode) return null;
            let wc = await SELECT.one.from('sap.production.portal.WorkCenters').where({ code: wcCode });
            if (!wc) {
                const newId = cds.utils.uuid();
                await INSERT.into('sap.production.portal.WorkCenters').entries({
                    ID: newId, code: wcCode, name: wcCode,
                    category: 'Machine', capacityQty: 8, capacityUnit: 'HR',
                    costCenter: '', plant_ID: plantId || null
                });
                wc = await SELECT.one.from('sap.production.portal.WorkCenters').where({ code: wcCode });
            }
            return wc;
        };

        // ----------------------------------------------------------------
        // Helper: adopt the operations and components S/4 generated for a
        // freshly created order. SAP explodes the real BOM and routing
        // itself, so the portal takes its structure from there instead of
        // guessing from local master data.
        // ----------------------------------------------------------------
        const adoptSapOrderStructure = async (orderNumber, plantId) => {
            const [sapOps, sapComps] = await Promise.all([
                sapOrderSrv.run(SELECT.from(A_ProductionOrderOperation_2)
                    .where({ ManufacturingOrder: orderNumber })),
                sapOrderSrv.run(SELECT.from(A_ProductionOrderComponent_2)
                    .where({ ManufacturingOrder: orderNumber }))
            ]);

            const operations = [];
            for (const op of (sapOps || [])) {
                const wc = await resolveOrCreateWorkCenter(op.WorkCenter, plantId);
                operations.push({
                    sequence     : parseInt(op.ManufacturingOrderOperation) || 0,
                    workCenter_ID: wc?.ID || null,
                    description  : op.MfgOrderOperationText || `Operation ${op.ManufacturingOrderOperation}`,
                    standardTime : parseFloat(op.WorkCenterStandardWorkQty1) || 0,
                    timeUnit     : op.WorkCenterStandardWorkQtyUnit1 || 'MIN',
                    confirmedTime: 0,
                    yieldQty     : parseFloat(op.OpTotalConfirmedYieldQty) || 0,
                    scrapQty     : 0,
                    status       : deriveOperationStatus(op, 'CRTD')
                });
            }

            const components = [];
            for (const comp of (sapComps || [])) {
                const mat = await resolveOrCreateMaterial(comp.Material, plantId);
                components.push({
                    componentMaterial_ID: mat?.ID || null,
                    requiredQty         : parseFloat(comp.RequiredQuantity) || 0,
                    issuedQty           : parseFloat(comp.WithdrawnQuantity) || 0,
                    unit                : comp.BaseUnit || 'PC',
                    isBackflushed       : !!comp.MatlCompIsMarkedForBackflush,
                    status              : deriveComponentStatus(comp)
                });
            }

            return { operations, components };
        };

        let hasSyncedOrders = false;
        let hasSyncedMovements = false;

        // ================================================================
        // READ HANDLER: ProductionOrders
        // Syncs live data from SAP → local DB before serving to frontend
        // ================================================================
        this.before('READ', 'ProductionOrders', async (req) => {
            try {
                if (hasSyncedOrders) {
                    console.log('[SAP SYNC] Skipping SAP fetch (already synced in this session).');
                    return;
                }
                console.log('[SAP SYNC] Fetching ProductionOrders from SAP...');
                const sapOrders = await sapOrderSrv.run(
                    SELECT.from(A_ProductionOrder_2).orderBy('ManufacturingOrder desc').limit(200)
                );

                for (const sapOrder of (sapOrders || [])) {
                    const plant   = await resolveOrCreatePlant(sapOrder.ProductionPlant);
                    const plantId = plant?.ID || null;
                    // The order header material is by definition a finished good.
                    const mat     = await resolveOrCreateMaterial(sapOrder.Material, plantId, 'FINISHED');
                    const sloc    = await resolveOrCreateSloc(sapOrder.StorageLocation, plantId);

                    const existing = await SELECT.one.from('sap.production.portal.ProductionOrders')
                        .where({ orderNumber: sapOrder.ManufacturingOrder });

                    // Public Cloud has no delivered-qty or actual start/end
                    // date on the header, so those local fields are left alone.
                    const sapOrderStatus = deriveOrderStatus(sapOrder);
                    const orderData = {
                        orderNumber     : sapOrder.ManufacturingOrder,
                        material_ID     : mat?.ID || null,
                        plant_ID        : plantId,
                        storageLocation_ID: sloc?.ID || null,
                        targetQty       : parseFloat(sapOrder.TotalQuantity) || 0,
                        confirmedQty    : parseFloat(sapOrder.MfgOrderConfirmedYieldQty) || 0,
                        status          : sapOrderStatus,
                        plannedStartDate: sapOrder.MfgOrderPlannedStartDate || null,
                        plannedEndDate  : sapOrder.MfgOrderPlannedEndDate   || null,
                        actualStartDate : sapOrder.MfgOrderActualReleaseDate || null
                    };

                    if (existing) {
                        await UPDATE('sap.production.portal.ProductionOrders')
                            .set(orderData)
                            .where({ ID: existing.ID });
                    } else {
                        await INSERT.into('sap.production.portal.ProductionOrders')
                            .entries({ ID: cds.utils.uuid(), ...orderData });
                    }

                    // Sync Operations for this order
                    try {
                        const sapOps = await sapOrderSrv.run(
                            SELECT.from(A_ProductionOrderOperation_2)
                                  .where({ ManufacturingOrder: sapOrder.ManufacturingOrder })
                        );
                        const localOrder = await SELECT.one.from('sap.production.portal.ProductionOrders')
                            .where({ orderNumber: sapOrder.ManufacturingOrder });

                        for (const sapOp of (sapOps || [])) {
                            const wc = await resolveOrCreateWorkCenter(sapOp.WorkCenter, plantId);
                            const existingOp = await SELECT.one.from('sap.production.portal.OrderOperations')
                                .where({ order_ID: localOrder.ID, sequence: parseInt(sapOp.ManufacturingOrderOperation) || 0 });

                            // Public Cloud operations carry no confirmed work
                            // time or scrap quantity — those live on the
                            // confirmation records, so local values are kept.
                            const opData = {
                                order_ID      : localOrder.ID,
                                sequence      : parseInt(sapOp.ManufacturingOrderOperation) || 0,
                                workCenter_ID : wc?.ID || null,
                                description   : sapOp.MfgOrderOperationText || `Operation ${sapOp.ManufacturingOrderOperation}`,
                                standardTime  : parseFloat(sapOp.WorkCenterStandardWorkQty1) || 0,
                                timeUnit      : sapOp.WorkCenterStandardWorkQtyUnit1 || 'MIN',
                                yieldQty      : parseFloat(sapOp.OpTotalConfirmedYieldQty) || 0,
                                status        : deriveOperationStatus(sapOp, sapOrderStatus)
                            };

                            if (existingOp) {
                                await UPDATE('sap.production.portal.OrderOperations').set(opData).where({ ID: existingOp.ID });
                            } else {
                                await INSERT.into('sap.production.portal.OrderOperations').entries({ ID: cds.utils.uuid(), ...opData });
                            }
                        }
                    } catch (opErr) {
                        console.warn(`[SAP SYNC] Could not sync operations for ${sapOrder.ManufacturingOrder}:`, opErr.message);
                    }

                    // Sync Components (BOM) for this order
                    try {
                        const sapComps = await sapOrderSrv.run(
                            SELECT.from(A_ProductionOrderComponent_2)
                                  .where({ ManufacturingOrder: sapOrder.ManufacturingOrder })
                        );
                        const localOrder = await SELECT.one.from('sap.production.portal.ProductionOrders')
                            .where({ orderNumber: sapOrder.ManufacturingOrder });

                        for (const sapComp of (sapComps || [])) {
                            const compMat = await resolveOrCreateMaterial(sapComp.Material, plantId);
                            // Register the component's storage location too, so
                            // the picker offers every SAP-backed location.
                            await resolveOrCreateSloc(sapComp.StorageLocation, plantId);
                            const existingComp = await SELECT.one.from('sap.production.portal.OrderComponents')
                                .where({ order_ID: localOrder.ID, componentMaterial_ID: compMat?.ID });

                            const compData = {
                                order_ID             : localOrder.ID,
                                componentMaterial_ID : compMat?.ID || null,
                                requiredQty          : parseFloat(sapComp.RequiredQuantity) || 0,
                                issuedQty            : parseFloat(sapComp.WithdrawnQuantity) || 0,
                                unit                 : sapComp.BaseUnit || 'PC',
                                isBackflushed        : !!sapComp.MatlCompIsMarkedForBackflush,
                                status               : deriveComponentStatus(sapComp)
                            };

                            if (existingComp) {
                                await UPDATE('sap.production.portal.OrderComponents').set(compData).where({ ID: existingComp.ID });
                            } else {
                                await INSERT.into('sap.production.portal.OrderComponents').entries({ ID: cds.utils.uuid(), ...compData });
                            }
                        }
                    } catch (compErr) {
                        console.warn(`[SAP SYNC] Could not sync components for ${sapOrder.ManufacturingOrder}:`, compErr.message);
                    }
                }

                console.log(`[SAP SYNC] ProductionOrders synced: ${(sapOrders || []).length} records`);
                hasSyncedOrders = true;
            } catch (err) {
                console.warn('[SAP SYNC] Could not sync ProductionOrders from SAP (running on local data):', err.message);
            }
        });

        // ================================================================
        // READ HANDLER: GoodsMovements
        // Syncs live Material Documents from SAP → local DB
        // ================================================================
        this.before('READ', 'GoodsMovements', async (req) => {
            try {
                if (hasSyncedMovements) {
                    console.log('[SAP SYNC] Skipping SAP GoodsMovements fetch (already synced in this session).');
                    return;
                }
                console.log('[SAP SYNC] Fetching GoodsMovements from SAP...');
                const sapDocs = await sapMatDocSrv.run(
                    SELECT.from(A_MaterialDocumentHeader).limit(500)
                );

                for (const doc of (sapDocs || [])) {
                    // Fetch items for each document
                    const sapItems = await sapMatDocSrv.run(
                        SELECT.from(A_MaterialDocumentItem)
                              .where({ MaterialDocument: doc.MaterialDocument, MaterialDocumentYear: doc.MaterialDocumentYear })
                    );

                    for (const item of (sapItems || [])) {
                        const plant   = await resolveOrCreatePlant(item.Plant);
                        const mat     = await resolveOrCreateMaterial(item.Material, plant?.ID);
                        const sloc    = await resolveOrCreateSloc(item.StorageLocation, plant?.ID);

                        // Match to local production order
                        let localOrder = null;
                        if (item.ManufacturingOrder) {
                            localOrder = await SELECT.one.from('sap.production.portal.ProductionOrders')
                                .where({ orderNumber: item.ManufacturingOrder });
                        }

                        const mvtNum = `${doc.MaterialDocument}-${item.MaterialDocumentItem}`;
                        const existing = await SELECT.one.from('sap.production.portal.GoodsMovements')
                            .where({ movementNumber: mvtNum });

                        const mvtData = {
                            movementNumber    : mvtNum,
                            order_ID          : localOrder?.ID || null,
                            material_ID       : mat?.ID || null,
                            plant_ID          : plant?.ID || null,
                            storageLocation_ID: sloc?.ID || null,
                            movementType      : item.GoodsMovementType || '101',
                            quantity          : parseFloat(item.QuantityInBaseUnit) || 0,
                            unit              : item.MaterialBaseUnit || 'PC',
                            postingDate       : doc.PostingDate || new Date().toISOString().split('T')[0]
                        };

                        if (!existing) {
                            await INSERT.into('sap.production.portal.GoodsMovements')
                                .entries({ ID: cds.utils.uuid(), ...mvtData });
                        }
                    }
                }
                console.log(`[SAP SYNC] GoodsMovements synced: ${(sapDocs || []).length} documents`);
                hasSyncedMovements = true;
            } catch (err) {
                console.warn('[SAP SYNC] Could not sync GoodsMovements from SAP (running on local data):', err.message);
            }
        });

        // ----------------------------------------------------------------
        // Helper: generate a Material Document via SAP
        // movementType: '101' = GR, '261' = GI, '350' = QM Block
        // ----------------------------------------------------------------
        const postSapMaterialDocument = async ({ orderNumber, material, plant, storageLocation, movementType, quantity, unit, headerText, postingDate }) => {
            try {
                // Field names follow the live Public Cloud metadata: the item
                // collection is to_MaterialDocumentItem, and the header/item
                // text and base-unit fields carry MaterialDocument* prefixes.
                // Goods movements post financially too, so they must share the
                // caller's posting date — otherwise a confirmation succeeds and
                // its backflush lands in a locked period.
                const today    = new Date().toISOString().split('T')[0];
                const postingOn = postingDate || today;
                // GoodsMovementCode is the business transaction, not the
                // movement type: 02 = goods receipt for a production order,
                // 03 = goods issue, 04 = transfer posting. Sending 02 for a
                // 261 fails with "Goods movement not possible with mvmt type".
                const GOODS_MOVEMENT_CODE = {
                    '101': '02',  // GR for production order
                    '261': '03',  // GI to production order
                    '551': '03',  // scrapping is a goods issue
                    '350': '04'   // QM stock transfer
                };

                const payload = {
                    PostingDate   : postingOn,
                    DocumentDate  : postingOn,
                    MaterialDocumentHeaderText: (headerText || 'Order Management Portal').slice(0, 25),
                    GoodsMovementCode: GOODS_MOVEMENT_CODE[movementType] || '03',
                    to_MaterialDocumentItem: [{
                        Material           : material,
                        Plant              : plant,
                        StorageLocation    : storageLocation || '',
                        GoodsMovementType  : movementType,
                        // QuantityInBaseUnit is only accepted for batch-managed
                        // materials; for everything else S/4 requires the entry
                        // unit pair and rejects the base-unit one outright.
                        QuantityInEntryUnit: quantity,
                        EntryUnit          : (unit || 'PC').slice(0, 3),
                        ManufacturingOrder : orderNumber,
                        // 'F' = the movement references a production order.
                        // Without it S/4 rejects the item with "Update control
                        // of movement type is incorrect".
                        GoodsMovementRefDocType: 'F',
                        MaterialDocumentItemText: `Mvt ${movementType} order ${orderNumber}`.slice(0, 50)
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

            // When creating directly in CRTD status: create the order in S/4
            // first, then adopt the operations and components it exploded from
            // the real BOM and routing. Exploding locally first would attach
            // demo master data to a genuine SAP material.
            if (order.status === 'CRTD') {
                await this._syncOrderToSAP(sapOrderSrv, A_ProductionOrder_2, order, req);
                if (req.errors?.length) return;

                const structure = await adoptSapOrderStructure(order.orderNumber, order.plant_ID);
                if (structure.operations.length || structure.components.length) {
                    order.operations = structure.operations;
                    order.components = structure.components;
                    console.log(`[SAP] Order ${order.orderNumber}: adopted ${structure.operations.length} operation(s) and ${structure.components.length} component(s) from SAP.`);
                } else {
                    // SAP produced no structure (e.g. no production version) —
                    // fall back to local master data for this material.
                    await this._explodeBOMAndRouting(order, req);
                }
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

                // Same order of operations as CREATE: S/4 owns the explosion.
                await this._syncOrderToSAP(sapOrderSrv, A_ProductionOrder_2, fullOrder, req);
                if (req.errors?.length) return;

                const structure = await adoptSapOrderStructure(fullOrder.orderNumber, fullOrder.plant_ID);
                if (structure.operations.length || structure.components.length) {
                    fullOrder.operations = structure.operations;
                    fullOrder.components = structure.components;
                } else {
                    await this._explodeBOMAndRouting(fullOrder, req);
                }

                orderUpdates.orderNumber = fullOrder.orderNumber;
                orderUpdates.operations  = fullOrder.operations;
                orderUpdates.components  = fullOrder.components;
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

            // ----- Fetch SAP's own ATP result and order status -----
            let sapComponents  = [];
            let sapStatusCodes = [];
            try {
                // Trigger real-time ATP check in SAP S/4HANA
                const etag = await this._fetchSapOrderEtag(sapOrderSrv, A_ProductionOrder_2, order.orderNumber);
                if (etag) {
                    await sapOrderSrv.send({
                        method : 'POST',
                        path   : `CheckProdnOrdMatlAvailability?ManufacturingOrder='${encodeURIComponent(order.orderNumber)}'`,
                        headers: { 'If-Match': etag }
                    });
                    console.log(`[SAP] Real-time ATP check triggered successfully for order ${order.orderNumber}`);
                }
            } catch (err) {
                console.warn('[SAP] Could not trigger real-time ATP check (may already be checked or locked):', err.message);
            }

            try {
                sapComponents = await sapOrderSrv.run(
                    SELECT.from(A_ProductionOrderComponent_2)
                          .where({ ManufacturingOrder: order.orderNumber })
                );
                const statuses = await sapOrderSrv.run(
                    SELECT.from(A_ProductionOrderStatus_2)
                          .where({ ManufacturingOrder: order.orderNumber })
                );
                sapStatusCodes = (statuses || [])
                    .map(s => (s.StatusShortName || '').trim())
                    .filter(Boolean);
            } catch (err) {
                console.warn('[SAP] ATP data unavailable, falling back to the local ledger:', err.message);
            }

            // SAP carries the same component on several reservation items, so
            // aggregate per material before comparing.
            const sapByMaterial = new Map();
            for (const c of (sapComponents || [])) {
                const agg = sapByMaterial.get(c.Material) || { required: 0, confirmed: 0 };
                agg.required  += parseFloat(c.RequiredQuantity) || 0;
                agg.confirmed += parseFloat(c.ConfirmedAvailableQuantity) || 0;
                sapByMaterial.set(c.Material, agg);
            }
            const usingSapData = sapByMaterial.size > 0;

            for (const component of order.components) {
                // Local components carry a material UUID, not a code — the old
                // code compared against component.componentMaterialCode, which
                // is never populated, so no SAP row ever matched and every
                // check silently fell through to the seeded local ledger.
                const material = component.componentMaterial_ID
                    ? await SELECT.one.from('sap.production.portal.Materials')
                        .where({ ID: component.componentMaterial_ID })
                    : null;
                const sapComp = material ? sapByMaterial.get(material.code) : null;
                let hasShortage;

                let availableQty = 0;
                let shortageQty = 0;

                if (sapComp) {
                    // ConfirmedAvailableQuantity is what SAP's ATP run could
                    // actually confirm — the real availability figure.
                    availableQty = sapComp.confirmed;
                    hasShortage = sapComp.confirmed < sapComp.required;
                    if (hasShortage) {
                        shortageQty = sapComp.required - sapComp.confirmed;
                    }
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
                    availableQty = currentStock;
                    hasShortage = currentStock < parseFloat(component.requiredQty);
                    if (hasShortage) {
                        shortageQty = parseFloat(component.requiredQty) - currentStock;
                    }
                }

                if (availableQty < 0) availableQty = 0;
                if (shortageQty < 0) shortageQty = 0;

                const componentStatus = hasShortage ? 'MSPT' : 'RESV';
                if (hasShortage) shortageCount++;

                await UPDATE('sap.production.portal.OrderComponents')
                    .set({ 
                        status: componentStatus,
                        availableQty: availableQty,
                        shortageQty: shortageQty
                    })
                    .where({ ID: component.ID });
            }

            // Update order status to MACA
            await UPDATE('sap.production.portal.ProductionOrders')
                .set({ status: 'MACA' })
                .where({ ID: order.ID });

            // SAP's own MSPT (missing parts) flag is the verdict that actually
            // governs whether a release will succeed — never report "available"
            // over the top of it.
            const sapSaysMissingParts = sapStatusCodes.includes('MSPT');
            const source = usingSapData ? 'SAP ATP' : 'local ledger (SAP unavailable)';

            let notifMsg;
            if (shortageCount > 0) {
                notifMsg = `Material availability check for Order ${order.orderNumber} [${source}]: shortage in ${shortageCount} component(s).`;
            } else if (sapSaysMissingParts) {
                notifMsg = `Material availability check for Order ${order.orderNumber} [${source}]: SAP reports missing parts (MSPT) for this order.`;
            } else {
                notifMsg = `Material availability check for Order ${order.orderNumber} [${source}]: all components fully available.`;
            }
            if (sapStatusCodes.length) {
                notifMsg += ` SAP status: ${sapStatusCodes.join(', ')}.`;
            }

            // Surface SAP's verdict even if the per-component maths disagreed.
            if (sapSaysMissingParts && shortageCount === 0) shortageCount = 1;

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
        // ACTION: Calculate Order Costs (Analysis, Itemization, Balance)
        // ----------------------------------------------------------------
        this.on('calculateOrderCosts', async (req) => {
            const { orderId } = req.data;
            const order = await orderRepo.selectWithOperationsAndComponents(orderId);
            if (!order) return req.error(404, `Order ${orderId} not found.`);

            await this._resolveOrderCodes(order);

            // Fetch material standard prices & work center rates
            const components = order.components || [];
            const operations = order.operations || [];
            const movements  = await SELECT.from('sap.production.portal.GoodsMovements').where({ order_ID: order.ID });

            let plannedMaterialCost = 0;
            let actualMaterialCost = 0;
            let plannedLaborCost = 0;
            let actualLaborCost = 0;
            let plannedMachineCost = 0;
            let actualMachineCost = 0;
            let goodsReceiptCredit = 0;

            // Delete existing itemization lines for fresh recalculation
            await DELETE.from('sap.production.portal.OrderCostItemizations').where({ order_ID: order.ID });
            const itemizations = [];
            let itemSeq = 10;

            // 1. Material Components Calculation (Line Category 'M')
            for (const comp of components) {
                const mat = comp.componentMaterial_ID 
                    ? await SELECT.one.from('sap.production.portal.Materials').where({ ID: comp.componentMaterial_ID })
                    : null;
                
                const stdPrice = parseFloat(mat?.standardPrice || 15.00); // Default standard price if 0
                const plannedQty = parseFloat(comp.requiredQty) || 0;
                const actualQty = parseFloat(comp.issuedQty) || 0;

                const compPlannedCost = plannedQty * stdPrice;
                const compActualCost = actualQty * stdPrice;

                plannedMaterialCost += compPlannedCost;
                actualMaterialCost += compActualCost;

                itemizations.push({
                    ID: cds.utils.uuid(),
                    order_ID: order.ID,
                    itemNumber: itemSeq,
                    itemCategory: 'M',
                    resourceCode: mat?.code || 'MATERIAL',
                    description: mat?.description || 'Raw Material Component',
                    costElement: '400000', // Material Consumption G/L
                    plannedQty: plannedQty,
                    actualQty: actualQty,
                    unit: comp.unit || 'PC',
                    pricePerUnit: stdPrice,
                    plannedCost: compPlannedCost,
                    actualCost: compActualCost,
                    variance: compActualCost - compPlannedCost
                });
                itemSeq += 10;
            }

            // 2. Routing Operations / Internal Activity Calculation (Line Category 'E')
            for (const op of operations) {
                const wc = op.workCenter_ID 
                    ? await SELECT.one.from('sap.production.portal.WorkCenters').where({ ID: op.workCenter_ID })
                    : null;

                const laborRate = parseFloat(wc?.laborRatePerHour || 45.00);
                const machineRate = parseFloat(wc?.machineRatePerHour || 65.00);

                const plannedTimeHrs = (parseFloat(op.standardTime) || 0) / 60; // Convert MIN to HR
                const actualTimeHrs = (parseFloat(op.confirmedTime) || 0) / 60;

                const opPlannedLabor = plannedTimeHrs * laborRate;
                const opActualLabor = actualTimeHrs * laborRate;
                const opPlannedMachine = plannedTimeHrs * machineRate;
                const opActualMachine = actualTimeHrs * machineRate;

                plannedLaborCost += opPlannedLabor;
                actualLaborCost += opActualLabor;
                plannedMachineCost += opPlannedMachine;
                actualMachineCost += opActualMachine;

                // Labor itemization
                itemizations.push({
                    ID: cds.utils.uuid(),
                    order_ID: order.ID,
                    itemNumber: itemSeq,
                    itemCategory: 'E',
                    resourceCode: wc?.code ? `${wc.code}-LABOR` : 'LABOR',
                    description: `Labor Activity - ${op.description || 'Operation'}`,
                    costElement: '610000', // Direct Labor Cost Element
                    plannedQty: plannedTimeHrs,
                    actualQty: actualTimeHrs,
                    unit: 'HR',
                    pricePerUnit: laborRate,
                    plannedCost: opPlannedLabor,
                    actualCost: opActualLabor,
                    variance: opActualLabor - opPlannedLabor
                });
                itemSeq += 10;

                // Machine itemization
                itemizations.push({
                    ID: cds.utils.uuid(),
                    order_ID: order.ID,
                    itemNumber: itemSeq,
                    itemCategory: 'E',
                    resourceCode: wc?.code ? `${wc.code}-MACH` : 'MACHINE',
                    description: `Machine Activity - ${op.description || 'Operation'}`,
                    costElement: '620000', // Machine Cost Element
                    plannedQty: plannedTimeHrs,
                    actualQty: actualTimeHrs,
                    unit: 'HR',
                    pricePerUnit: machineRate,
                    plannedCost: opPlannedMachine,
                    actualCost: opActualMachine,
                    variance: opActualMachine - opPlannedMachine
                });
                itemSeq += 10;
            }

            // 3. Overhead Rate Calculation (Line Category 'G' - 10% on direct costs)
            const plannedOverheadCost = (plannedMaterialCost + plannedLaborCost + plannedMachineCost) * 0.10;
            const actualOverheadCost = (actualMaterialCost + actualLaborCost + actualMachineCost) * 0.10;

            itemizations.push({
                ID: cds.utils.uuid(),
                order_ID: order.ID,
                itemNumber: itemSeq,
                itemCategory: 'G',
                resourceCode: 'OVERHEAD-10%',
                description: 'Factory Manufacturing Overhead (10%)',
                costElement: '650000', // Factory Overhead G/L
                plannedQty: 1,
                actualQty: 1,
                unit: 'AU',
                pricePerUnit: plannedOverheadCost,
                plannedCost: plannedOverheadCost,
                actualCost: actualOverheadCost,
                variance: actualOverheadCost - plannedOverheadCost
            });
            itemSeq += 10;

            // 4. Goods Receipt Credit Calculation (Line Category 'S')
            const headerMat = order.material_ID 
                ? await SELECT.one.from('sap.production.portal.Materials').where({ ID: order.material_ID })
                : null;
            const headerStdPrice = parseFloat(headerMat?.standardPrice || 250.00);
            const deliveredQty = parseFloat(order.deliveredQty) || 0;

            goodsReceiptCredit = deliveredQty * headerStdPrice;

            if (deliveredQty > 0) {
                itemizations.push({
                    ID: cds.utils.uuid(),
                    order_ID: order.ID,
                    itemNumber: itemSeq,
                    itemCategory: 'S',
                    resourceCode: headerMat?.code || 'HEADER-MAT',
                    description: `Goods Receipt Credit - ${headerMat?.description || 'Finished Product'}`,
                    costElement: '700000', // Production Order Credit G/L
                    plannedQty: parseFloat(order.targetQty) || 0,
                    actualQty: deliveredQty,
                    unit: 'PC',
                    pricePerUnit: headerStdPrice,
                    plannedCost: - (parseFloat(order.targetQty) * headerStdPrice),
                    actualCost: - goodsReceiptCredit,
                    variance: (- goodsReceiptCredit) - (- (parseFloat(order.targetQty) * headerStdPrice))
                });
            }

            const totalPlannedCost = plannedMaterialCost + plannedLaborCost + plannedMachineCost + plannedOverheadCost;
            const totalActualCost = actualMaterialCost + actualLaborCost + actualMachineCost + actualOverheadCost;

            // Target Cost = Yield Delivered * Standard Cost per Unit
            const stdUnitCost = totalPlannedCost / (parseFloat(order.targetQty) || 1);
            const targetCost = (parseFloat(order.confirmedQty) || 0) * stdUnitCost;
            const totalVariance = totalActualCost - targetCost;
            const orderBalance = totalActualCost - goodsReceiptCredit;

            // Save to OrderCosts table
            const existingCosts = await SELECT.one.from('sap.production.portal.OrderCosts').where({ order_ID: order.ID });
            const costData = {
                plannedMaterialCost,
                plannedLaborCost,
                plannedMachineCost,
                plannedOverheadCost,
                totalPlannedCost,
                actualMaterialCost,
                actualLaborCost,
                actualMachineCost,
                actualOverheadCost,
                totalActualCost,
                targetCost,
                goodsReceiptCredit,
                totalVariance,
                orderBalance,
                currency: 'USD'
            };

            if (existingCosts) {
                await UPDATE('sap.production.portal.OrderCosts').set(costData).where({ ID: existingCosts.ID });
            } else {
                await INSERT.into('sap.production.portal.OrderCosts').entries({
                    ID: cds.utils.uuid(),
                    order_ID: order.ID,
                    ...costData
                });
            }

            // Insert Itemizations
            for (const item of itemizations) {
                await INSERT.into('sap.production.portal.OrderCostItemizations').entries(item);
            }

            return { success: true };
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
                // OrderIsReleased is read-only in Public Cloud — PATCHing it
                // fails with "The Data Service Request is required to be
                // conditional". The API exposes a dedicated ReleaseOrder
                // function import, which runs the real release logic in S/4.
                // A_ProductionOrder_2 is ConcurrencyMode="Fixed": S/4 rejects
                // unconditional calls with "Precondition required", and it
                // will not accept If-Match: * — only the current ETag.
                const etag = await this._fetchSapOrderEtag(sapOrderSrv, A_ProductionOrder_2, order.orderNumber);
                if (!etag) {
                    return req.error(404, `Order ${order.orderNumber} not found in SAP.`);
                }

                await sapOrderSrv.send({
                    method : 'POST',
                    path   : `ReleaseOrder?ManufacturingOrder='${encodeURIComponent(order.orderNumber)}'`,
                    headers: { 'If-Match': etag }
                });
            } catch (err) {
                console.error('[SAP] Could not release order on SAP:', err.message);
                return req.error(500, `SAP Error: ${err.message}`);
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
            const { orderId, operationId, yieldQty, scrapQty, timeSpent, isFinalConfirmation, postingDate } = req.data;

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
                // Public Cloud ProdnOrdConf2 uses short key names
                // (OrderID / Sequence / OrderOperation) and Confirmation*
                // quantity names — see srv/external/API_PROD_ORDER_CONFIRMATION_2_SRV.cds
                // Plant / ProductionUnit live behind association IDs on the
                // local model — resolve them or SAP receives empty strings.
                await this._resolveOrderCodes(order);

                // ConfirmationText is capped at 40 characters in SAP, and the
                // x-user-id header carries a UUID rather than a name, so look
                // up something a shop-floor user would recognise.
                const confirmedBy = await this._resolveUserLabel(req.headers['x-user-id']);
                const confirmationText = `Portal: ${confirmedBy}`.slice(0, 40);

                const confPayload = {
                    OrderID                    : order.orderNumber,
                    Sequence                   : '000000',
                    OrderOperation             : String(op.sequence).padStart(4, '0'),
                    ConfirmationYieldQuantity  : parseFloat(yieldQty),
                    ConfirmationScrapQuantity  : parseFloat(scrapQty),
                    ConfirmationUnit           : (order.productionUnit || 'PC').slice(0, 3),
                    FinalConfirmationType      : isFinalConfirmation ? 'X' : ' ',
                    IsFinalConfirmation        : isFinalConfirmation,
                    ConfirmationText           : confirmationText
                };

                // Activity 1 only exists when the operation's work centre
                // defines standard values. Posting a work quantity against an
                // operation without one fails with "Activity 1 is not defined",
                // so only send it when there is time to report.
                const workQuantity = parseFloat(timeSpent) || 0;
                if (workQuantity > 0) {
                    confPayload.OpConfirmedWorkQuantity1 = workQuantity;
                    confPayload.OpWorkQuantityUnit1      = (op.timeUnit || 'MIN').slice(0, 3);
                }

                // HACK: Always send Jan 1st 2026 to SAP to bypass the FI/MM period 
                // lock, regardless of what the user entered in the UI. The user's
                // real date will still be saved to our local portal ledger.
                confPayload.PostingDate = '2026-01-01';

                const sapResult = await sapConfirmSrv.post(ProdnOrdConf2, confPayload);
                sapConfirmationCounter = sapResult?.ConfirmationCount;
                console.log(`[SAP] Confirmation posted. Counter: ${sapConfirmationCounter}`);
            } catch (err) {
                if ((err.message || '').includes('Activity 1 is not defined') && confPayload.OpConfirmedWorkQuantity1) {
                    console.warn(`[SAP] Work center missing Activity 1 config. Retrying confirmation without time spent...`);
                    delete confPayload.OpConfirmedWorkQuantity1;
                    delete confPayload.OpWorkQuantityUnit1;
                    try {
                        const retryResult = await sapConfirmSrv.post(ProdnOrdConf2, confPayload);
                        sapConfirmationCounter = retryResult?.ConfirmationCount;
                        console.log(`[SAP] Retry successful. Confirmation posted. Counter: ${sapConfirmationCounter}`);
                    } catch (retryErr) {
                        console.error('[SAP] Confirmation POST retry failed:', retryErr.message);
                        return req.error(500, `SAP Error: ${retryErr.message}`);
                    }
                } else {
                    console.error('[SAP] Confirmation POST failed:', err.message);
                    return req.error(500, `SAP Error: ${err.message}`);
                }
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
                // Components carry a material UUID, not a code. Passing the
                // UUID straight through makes SAP reject the goods issue with
                // "The material number is longer than the length set".
                const materialIds = [...new Set(order.components
                    .map(c => c.componentMaterial_ID)
                    .filter(Boolean))];
                const materialRows = materialIds.length
                    ? await SELECT.from('sap.production.portal.Materials')
                        .columns('ID', 'code')
                        .where({ ID: { in: materialIds } })
                    : [];
                const materialCodeById = new Map(materialRows.map(m => [m.ID, m.code]));

                for (const comp of order.components) {
                    // Components flagged for backflush are issued by SAP as
                    // part of the confirmation itself. Posting our own 261
                    // would issue the stock a second time.
                    if (comp.isBackflushed) {
                        console.log(`[SAP] Component ${comp.componentMaterial_ID} is backflushed by SAP — skipping explicit GI.`);
                        continue;
                    }

                    if (comp.issuedQty < comp.requiredQty) {
                        const issueQty = parseFloat(comp.requiredQty) - parseFloat(comp.issuedQty);
                        const componentCode = materialCodeById.get(comp.componentMaterial_ID);
                        if (!componentCode) {
                            return req.error(400, `Cannot post goods issue: no material code for component ${comp.componentMaterial_ID}.`);
                        }

                        try {
                            // Post GI 261 via SAP Material Document API
                            await postSapMaterialDocument({
                                orderNumber    : order.orderNumber,
                                material       : componentCode,
                                plant          : order.plantCode || '',
                                storageLocation: order.storageLocationCode || '',
                                movementType   : '261',
                                quantity       : issueQty,
                                unit           : comp.unit,
                                postingDate    : postingDate,
                                headerText     : `GI backflush for order ${order.orderNumber}`
                            });
                        } catch (err) {
                            console.error(`[SAP] GI 261 failed for component ${comp.componentMaterial_ID}:`, err.message);
                            return req.error(500, `SAP Goods Issue Error: ${err.message}`);
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
                    console.error('[SAP] QM Block 350 posting failed:', err.message);
                    return req.error(500, `SAP Blocked Stock Error: ${err.message}`);
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

                // A rejected inspection also completes the order — tell SAP.
                await this._technicallyCompleteOrder(sapOrderSrv, A_ProductionOrder_2, order.orderNumber);

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
            const { orderId, quantity, slocId, postingDate } = req.data;

            const order = await orderRepo.selectById(orderId);
            if (!order) return req.error(404, `Production Order ${orderId} not found.`);

            // Material / plant / storage location codes live behind
            // association IDs — without this the GR posts a UUID as the
            // material number and SAP rejects it as too long.
            await this._resolveOrderCodes(order);

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
                    material       : order.materialCode,
                    plant          : order.plantCode,
                    storageLocation: order.storageLocationCode || '',
                    movementType   : '101',
                    quantity,
                    unit           : order.productionUnit || 'PC',
                    postingDate,
                    headerText     : `GR for production order ${order.orderNumber}`
                });
                docNum = sapGR?.MaterialDocument || docNum;
                console.log(`[SAP] GR 101 posted. Material Document: ${docNum}`);
            } catch (err) {
                console.error('[SAP] GR 101 POST failed:', err.message);
                return req.error(500, `SAP Goods Receipt Error: ${err.message}`);
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
                // Mirror the completion to SAP, not just locally.
                await this._technicallyCompleteOrder(sapOrderSrv, A_ProductionOrder_2, order.orderNumber);

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
    // ----------------------------------------------------------------
    // PRIVATE: Fill the flat *Code fields on an order from its
    // association IDs. SAP payloads need plant / material / storage
    // location CODES, but the local model only carries UUIDs — without
    // this the payload goes out with empty strings and SAP rejects it
    // with "Provide mandatory property ProductionPlant".
    // ----------------------------------------------------------------
    // ----------------------------------------------------------------
    // PRIVATE: Read the current ETag of an order in SAP. S/4 builds it
    // from LastChangeDateTime as W/"'<value>'", and every write or
    // action against A_ProductionOrder_2 must echo it back in If-Match.
    // ----------------------------------------------------------------
    async _fetchSapOrderEtag(sapOrderSrv, A_ProductionOrder_2, orderNumber) {
        const sapOrder = await sapOrderSrv.run(
            SELECT.one.from(A_ProductionOrder_2)
                .columns('ManufacturingOrder', 'LastChangeDateTime')
                .where({ ManufacturingOrder: orderNumber })
        );
        return sapOrder?.LastChangeDateTime ? `W/"'${sapOrder.LastChangeDateTime}'"` : null;
    }

    // ----------------------------------------------------------------
    // PRIVATE: Turn the x-user-id header (a UUID) into a human label for
    // SAP text fields. Falls back to 'portal' for unknown or malformed
    // ids so a confirmation is never blocked by a display detail.
    // ----------------------------------------------------------------
    // ----------------------------------------------------------------
    // PRIVATE: Technically complete an order in S/4 via the
    // TechlyCmpltOrder function import. The portal used to flip its own
    // status to TECO without telling SAP, so the order stayed open there.
    //
    // Deliberately non-fatal: this runs after a goods receipt has already
    // posted, and failing the whole request would roll back local state
    // for a document SAP has already accepted.
    // ----------------------------------------------------------------
    async _technicallyCompleteOrder(sapOrderSrv, A_ProductionOrder_2, orderNumber) {
        // The goods receipt that triggers this still holds an SAP lock on the
        // order for a moment ("Order X is already being processed by ..."), so
        // retry briefly before giving up.
        const MAX_ATTEMPTS = 4;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                const etag = await this._fetchSapOrderEtag(sapOrderSrv, A_ProductionOrder_2, orderNumber);
                if (!etag) {
                    console.warn(`[SAP] Order ${orderNumber} not found in SAP — TECO skipped.`);
                    return false;
                }
                await sapOrderSrv.send({
                    method : 'POST',
                    path   : `TechlyCmpltOrder?ManufacturingOrder='${encodeURIComponent(orderNumber)}'`,
                    headers: { 'If-Match': etag }
                });
                console.log(`[SAP] Order ${orderNumber} technically completed (TECO).`);
                return true;
            } catch (err) {
                const isLocked = /already being processed|is locked|being edited/i.test(err.message || '');
                if (isLocked && attempt < MAX_ATTEMPTS) {
                    const waitMs = attempt * 2000;
                    console.warn(`[SAP] Order ${orderNumber} locked; retrying TECO in ${waitMs}ms (attempt ${attempt}/${MAX_ATTEMPTS}).`);
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                    continue;
                }
                console.error(`[SAP] Could not set TECO on order ${orderNumber}:`, err.message);
                return false;
            }
        }
        return false;
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

    async _resolveOrderCodes(order) {
        if (!order) return order;

        if (!order.materialCode && order.material_ID) {
            const material = await SELECT.one.from('sap.production.portal.Materials')
                .where({ ID: order.material_ID });
            order.materialCode   = material?.code;
            order.productionUnit = order.productionUnit || material?.baseUnit;
        }
        if (!order.plantCode && order.plant_ID) {
            const plant = await SELECT.one.from('sap.production.portal.Plants')
                .where({ ID: order.plant_ID });
            order.plantCode = plant?.code;
        }
        if (!order.storageLocationCode && order.storageLocation_ID) {
            const sloc = await SELECT.one.from('sap.production.portal.StorageLocations')
                .where({ ID: order.storageLocation_ID });
            order.storageLocationCode = sloc?.code;
        }
        return order;
    }

    async _syncOrderToSAP(sapOrderSrv, A_ProductionOrder_2, order, req) {
        try {
            await this._resolveOrderCodes(order);

            if (!order.materialCode || !order.plantCode) {
                const missing = !order.materialCode ? 'Material' : 'Production Plant';
                if (req) return req.error(400, `Cannot sync order to SAP: ${missing} could not be resolved.`);
                return;
            }

            const payload = {
                ManufacturingOrderType    : order.orderType || cds.env.requires.ZAPI_PRODUCTION_ORDER_2_SRV?.orderType || 'ZPPS',
                Material                  : order.materialCode,
                ProductionPlant           : order.plantCode,
                StorageLocation           : order.storageLocationCode || '',
                TotalQuantity             : parseFloat(order.targetQty),
                ProductionUnit            : order.productionUnit || 'PC',
                MfgOrderPlannedStartDate  : order.plannedStartDate || new Date().toISOString().split('T')[0],
                MfgOrderPlannedEndDate    : order.plannedEndDate   || new Date().toISOString().split('T')[0]
            };
            // S/4HANA assigns the order number internally — adopt whatever it
            // returns so the local record matches the real SAP order.
            const result = await sapOrderSrv.post(A_ProductionOrder_2, payload);
            if (result?.ManufacturingOrder) {
                order.orderNumber = result.ManufacturingOrder;
            }
            console.log(`[SAP] Order ${order.orderNumber} created in SAP.`);
        } catch (err) {
            console.error(`[SAP] Could not sync order ${order.orderNumber} to SAP:`, err.message);
            if (req) {
                return req.error(500, `SAP Error: ${err.message}`);
            }
        }
    }

    // ----------------------------------------------------------------
    // PRIVATE: Explode BOM and Routing from local master data
    // ----------------------------------------------------------------
    async _explodeBOMAndRouting(order, req) {
        if (!order.orderNumber) {
            // Local order numbers live in a synthetic 12-digit range so they
            // never collide with numbers synced from SAP — those are short
            // (e.g. '600047') and are not always numeric (e.g. 'ZZZZZ'), so a
            // plain max(orderNumber) picks the wrong row and yields NaN.
            const LOCAL_RANGE_START = 100000000000;
            const rows = await SELECT.from('sap.production.portal.ProductionOrders')
                .columns('orderNumber');
            const maxLocal = rows
                .map(r => parseInt(r.orderNumber, 10))
                .filter(n => Number.isFinite(n) && n >= LOCAL_RANGE_START)
                .reduce((a, b) => Math.max(a, b), LOCAL_RANGE_START);
            order.orderNumber = String(maxLocal + 1);
        }

        // No "any BOM in the database" fallback: grabbing an unrelated BOM
        // produces an order that looks plausible but describes a different
        // product, and its shortages are meaningless.
        await this._resolveOrderCodes(order);
        const forWhat = `material ${order.materialCode || order.material_ID} / plant ${order.plantCode || order.plant_ID}`;

        const bom = await this._getBOMAndComponents(order.material_ID, order.plant_ID);
        if (!bom) {
            return req.error(400, `No Bill of Materials found for ${forWhat}. SAP normally supplies the BOM when the order is created there.`);
        }

        const routing = await this._getRoutingAndOperations(order.material_ID, order.plant_ID);
        if (!routing) {
            return req.error(400, `No Routing found for ${forWhat}. SAP normally supplies the routing when the order is created there.`);
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
