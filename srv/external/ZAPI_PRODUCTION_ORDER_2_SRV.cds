// -----------------------------------------------------------------------
// External SAP OData Service: ZAPI_PRODUCTION_ORDER_2_SRV
// Base URL: http://192.168.1.55:8000/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV
// -----------------------------------------------------------------------

@cds.external: true
service ZAPI_PRODUCTION_ORDER_2_SRV {

    // ------------------------------------------------------------------
    // A_ProductionOrder_2 — Production Order Header
    // ------------------------------------------------------------------
    @cds.external: true
    entity A_ProductionOrder_2 {
        key ManufacturingOrder          : String(12);   // e.g. "000001000001"
            ManufacturingOrderType      : String(4);    // e.g. "PP01"
            Material                    : String(40);   // Material number
            MfgOrderPlannedStartDate    : Date;
            MfgOrderPlannedEndDate      : Date;
            MfgOrderActualStartDate     : Date;
            MfgOrderActualEndDate       : Date;
            ManufacturingOrderStatus    : String(10);
            MfgOrderPlannedTotalQty     : Decimal(15, 3);
            MfgOrderConfirmedYieldQty   : Decimal(15, 3);
            MfgOrderDeliveredQty        : Decimal(15, 3);
            ProductionPlant             : String(4);
            StorageLocation             : String(4);
            MfgOrderCreationDate        : Date;
    }

    // ------------------------------------------------------------------
    // A_ProductionOrderItem_2 — Production Order Items
    // ------------------------------------------------------------------
    @cds.external: true
    entity A_ProductionOrderItem_2 {
        key ManufacturingOrder          : String(12);
        key ManufacturingOrderItem      : String(8);
            Material                    : String(40);
            ProductionPlant             : String(4);
            MfgOrderItemPlannedTotalQty : Decimal(15, 3);
            MfgOrderItemActualDeliveredQty : Decimal(15, 3);
            StorageLocation             : String(4);
            GoodsMovementType           : String(3);
    }

    // ------------------------------------------------------------------
    // A_ProductionOrderOperation_2 — Routing/Operations
    // ------------------------------------------------------------------
    @cds.external: true
    entity A_ProductionOrderOperation_2 {
        key ManufacturingOrder          : String(12);
        key ManufacturingOrderSequence  : String(6);
        key ManufacturingOrderOperation : String(4);
            WorkCenter                  : String(8);
            WorkCenterInternalID        : String(8);
            Plant                       : String(4);
            OperationText               : String(40);
            StandardWorkQuantity1       : Decimal(10, 3);
            StandardWorkQuantity1Unit   : String(3);
            OpActualExecutionStartDate  : Date;
            OpActualExecutionEndDate    : Date;
            MfgOrderOperationStatus     : String(4);   // CRTD, REL, CNF, PCNF
            OpConfirmedYieldQuantity    : Decimal(15, 3);
            OpConfirmedScrapQuantity    : Decimal(15, 3);
            OpTotalConfirmedWorkQuantity: Decimal(10, 3);
    }

    // ------------------------------------------------------------------
    // A_ProductionOrderComponent_2 — BOM Components
    // ------------------------------------------------------------------
    @cds.external: true
    entity A_ProductionOrderComponent_2 {
        key ManufacturingOrder          : String(12);
        key ManufacturingOrderItem      : String(8);
        key ReservationItem             : String(4);
            Material                    : String(40);
            Plant                       : String(4);
            StorageLocation             : String(4);
            RequiredQuantity            : Decimal(15, 3);
            WithdrawnQuantity           : Decimal(15, 3);
            BaseUnit                    : String(3);
            ComponentStatus             : String(4);   // RESV, MSPT, ISSD
    }

    // ------------------------------------------------------------------
    // A_ProductionOrderStatus_2 — Order Status Object
    // ------------------------------------------------------------------
    @cds.external: true
    entity A_ProductionOrderStatus_2 {
        key ManufacturingOrder              : String(12);
        key StatusCode                      : String(5);
            IsUserStatus                    : Boolean;
            StatusShortName                 : String(5);
    }

    // ------------------------------------------------------------------
    // A_ProductionRsceTools_2 — Resource Tools
    // ------------------------------------------------------------------
    @cds.external: true
    entity A_ProductionRsceTools_2 {
        key ManufacturingOrder          : String(12);
        key ManufacturingOrderSequence  : String(6);
        key ManufacturingOrderOperation : String(4);
        key ToolNumber                  : String(18);
            ToolDescription             : String(40);
            ToolQuantity                : Decimal(10, 3);
    }
}
