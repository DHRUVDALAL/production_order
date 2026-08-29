namespace sap.production.portal;

using { cuid, managed } from '@sap/cds/common';

// -------------------------------------------------------------
// MASTER DATA ENTITIES
// -------------------------------------------------------------

// isSapSynced marks master data that came from the live S/4HANA tenant, as
// opposed to the locally seeded demo rows. Transactional screens filter on it
// so users cannot pick mock master data that SAP would reject.
entity Plants : cuid, managed {
    code        : String(4); // e.g. "PL01", "PL02"
    name        : String(100);
    description : String(255);
    location    : String(100);
    isSapSynced : Boolean default false;
    storageLocations : Association to many StorageLocations on storageLocations.plant = $self;
}

entity StorageLocations : cuid, managed {
    code        : String(4); // e.g. "SL01", "SL02"
    name        : String(100);
    isSapSynced : Boolean default false;
    plant       : Association to Plants;
}

entity Materials : cuid, managed {
    code         : String(18); // SAP standard allows up to 18 or 40 chars
    description  : String(255);
    materialGroup: String(20);  // e.g. "RAW", "SEMI", "FINISHED"
    baseUnit     : String(3);   // e.g. "PC", "KG", "L"
    standardPrice: Decimal(15, 2);
    currency     : String(3) default 'USD';
    isActive     : Boolean default true;
    isSapSynced  : Boolean default false;
    plant        : Association to Plants;
}

entity WorkCenters : cuid, managed {
    code        : String(8); // e.g. "WC-ASSY", "WC-TEST"
    plant       : Association to Plants;
    name        : String(100);
    category    : String(20); // e.g. "Machine", "Labor", "Assembly Line"
    capacityQty : Decimal(10, 2); // capacity units per hour
    capacityUnit: String(3) default 'HR';
    costCenter  : String(10); // cost center allocation
}

entity Routings : cuid, managed {
    material    : Association to Materials;
    plant       : Association to Plants;
    description : String(255);
    operations  : Composition of many RoutingOperations on operations.routing = $self;
}

entity RoutingOperations : cuid, managed {
    routing      : Association to Routings;
    sequence     : Integer; // e.g. 10, 20, 30
    workCenter   : Association to WorkCenters;
    description  : String(255);
    standardTime : Decimal(10, 2); // standard execution time
    timeUnit     : String(3) default 'MIN';
}

entity BOMs : cuid, managed {
    material    : Association to Materials;
    plant       : Association to Plants;
    description : String(255);
    components  : Composition of many BOMComponents on components.bom = $self;
}

entity BOMComponents : cuid, managed {
    bom              : Association to BOMs;
    componentMaterial: Association to Materials;
    requiredQty      : Decimal(15, 3);
    unit             : String(3) default 'PC';
}

// -------------------------------------------------------------
// USER MANAGEMENT & RBAC
// -------------------------------------------------------------

entity Users : cuid, managed {
    username     : String(50);
    passwordHash : String(255);
    email        : String(100);
    name         : String(100);
    department   : String(50);
    roles        : Composition of many UserRoles on roles.user = $self;
}

entity Roles : cuid, managed {
    code         : String(20); // e.g. "PROD_PLANNER", "SYS_ADMIN"
    name         : String(100);
    description  : String(255);
    userRoles    : Association to many UserRoles on userRoles.role = $self;
}

entity UserRoles : cuid, managed {
    user         : Association to Users;
    role         : Association to Roles;
}

// -------------------------------------------------------------
// TRANSACTIONAL DATA ENTITIES
// -------------------------------------------------------------

