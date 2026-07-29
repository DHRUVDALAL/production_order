// -----------------------------------------------------------------------
// External SAP OData Service: ZAPI_MATERIAL_DOCUMENT_SRV
// Base URL: https://my421238-api.s4hana.cloud.sap/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV
//
// Reached through the SAP_COM_0108 (Material Document Integration)
// communication arrangement. Field names below are verified against the LIVE
// Public Cloud metadata and differ from the on-prem service this model
// originally targeted — see the notes on each entity.
// -----------------------------------------------------------------------

@cds.external: true
service ZAPI_MATERIAL_DOCUMENT_SRV {

    // ------------------------------------------------------------------
    // A_MaterialDocumentHeader — Goods Movement Document Header
    // Used for GR (101), GI (261), Scrap (551), QM Block (350)
    // ------------------------------------------------------------------
    @cds.external: true
    entity A_MaterialDocumentHeader {
        key MaterialDocument            : String(10);
        key MaterialDocumentYear        : String(4);
            DocumentDate                : Date;
            PostingDate                 : Date;
            CreationDate                : Date;
            ReferenceDocument           : String(16);  // Production Order number
            MaterialDocumentHeaderText  : String(25);  // 'HeaderText' on-prem
            GoodsMovementCode           : String(2);   // '01' = GR, '02' = GI

            // The navigation property is to_MaterialDocumentItem — a POST that
            // nests its lines under any other name creates a header with no
            // items and SAP rejects it.
            to_MaterialDocumentItem : Composition of many A_MaterialDocumentItem
                        on to_MaterialDocumentItem.MaterialDocument = MaterialDocument
                        and to_MaterialDocumentItem.MaterialDocumentYear = MaterialDocumentYear;
    }

    // ------------------------------------------------------------------
    // A_MaterialDocumentItem — Goods Movement Line Items
    // ------------------------------------------------------------------
    @cds.external: true
    entity A_MaterialDocumentItem {
        key MaterialDocument            : String(10);
        key MaterialDocumentYear        : String(4);
        key MaterialDocumentItem        : String(4);
            Material                    : String(40);
            Plant                       : String(4);
            StorageLocation             : String(4);
            Batch                       : String(10);
            GoodsMovementType           : String(3);   // '101', '261', '350', '551'
            QuantityInBaseUnit          : Decimal(15, 3);
            MaterialBaseUnit            : String(3);   // 'BaseUnit' on-prem
            QuantityInEntryUnit         : Decimal(15, 3);
            EntryUnit                   : String(3);
            ManufacturingOrder          : String(12);
            ManufacturingOrderItem      : String(8);
            GoodsMovementRefDocType     : String(1);
            MaterialDocumentItemText    : String(50);  // 'ItemText' on-prem
    }

    // ------------------------------------------------------------------
    // A_SerialNumberMaterialDocument — Serial Number Tracking
    // ------------------------------------------------------------------
    @cds.external: true
    entity A_SerialNumberMaterialDocument {
        key MaterialDocument            : String(10);
        key MaterialDocumentYear        : String(4);
        key MaterialDocumentItem        : String(4);
        key SerialNumber                : String(18);
            Material                    : String(40);
            Plant                       : String(4);
            SerialNumberStatus          : String(4);
    }
}
