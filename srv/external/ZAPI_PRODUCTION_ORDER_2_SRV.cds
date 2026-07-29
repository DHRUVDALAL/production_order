// -----------------------------------------------------------------------
// External SAP OData Service: API_PRODUCTION_ORDER_2_SRV
// Base URL: https://my421238-api.s4hana.cloud.sap/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV
//
// Field names below are verified against the LIVE S/4HANA Public Cloud
// metadata. They differ from the on-prem service this model originally
// targeted — see the notes on each entity.
// -----------------------------------------------------------------------

@cds.external: true
service ZAPI_PRODUCTION_ORDER_2_SRV {

    // ------------------------------------------------------------------
    // A_ProductionOrder_2 — Production Order Header
    //
    // Public Cloud has NO ManufacturingOrderStatus field. Order status is
    // expressed as a set of 'X'/'' flags (OrderIsReleased, OrderIsConfirmed,
    // …) which the service layer folds into a single portal status code.
    // There is also no delivered-quantity or actual start/end date on the
    // header — only MfgOrderActualReleaseDate.
    // ------------------------------------------------------------------
    @cds.external: true
    entity A_ProductionOrder_2 {
        key ManufacturingOrder          : String(12);
            ManufacturingOrderType      : String(4);
            Material                    : String(40);
            ProductionPlant             : String(4);
            StorageLocation             : String(4);
            ProductionSupervisor        : String(3);

            // Drives the entity's ETag: S/4 returns W/"'<LastChangeDateTime>'".
            // A_ProductionOrder_2 is ConcurrencyMode="Fixed", so writes and
            // action calls must carry that value in an If-Match header.
            LastChangeDateTime          : String(14);

            // Quantities — 'TotalQuantity', not 'MfgOrderPlannedTotalQty'
            TotalQuantity               : Decimal(15, 3);
            MfgOrderConfirmedYieldQty   : Decimal(15, 3);
            MfgOrderPlannedScrapQty     : Decimal(15, 3);
            ProductionUnit              : String(3);

            // Dates
            MfgOrderCreationDate        : Date;
            MfgOrderPlannedStartDate    : Date;
            MfgOrderPlannedEndDate      : Date;
            MfgOrderScheduledStartDate  : Date;
            MfgOrderScheduledEndDate    : Date;
            MfgOrderActualReleaseDate   : Date;

            // Status flags — 'X' when set, '' when not
            OrderIsCreated              : String(1);
            OrderIsReleased             : String(1);
            OrderIsPartiallyConfirmed   : String(1);
            OrderIsConfirmed            : String(1);
            OrderIsDelivered            : String(1);
            OrderIsPartiallyDelivered   : String(1);
            OrderIsTechnicallyCompleted : String(1);
            OrderIsClosed               : String(1);
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
    //
    // Public Cloud names differ substantially from on-prem:
    //   OperationText              -> MfgOrderOperationText
    //   StandardWorkQuantity1      -> WorkCenterStandardWorkQty1
    //   StandardWorkQuantity1Unit  -> WorkCenterStandardWorkQtyUnit1
    //   OpConfirmedYieldQuantity   -> OpTotalConfirmedYieldQty
    //   Plant                      -> ProductionPlant
    // There is no operation status field and no confirmed scrap/work
    // quantity — status comes from the two IsConfirmed flags.
    // ------------------------------------------------------------------
    @cds.external: true
    entity A_ProductionOrderOperation_2 {
        key ManufacturingOrder          : String(12);
        key ManufacturingOrderSequence  : String(6);
        key ManufacturingOrderOperation : String(4);
            WorkCenter                  : String(8);
            WorkCenterInternalID        : String(8);
            ProductionPlant             : String(4);
            MfgOrderOperationText       : String(40);
            OperationUnit               : String(3);
            OpPlannedTotalQuantity      : Decimal(15, 3);
            OpTotalConfirmedYieldQty    : Decimal(15, 3);
            WorkCenterStandardWorkQty1     : Decimal(10, 3);
            WorkCenterStandardWorkQtyUnit1 : String(3);
            OperationIsConfirmed           : String(1);
            OperationIsPartiallyConfirmed  : String(1);
    }

    // ------------------------------------------------------------------
    // A_ProductionOrderComponent_2 — BOM Components
    //
    // Keyed on Reservation + ReservationItem in Public Cloud (NOT
    // ManufacturingOrder + ManufacturingOrderItem). No ComponentStatus
    // field — the service layer derives it from withdrawn vs required.
    // ------------------------------------------------------------------
    @cds.external: true
    entity A_ProductionOrderComponent_2 {
        key Reservation                 : String(10);
        key ReservationItem             : String(4);
            ManufacturingOrder          : String(12);
            ManufacturingOrderSequence  : String(6);
            ManufacturingOrderOperation : String(4);
            Material                    : String(40);
            Plant                       : String(4);
            ProductionPlant             : String(4);
            StorageLocation             : String(4);
            RequiredQuantity            : Decimal(15, 3);
            WithdrawnQuantity           : Decimal(15, 3);
            ConfirmedAvailableQuantity  : Decimal(15, 3);
            BaseUnit                    : String(3);
            ReservationIsFinallyIssued  : String(1);
            // When true SAP issues this component itself on confirmation.
            // Posting an explicit 261 as well would double-issue the stock.
            MatlCompIsMarkedForBackflush: Boolean;
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