entity ProductionOrders : cuid, managed {
    orderNumber     : String(12); // e.g. "100000000001"
    material        : Association to Materials;
    plant           : Association to Plants;
    storageLocation : Association to StorageLocations;
    targetQty       : Decimal(15, 3);
    confirmedQty    : Decimal(15, 3) default 0;
    deliveredQty    : Decimal(15, 3) default 0;
    status          : String(10) default 'DRAFT'; // DRAFT, CRTD, MACA, REL, STRT, PCNF, CNF, INSP, TECO, CLSD
    systemStatus    : String(10) default 'DRAFT'; // Actual SAP Lifecycle Status: DRAFT, CRTD, MACA, REL, PCNF, CNF, TECO, CLSD
    goodsIssueStatus: String(20) default 'NOT_POSTED'; // NOT_POSTED, PARTIAL, POSTED
    goodsReceiptStatus: String(20) default 'NOT_POSTED'; // NOT_POSTED, PARTIAL, POSTED
    portalWorkflowStep : String(10) default 'DRAFT'; // DRAFT, CRTD, MACA, REL, GI, CNF, GR, TECO, CLSD
    orderType       : String(4) default 'ZPPS';
    scheduledStartDate   : DateTime;
    scheduledEndDate     : DateTime;
    scheduledReleaseDate : Date;
    confirmedStartDate   : DateTime;
    confirmedEndDate     : DateTime;
    scrapPortion         : Decimal(5,2) default 0;
    shortExcReceipt      : Decimal(15,3) default 0;
    batchNumber          : String(10);
    settlementRule       : String(20);
    longText             : LargeString;
    statusChanges        : Composition of many OrderStatusChanges on statusChanges.order = $self;
    schedulingType  : String(20) default 'forward';
    isCapacityChecked: Boolean default false;
    isInspectionRequired: Boolean default false;
    plannedStartDate: Date;
    plannedEndDate  : Date;
    actualStartDate : DateTime;
    actualEndDate   : DateTime;
    operations      : Composition of many OrderOperations on operations.order = $self;
    components      : Composition of many OrderComponents on components.order = $self;
    goodsMovements  : Association to many GoodsMovements on goodsMovements.order = $self;
    costs           : Composition of one OrderCosts on costs.order = $self;
    costItems       : Composition of many OrderCostItemizations on costItems.order = $self;
}

entity OrderCosts : cuid, managed {
    order               : Association to ProductionOrders;
    plannedMaterialCost : Decimal(15, 2) default 0;
    plannedLaborCost    : Decimal(15, 2) default 0;
    plannedMachineCost  : Decimal(15, 2) default 0;
    plannedOverheadCost : Decimal(15, 2) default 0;
    totalPlannedCost    : Decimal(15, 2) default 0;

    actualMaterialCost  : Decimal(15, 2) default 0;
    actualLaborCost     : Decimal(15, 2) default 0;
    actualMachineCost   : Decimal(15, 2) default 0;
    actualOverheadCost  : Decimal(15, 2) default 0;
    totalActualCost     : Decimal(15, 2) default 0;

    targetCost          : Decimal(15, 2) default 0;
    goodsReceiptCredit  : Decimal(15, 2) default 0;
    totalVariance       : Decimal(15, 2) default 0;
    orderBalance        : Decimal(15, 2) default 0;
    currency            : String(3) default 'USD';
}

entity OrderCostItemizations : cuid, managed {
    order               : Association to ProductionOrders;
    itemNumber          : Integer;
    itemCategory        : String(2); // 'M' = Material, 'E' = Activity (Labor/Machine), 'G' = Overhead, 'S' = Credit (GR)
    resourceCode        : String(40);
    description         : String(255);
    costElement         : String(10);
    plannedQty          : Decimal(15, 3) default 0;
    actualQty           : Decimal(15, 3) default 0;
    unit                : String(3) default 'PC';
    pricePerUnit        : Decimal(15, 2) default 0;
    plannedCost         : Decimal(15, 2) default 0;
    actualCost          : Decimal(15, 2) default 0;
    variance            : Decimal(15, 2) default 0;
}

entity OrderOperations : cuid, managed {
    order          : Association to ProductionOrders;
    sequence       : Integer;
    workCenter     : Association to WorkCenters;
    description    : String(255);
    standardTime   : Decimal(10, 2);
    timeUnit       : String(3) default 'MIN';
    scheduledStartDate : DateTime;
    scheduledEndDate   : DateTime;
    confirmedTime  : Decimal(10, 2) default 0;
    yieldQty       : Decimal(15, 3) default 0;
    scrapQty       : Decimal(15, 3) default 0;
    status         : String(10) default 'CRTD'; // CRTD, REL, STRT, PCNF, CNF
}

entity OrderComponents : cuid, managed {
    order             : Association to ProductionOrders;
    componentMaterial : Association to Materials;
    storageLocation   : Association to StorageLocations;
    requiredQty       : Decimal(15, 3);
    availableQty      : Decimal(15, 3) default 0;
    shortageQty       : Decimal(15, 3) default 0;
    issuedQty         : Decimal(15, 3) default 0;
    unit              : String(3) default 'PC';
    isBackflushed     : Boolean default false;
    status            : String(10) default 'RESV'; // RESV, MSPT, ISSD
}

entity PurchaseOrders : cuid, managed {
    poNumber       : String(10); // e.g. "4500000123"
    supplier       : String(100);
    purchasingOrg  : String(4) default '1010';
    companyCode    : String(4) default '1010';
    documentDate   : Date;
    status         : String(10) default 'OPEN'; // OPEN, PART, COMP
    items          : Composition of many PurchaseOrderItems on items.purchaseOrder = $self;
}

