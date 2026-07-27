// -----------------------------------------------------------------------
// External SAP OData Service: API_PROD_ORDER_CONFIRMATION_2_SRV
// Base URL: http://192.168.1.55:8000/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV
// -----------------------------------------------------------------------

@cds.external: true
service API_PROD_ORDER_CONFIRMATION_2_SRV {

    // ------------------------------------------------------------------
    // ProdnOrdConf2 — Production Order Operation Confirmation
    // POST to confirm yield, scrap and time on an operation
    // ------------------------------------------------------------------
    @cds.external: true
    entity ProdnOrdConf2 {
        key ConfirmationCounter             : String(10);
            ManufacturingOrder              : String(12);
            ManufacturingOrderOperation     : String(4);
            ManufacturingOrderSequence      : String(6);
            ConfirmationEntryDate           : Date;
            ConfirmationEntryTime           : Time;
            ConfirmedYieldQuantity          : Decimal(15, 3);
            ConfirmedScrapQuantity          : Decimal(15, 3);
            ConfirmedWorkQuantity           : Decimal(10, 3);
            ConfirmationWorkQuantityUnit    : String(3);
            IsFinalConfirmation             : Boolean;         // true = FCONF, false = partial
            OpConfirmationIsReversed        : Boolean;
            ConfirmationText                : String(40);
            Plant                           : String(4);
    }

    // ------------------------------------------------------------------
    // ProdnOrdConfMatlDocItm — Material Document Items Created on Confirmation
    // Read after POST to get the resulting GI material document
    // ------------------------------------------------------------------
    @cds.external: true
    entity ProdnOrdConfMatlDocItm {
        key ConfirmationCounter             : String(10);
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
        key ConfirmationCounter             : String(10);
        key CharcInternalID                 : String(10);
            CharcValue                      : String(70);
            Characteristic                  : String(30);
            CharcValueUnit                  : String(3);
    }
}
