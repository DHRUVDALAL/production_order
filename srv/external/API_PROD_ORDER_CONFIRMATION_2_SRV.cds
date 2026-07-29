// -----------------------------------------------------------------------
// External SAP OData Service: API_PROD_ORDER_CONFIRMATION_2_SRV
// Base URL: https://my421238-api.s4hana.cloud.sap/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV
//
// Field names verified against LIVE S/4HANA Public Cloud metadata. The
// confirmation entity uses short names (OrderID / Sequence / OrderOperation)
// rather than the ManufacturingOrder* names used elsewhere in the API suite.
// -----------------------------------------------------------------------

@cds.external: true
service API_PROD_ORDER_CONFIRMATION_2_SRV {

    // ------------------------------------------------------------------
    // ProdnOrdConf2 — Production Order Operation Confirmation
    // POST to confirm yield, scrap and time on an operation
    //
    // On-prem -> Public Cloud renames:
    //   ManufacturingOrder           -> OrderID
    //   ManufacturingOrderSequence   -> Sequence
    //   ManufacturingOrderOperation  -> OrderOperation
    //   ConfirmedYieldQuantity       -> ConfirmationYieldQuantity
    //   ConfirmedScrapQuantity       -> ConfirmationScrapQuantity
    //   ConfirmedWorkQuantity        -> OpConfirmedWorkQuantity1
    //   ConfirmationWorkQuantityUnit -> OpWorkQuantityUnit1
    //   ConfirmationCounter          -> ConfirmationCount
    // ------------------------------------------------------------------
    @cds.external: true
    entity ProdnOrdConf2 {
        key ConfirmationGroup               : String(10);
        key ConfirmationCount               : String(10);
            OrderID                         : String(12);
            Sequence                        : String(6);
            OrderOperation                  : String(4);
            OrderSuboperation               : String(4);
            OrderType                       : String(4);
            ConfirmationEntryDate           : Date;
            ConfirmationEntryTime           : Time;
            // Edm.DateTime with sap:display-format="Date". It must be declared
            // here or CAP passes the value through untyped and S/4 answers
            // "Conversion error for property 'PostingDate'".
            PostingDate                     : Date;
            ConfirmationYieldQuantity       : Decimal(15, 3);
            ConfirmationScrapQuantity       : Decimal(15, 3);
            ConfirmationReworkQuantity      : Decimal(15, 3);
            ConfirmationUnit                : String(3);
            OpConfirmedWorkQuantity1        : Decimal(10, 3);
            OpWorkQuantityUnit1             : String(3);
            FinalConfirmationType           : String(1);
            IsFinalConfirmation             : Boolean;         // true = FCONF, false = partial
            OpConfirmationIsReversed        : Boolean;
            ConfirmationText                : String(40);
            Plant                           : String(4);
            ProductionUnit                  : String(3);
    }

    // ------------------------------------------------------------------
    // ProdnOrdConfMatlDocItm — Material Document Items Created on Confirmation
    // Read after POST to get the resulting GI material document
    // ------------------------------------------------------------------
    @cds.external: true
    entity ProdnOrdConfMatlDocItm {
        key ConfirmationGroup               : String(10);
        key ConfirmationCount               : String(10);
        key MaterialDocument                : String(10);
        key MaterialDocumentYear            : String(4);
        key MaterialDocumentItem            : String(4);
            Material                        : String(40);
            Plant                           : String(4);
            StorageLocation                 : String(4);
            GoodsMovementType               : String(3);
            QuantityInBaseUnit              : Decimal(15, 3);
            BaseUnit                        : String(3);
    }

    // ------------------------------------------------------------------
    // ProdnOrderConfBatchCharc — Batch Classification on Confirmation
    // Used when materials are batch-managed
    // ------------------------------------------------------------------
    @cds.external: true
    entity ProdnOrderConfBatchCharc {
        key ConfirmationGroup               : String(10);
        key ConfirmationCount               : String(10);
        key CharcInternalID                 : String(10);
            CharcValue                      : String(70);
            Characteristic                  : String(30);
            CharcValueUnit                  : String(3);
    }
}