entity PurchaseOrderItems : cuid, managed {
    purchaseOrder  : Association to PurchaseOrders;
    itemNumber     : Integer; // e.g. 10, 20
    material       : Association to Materials;
    plant          : Association to Plants;
    storageLocation: Association to StorageLocations;
    orderedQty     : Decimal(15, 3);
    receivedQty    : Decimal(15, 3) default 0;
    unit           : String(3) default 'PC';
    netPrice       : Decimal(15, 2);
    currency       : String(3) default 'USD';
    isDeliveryCompleted : Boolean default false;
}

entity Reservations : cuid, managed {
    reservationNumber : String(10); // e.g. "0000000570"
    order             : Association to ProductionOrders;
    requirementDate   : Date;
    status            : String(10) default 'OPEN';
    items             : Composition of many ReservationItems on items.reservation = $self;
}

entity ReservationItems : cuid, managed {
    reservation    : Association to Reservations;
    itemNumber     : Integer;
    material       : Association to Materials;
    plant          : Association to Plants;
    storageLocation: Association to StorageLocations;
    requiredQty    : Decimal(15, 3);
    withdrawnQty   : Decimal(15, 3) default 0;
    unit           : String(3) default 'PC';
    isFinalIssue   : Boolean default false;
}

entity GoodsMovements : cuid, managed {
    movementNumber    : String(10); // e.g. "MATDOC0001" or "4900001330"
    movementYear      : String(4); // e.g. "2026"
    order             : Association to ProductionOrders;
    purchaseOrder     : Association to PurchaseOrders;
    reservation       : Association to Reservations;
    material          : Association to Materials;
    plant             : Association to Plants;
    storageLocation   : Association to StorageLocations;
    movementType      : String(3); // '101' GR, '102' GR Reversal, '261' GI, '262' GI Reversal
    quantity          : Decimal(15, 3);
    unit              : String(3);
    postingDate       : Date;
    documentDate      : Date;
    headerText        : String(255);
    materialSlip      : String(50);
    grGiSlipNo        : String(50);
    batchNumber       : String(10);
    stockType         : String(20) default 'Unrestricted-Use';
    isCancelled       : Boolean default false;
    cancelledByDoc    : String(10); // Movement number of reversal doc
    reversalRefDoc    : String(10); // Original doc being cancelled
    status            : String(10) default 'POSTED'; // POSTED, CANCELLED
}

entity QualityInspectionLots : cuid, managed {
    lotNumber      : String(12); // e.g. "040000000001"
    order          : Association to ProductionOrders;
    material       : Association to Materials;
    plant          : Association to Plants;
    lotQty         : Decimal(15, 3);
    inspectedQty   : Decimal(15, 3) default 0;
    approvedQty    : Decimal(15, 3) default 0;
    rejectedQty    : Decimal(15, 3) default 0;
    usageDecision  : String(4) default ''; // 'UDAC' (Accept), 'UDRJ' (Reject)
    status         : String(10) default 'CRTD'; // CRTD, INSP, COMP
    inspector      : Association to Users;
    decisionDate   : DateTime;
}

entity OrderStatusChanges : cuid, managed {
    order       : Association to ProductionOrders;
    oldStatus   : String(10);
    newStatus   : String(10);
    changedBy   : String(100);
    changedAt   : DateTime;
    remark      : String(255);
}

entity SchedulingMargins : cuid, managed {
    key_code    : String(3);  // e.g. '001'
    description : String(100);
    floatBefore : Decimal(5,2) default 1;  // days
    floatAfter  : Decimal(5,2) default 1;  // days
    plant       : Association to Plants;
}

entity BatchNumbers : cuid, managed {
    batchNumber : String(10);
    material    : Association to Materials;
    plant       : Association to Plants;
    order       : Association to ProductionOrders;
    quantity    : Decimal(15,3);
    unit        : String(3) default 'PC';
    createdOn   : Date;
}

entity OutputItems : cuid, managed {
    order        : Association to ProductionOrders;
    outputType   : String(6) default 'PP_PRT';  // e.g. 'PP_PRT', 'PP_SHOP'
    description  : String(100);
    transmission : String(20) default 'PRINT';   // 'PRINT', 'EMAIL'
    status       : String(10) default 'NEW';     // 'NEW', 'SENT', 'ERROR'
    scheduledAt  : DateTime;
    sentAt       : DateTime;
}

entity ProductionNotifications : cuid, managed {
    type           : String(10); // ALERT, INFO, ERROR
    order          : Association to ProductionOrders;
    message        : String(1000);
    isRead         : Boolean default false;
}

entity AuditLogs : cuid, managed {
    user           : Association to Users;
    action         : String(100);
    entityName     : String(100);
    entityId       : UUID;
    oldValues      : LargeString;
    newValues      : LargeString;
}
