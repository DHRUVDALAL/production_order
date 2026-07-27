// -----------------------------------------------------------------------
// External SAP OData Service: ZAPI_MATERIAL_DOCUMENT_SRV
// Base URL: http://192.168.1.55:8000/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV
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
            HeaderText                  : String(25);
            GoodsMovementCode           : String(2);   // '01' = GR, '02' = GI
            items : Composition of many A_MaterialDocumentItem
                        on items.MaterialDocument = MaterialDocument
                        and items.MaterialDocumentYear = MaterialDocumentYear;
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
            BaseUnit                    : String(3);
            ManufacturingOrder          : String(12);
            ManufacturingOrderItem      : String(8);
            GoodsMovementRefDocType     : String(1);
            ItemText                    : String(50);
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
