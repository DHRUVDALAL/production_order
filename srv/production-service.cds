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

    // Technically Complete Order
    action technicallyCompleteOrder(orderId: UUID) returns { success: Boolean; status: String; };

    // Close Order
    action closeOrder(orderId: UUID) returns { success: Boolean; status: String; };
}
