using { sap.production.portal as portal } from '../db/schema';

service ProductionService {
    @readonly
    entity Plants as projection on portal.Plants;

    @readonly
    entity StorageLocations as projection on portal.StorageLocations;

    @readonly
    entity Materials as projection on portal.Materials;

    @readonly
    entity WorkCenters as projection on portal.WorkCenters;

    @readonly
    entity Routings as projection on portal.Routings;

    @readonly
    entity RoutingOperations as projection on portal.RoutingOperations;

    @readonly
    entity BOMs as projection on portal.BOMs;

    @readonly
    entity BOMComponents as projection on portal.BOMComponents;

    entity ProductionOrders as projection on portal.ProductionOrders;
    entity OrderOperations as projection on portal.OrderOperations;
    entity OrderComponents as projection on portal.OrderComponents;
    entity GoodsMovements as projection on portal.GoodsMovements;
    entity QualityInspectionLots as projection on portal.QualityInspectionLots;
    entity ProductionNotifications as projection on portal.ProductionNotifications;
    entity OrderCosts as projection on portal.OrderCosts;
    entity OrderCostItemizations as projection on portal.OrderCostItemizations;
    entity OrderStatusChanges as projection on portal.OrderStatusChanges;
    entity BatchNumbers as projection on portal.BatchNumbers;
    entity OutputItems as projection on portal.OutputItems;
    entity SchedulingMargins as projection on portal.SchedulingMargins;
    entity PurchaseOrders as projection on portal.PurchaseOrders;
    entity PurchaseOrderItems as projection on portal.PurchaseOrderItems;
    entity Reservations as projection on portal.Reservations;
    entity ReservationItems as projection on portal.ReservationItems;

    type GoodsMovementItemParam {
        line            : Integer;
        componentId     : UUID;
        poItemId        : UUID;
        resItemId       : UUID;
        materialCode    : String;
        plantCode       : String;
        slocCode        : String;
        quantity        : Decimal(15, 3);
        unit            : String;
        batchNumber     : String;
        stockType       : String;
        movementType    : String;
        finalIssue      : Boolean;
    };

    action checkGoodsMovement(
        actionType      : String, // 'A07', 'A01', 'A03', 'A04'
        refType         : String, // 'R08', 'R01', 'R02', 'R09', 'R10'
        docNumber       : String, // orderNumber, poNumber, matDocNumber, reservationNumber
        docYear         : String,
        postingDate     : Date,
        documentDate    : Date,
        headerText      : String,
        materialSlip    : String,
        grGiSlipNo      : String,
        items           : array of GoodsMovementItemParam
    ) returns { success: Boolean; message: String; errors: array of String; };

    action postGoodsMovement(
        actionType      : String, // 'A07', 'A01', 'A03', 'A04'
        refType         : String, // 'R08', 'R01', 'R02', 'R09', 'R10'
        docNumber       : String,
        docYear         : String,
        postingDate     : Date,
        documentDate    : Date,
        headerText      : String,
        materialSlip    : String,
        grGiSlipNo      : String,
        items           : array of GoodsMovementItemParam
    ) returns { success: Boolean; docNum: String; docYear: String; message: String; errors: array of String; };

    action cancelMaterialDocument(
        materialDocumentNumber: String,
        materialDocumentYear  : String,
        postingDate           : Date,
        reason                : String
    ) returns { success: Boolean; docNum: String; docYear: String; message: String; errors: array of String; };

    // Custom Transactional Actions
    action calculateOrderCosts(orderId: UUID) returns { success: Boolean; };
    action checkMaterialAvailability(orderId: UUID) returns { success: Boolean; shortageCount: Integer; };
    action releaseOrder(orderId: UUID) returns { success: Boolean; status: String; };
    action startOrder(orderId: UUID) returns { success: Boolean; status: String; };
    
    action confirmOperation(
        orderId: UUID,
        operationId: UUID,
        yieldQty: Decimal(15, 3),
        scrapQty: Decimal(15, 3),
        timeSpent: Decimal(10, 2),
        isFinalConfirmation: Boolean,
        // Optional. A confirmation posts financially, so it must land in an
        // open period — omit to let SAP use its own default posting date.
        postingDate: Date
    ) returns { success: Boolean; status: String; };

    action submitUsageDecision(
        lotId: UUID, 
        approvedQty: Decimal(15, 3), 
        rejectedQty: Decimal(15, 3), 
        usageDecision: String // 'UDAC' (Accept) or 'UDRJ' (Reject)
    ) returns { success: Boolean; status: String; };

    action postGoodsReceipt(
        orderId: UUID,
        quantity: Decimal(15, 3),
        slocId: UUID,
        // Optional, as on confirmOperation — a material document must post
        // into an open MM period.
        postingDate: Date
    ) returns { success: Boolean; docNum: String; };

    // Schedule Order
    action scheduleOrder(
        orderId        : UUID,
        schedulingType : String  // 'FORWARD' | 'BACKWARD' | 'CURRENT_DATE'
    ) returns {
        success          : Boolean;
        scheduledStart   : String;
        scheduledEnd     : String;
        scheduledRelease : String;
    };

    // Change Net Quantity
    action changeNetQuantity(
        orderId    : UUID,
        newQuantity: Decimal(15,3),
        reason     : String
    ) returns { success: Boolean; message: String; };

    // Change Dates and Times
    action changeDatesAndTimes(
        orderId           : UUID,
        newBasicStartDate : Date,
        newBasicEndDate   : Date,
        newStartTime      : String,
        newEndTime        : String
    ) returns { success: Boolean; };

    // Read PP Master Data
    action readPPMasterData(
        orderId           : UUID,
        productionVersion : String,
        basicStart        : Date,
        basicFinish       : Date,
        newRouting        : Boolean,
        routingDate       : Date,
        newBOM            : Boolean,
        bomDate           : Date
    ) returns {
        success           : Boolean;
        operationsUpdated : Integer;
        componentsUpdated : Integer;
        revertedToCreated : Boolean;
        status            : String;
    };

    // Get Status Changes history
    action getStatusChanges(orderId: UUID) returns array of {
        oldStatus : String;
        newStatus : String;
        changedBy : String;
        changedAt : String;
        remark    : String;
    };

    // Get Change Management / Audit Trail
    action getChangeManagement(orderId: UUID) returns array of {
        fieldName : String;
        oldValue  : String;
        newValue  : String;
        changedBy : String;
        changedAt : String;
        action    : String;
    };

    // Get Missing Parts
    action getMissingParts(orderId: UUID) returns array of {
        componentId   : String;
        material      : String;
        description   : String;
        requiredQty   : Decimal(15,3);
        availableQty  : Decimal(15,3);
        shortageQty   : Decimal(15,3);
        unit          : String;
        status        : String;
    };

    action getMissingPartsOverview(orderId: UUID) returns {
        orderNumber      : String;
        totalComponents  : Integer;
        shortageCount    : Integer;
        overallStatus    : String;
        missingComponents : array of {
            material    : String;
            description : String;
            shortageQty : Decimal(15,3);
            unit        : String;
        };
    };

    action getDocumentedGoodsMovements(orderId: UUID) returns array of {
        docNumber       : String;
        item            : String;
        movementType    : String;
        material        : String;
        description     : String;
        quantity        : Decimal(15,3);
        unit            : String;
        postingDate     : String;
        plant           : String;
        storageLocation : String;
    };

    // Create Batch
    action createBatch(
        orderId  : UUID,
        quantity : Decimal(15,3)
    ) returns { success: Boolean; batchNumber: String; };

    // Get Output Items
    action getOutputItems(orderId: UUID) returns array of {
        ID           : String;
        outputType   : String;
        description  : String;
        transmission : String;
        status       : String;
        scheduledAt  : String;
    };

    // Reprint Output
    action reprintOutput(
        orderId    : UUID,
        outputType : String
    ) returns { success: Boolean; message: String; };

    // Get Settlement Rule
    action getSettlementRule(orderId: UUID) returns {
        settlementType : String;
        receiver       : String;
        percentage     : Decimal(5,2);
        currency       : String;
    };

    // Stock Requirements List
    action getStockRequirementsList(
        materialCode : String,
        plantCode    : String
    ) returns array of {
        date      : String;
        type      : String;
        quantity  : Decimal(15,3);
        cumQty    : Decimal(15,3);
        reference : String;
        status    : String;
    };

    // Technically Complete Order & Restrict Processing Actions
    action technicallyCompleteOrder(orderId: UUID) returns { success: Boolean; status: String; };
    action revokeTechnicalCompletionOrder(orderId: UUID) returns { success: Boolean; status: String; };
    action closeOrder(orderId: UUID) returns { success: Boolean; status: String; };
    action revokeCloseOrder(orderId: UUID) returns { success: Boolean; status: String; };
    action lockProductionOrder(orderId: UUID) returns { success: Boolean; status: String; };
    action unlockProductionOrder(orderId: UUID) returns { success: Boolean; status: String; };
    action setDeletionFlagOrder(orderId: UUID) returns { success: Boolean; status: String; };
    action revokeDeletionFlagOrder(orderId: UUID) returns { success: Boolean; status: String; };

    // WM Material Staging Action
    action stageWmMaterial(orderId: UUID, isSimulation: Boolean) returns { success: Boolean; message: String; details: String; };

    // SAP Cost Views Actions (Goto -> Costs)
    action getCostAnalysis(orderId: UUID) returns {
        orderNumber      : String;
        plannedTotalCost : Decimal(15,2);
        actualTotalCost  : Decimal(15,2);
        targetTotalCost  : Decimal(15,2);
        variance         : Decimal(15,2);
        currency         : String;
    };

    action getCostItemization(orderId: UUID) returns array of {
        itemCategory : String;
        resource     : String;
        description  : String;
        plannedQty   : Decimal(15,3);
        actualQty    : Decimal(15,3);
        unit         : String;
        plannedCost  : Decimal(15,2);
        actualCost   : Decimal(15,2);
    };

    action getCostComponentSplit(orderId: UUID) returns array of {
        costComponent : String;
        description   : String;
        plannedCost   : Decimal(15,2);
        actualCost    : Decimal(15,2);
        percentage    : Decimal(5,2);
    };

    action getCostBalance(orderId: UUID) returns {
        totalDebits  : Decimal(15,2);
        totalCredits : Decimal(15,2);
        balance      : Decimal(15,2);
        currency     : String;
        status       : String;
    };

    // Copy From Order — Reference Lookup & SAP Search Value Help
    action getProductionOrderReference(orderNumber: String) returns {
        success              : Boolean;
        orderNumber          : String;
        materialId           : UUID;
        materialCode         : String;
        materialDescription  : String;
        plantId              : UUID;
        plantCode            : String;
        storageLocationId    : UUID;
        storageLocationCode  : String;
        orderType            : String;
        targetQty            : Decimal(15,3);
        productionUnit       : String;
        plannedStartDate     : String;
        plannedEndDate       : String;
        status               : String;
        components           : array of {
            itemNumber               : String;
            componentMaterialCode    : String;
            componentDescription     : String;
            requiredQty              : Decimal(15,3);
            unit                     : String;
            itemCategory             : String;
            operationSequence        : String;
            sequence                 : String;
            plantCode                : String;
            storageLocationCode      : String;
            batchNumber              : String;
            isBackflushed            : Boolean;
        };
    };

    action searchProductionOrders(searchTerm: String, plantCode: String) returns array of {
        orderNumber          : String;
        materialCode         : String;
        materialDescription  : String;
        plantCode            : String;
        orderType            : String;
        targetQty            : Decimal(15,3);
        productionUnit       : String;
        plannedStartDate     : String;
        plannedEndDate       : String;
        status               : String;
    };

    // SAP Change Order Actions
    action updateProductionOrderOperation(
        orderId        : UUID,
        operationId    : UUID,
        description    : String,
        workCenterCode : String
    ) returns { success: Boolean; message: String; };

    action updateProductionOrderComponent(
        orderId             : UUID,
        componentId         : UUID,
        requiredQty         : Decimal(15,3),
        storageLocationCode : String
    ) returns { success: Boolean; message: String; };

    action deleteProductionOrderComponent(
        orderId     : UUID,
        componentId : UUID
    ) returns { success: Boolean; message: String; };
}

