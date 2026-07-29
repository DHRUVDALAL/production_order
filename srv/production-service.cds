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

    // Custom Transactional Actions
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
}
