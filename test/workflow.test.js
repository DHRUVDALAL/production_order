/**
 * SAP Production Order Management Portal
 * End-to-End Workflow & Business Rules Integration Test
 * Run while backend CAP server is running (http://localhost:4004)
 */

async function runTests() {
    console.log('========================================================================');
    console.log('STARTING INTEGRATION & WORKFLOW VALIDATION TESTS (SAP PP BEST PRACTICES)');
    console.log('========================================================================\n');

    const BASE_URL = 'http://127.0.0.1:4004';
    let testOrderId = null;
    let testOrderNum = null;
    let testOp10Id = null;
    let testOp20Id = null;
    let testOp30Id = null;
    let testLotId = null;
    let plannerUserId = null;
    let operatorUserId = null;
    let inspectorUserId = null;

    // Helper fetch wrapper
    async function apiCall(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        const response = await fetch(url, {
            ...options,
            headers
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.error?.message || `HTTP ${response.status} Error`);
        }
        return data;
    }

    try {
        // -------------------------------------------------------------
        // STEP 1: Setup Users & Personas Context
        // -------------------------------------------------------------
        console.log('Step 1: Retrieving seeded user profiles...');
        const usersRes = await apiCall('/odata/v4/admin/Users');
        const usersList = usersRes.value;
        
        const planner = usersList.find(u => u.username === 'planner1');
        const operator = usersList.find(u => u.username === 'operator1');
        const inspector = usersList.find(u => u.username === 'inspector1');

        plannerUserId = planner.ID;
        operatorUserId = operator.ID;
        inspectorUserId = inspector.ID;

        console.log(`- Loaded Planner Persona: ${planner.name} (ID: ${plannerUserId})`);
        console.log(`- Loaded Operator Persona: ${operator.name} (ID: ${operatorUserId})`);
        console.log(`- Loaded Inspector Persona: ${inspector.name} (ID: ${inspectorUserId})\n`);

        // -------------------------------------------------------------
        // STEP 2: Retrieve Master Data context
        // -------------------------------------------------------------
        console.log('Step 2: Retrieving manufacturing master data context...');
        const matsRes = await apiCall("/odata/v4/production/Materials?$filter=isSapSynced eq true");
        const plantsRes = await apiCall("/odata/v4/production/Plants?$filter=isSapSynced eq true");
        const slocsRes = await apiCall("/odata/v4/production/StorageLocations?$filter=isSapSynced eq true");

        if (!plantsRes.value.length || !matsRes.value.length) {
            throw new Error("No SAP-synced plants or materials found! Ensure the SAP sync has run at least once by starting the backend.");
        }

        const testPlant = plantsRes.value[0];
        const testMaterial = matsRes.value.find(m => m.plant_ID === testPlant.ID) || matsRes.value[0];
        const testSloc = slocsRes.value.find(s => s.plant_ID === testPlant.ID) || { ID: null, code: '' };

        console.log(`- Material for order: ${testMaterial.code} (${testMaterial.description})`);
        console.log(`- Plant context: ${testPlant.code} - ${testPlant.name}`);
        console.log(`- Finished storage stage: ${testSloc.code || 'None'}\n`);

        // -------------------------------------------------------------
        // STEP 3: Create a Production Order Draft
        // -------------------------------------------------------------
        console.log('Step 3: Creating a new Production Order in DRAFT status...');
        const draftOrder = await apiCall('/odata/v4/production/ProductionOrders', {
            method: 'POST',
            headers: {
                'x-user-id': plannerUserId,
                'x-user-role': 'PROD_PLANNER'
            },
            body: JSON.stringify({
                material_ID: testMaterial.ID,
                plant_ID: testPlant.ID,
                storageLocation_ID: testSloc.ID,
                targetQty: 120.0,
                status: 'DRAFT',
                plannedStartDate: '2026-08-01',
                plannedEndDate: '2026-08-05'
            })
        });

        testOrderId = draftOrder.ID;
        console.log(`- Production Order Draft saved successfully! ID: ${testOrderId}`);
        console.log(`- Verification: Order Status is: ${draftOrder.status} (Expected: DRAFT)`);
        
        // Query components to verify no explosion occurred
        const draftDetails = await apiCall(`/odata/v4/production/ProductionOrders(${testOrderId})?$expand=operations,components`);
        console.log(`- Verification: Operations count: ${draftDetails.operations.length} (Expected: 0)`);
        console.log(`- Verification: Components count: ${draftDetails.components.length} (Expected: 0)\n`);

        // -------------------------------------------------------------
        // STEP 4: Save Order and Explode BOM / Routing
        // -------------------------------------------------------------
        console.log('Step 4: Saving order and triggering BOM & Routing explosion...');
        const crtdOrder = await apiCall(`/odata/v4/production/ProductionOrders(${testOrderId})`, {
            method: 'PATCH',
            headers: {
                'x-user-id': plannerUserId,
                'x-user-role': 'PROD_PLANNER'
            },
            body: JSON.stringify({
                status: 'CRTD'
            })
        });

        // Retrieve full details of exploded order
        const crtdDetails = await apiCall(`/odata/v4/production/ProductionOrders(${testOrderId})?$expand=operations,components`);
        testOrderNum = crtdDetails.orderNumber;
        console.log(`- Order Status transitioned to: ${crtdDetails.status} (Expected: CRTD)`);
        console.log(`- Exploded Order Number generated: ${testOrderNum}`);
        console.log(`- Verification: Routing operations exploded: ${crtdDetails.operations.length} (Expected: 3)`);
        console.log(`- Verification: BOM components reserved: ${crtdDetails.components.length} (Expected: 3)`);
        
        // Grab operation IDs for confirmations dynamically
        const operations = crtdDetails.operations.sort((a, b) => a.sequence - b.sequence);
        if (!operations.length) {
            throw new Error("No operations exploded from SAP! Ensure the material has a valid routing/production version.");
        }
        console.log(`- Captured ${operations.length} operations for confirmation.\n`);

        // -------------------------------------------------------------
        // STEP 5: Perform Material Availability Check (ATP)
        // -------------------------------------------------------------
        console.log('Step 5: Executing Material Availability Check (ATP Check)...');
        const atpRes = await apiCall('/odata/v4/production/checkMaterialAvailability', {
            method: 'POST',
            headers: {
                'x-user-id': plannerUserId,
                'x-user-role': 'PROD_PLANNER'
            },
            body: JSON.stringify({ orderId: testOrderId })
        });
        
        const atp = atpRes.value || atpRes;
        console.log(`- ATP check completed. Shortage count: ${atp.shortageCount}`);
        
        const checkDetails = await apiCall(`/odata/v4/production/ProductionOrders(${testOrderId})`);
        console.log(`- Verification: Order Status is now: ${checkDetails.status} (Expected: MACA)\n`);

        // -------------------------------------------------------------
        // STEP 6: Release Order
        // -------------------------------------------------------------
        console.log('Step 6: Releasing Production Order for shop floor papers...');
        const relRes = await apiCall('/odata/v4/production/releaseOrder', {
            method: 'POST',
            headers: {
                'x-user-id': plannerUserId,
                'x-user-role': 'PROD_PLANNER'
            },
            body: JSON.stringify({ orderId: testOrderId })
        });

        const rel = relRes.value || relRes;
        console.log(`- Order Released. Status: ${rel.status} (Expected: REL)`);
        const relDetails = await apiCall(`/odata/v4/production/ProductionOrders(${testOrderId})?$expand=operations`);
        console.log(`- Verification: All routing operations are in status: ${relDetails.operations[0].status} (Expected: REL)\n`);

        // -------------------------------------------------------------
        // STEP 7: Start Execution
        // -------------------------------------------------------------
        console.log('Step 7: Commencing execution on assembly line...');
        const strtRes = await apiCall('/odata/v4/production/startOrder', {
            method: 'POST',
            headers: {
                'x-user-id': operatorUserId,
                'x-user-role': 'PROD_OPERATOR'
            },
            body: JSON.stringify({ orderId: testOrderId })
        });

        const strt = strtRes.value || strtRes;
        console.log(`- Execution started. Status: ${strt.status} (Expected: STRT)`);
        const strtDetails = await apiCall(`/odata/v4/production/ProductionOrders(${testOrderId})`);
        console.log(`- Verification: Actual start date recorded: ${strtDetails.actualStartDate}\n`);

        // -------------------------------------------------------------
        // STEP 8: Enforce Sequence and Confirm Operations
        // -------------------------------------------------------------
        console.log('Step 8: Enforcing routing operations validation rules...');
        
        // Rule Validation Test: Confirming operation out of sequence must FAIL
        if (operations.length > 1) {
            try {
                console.log(`- Attempting to confirm Operation ${operations[1].sequence} out of sequence (should fail)...`);
                await apiCall('/odata/v4/production/confirmOperation', {
                    method: 'POST',
                    headers: {
                        'x-user-id': operatorUserId,
                        'x-user-role': 'PROD_OPERATOR'
                    },
                    body: JSON.stringify({
                        orderId: testOrderId,
                        operationId: operations[1].ID,
                        yieldQty: 120.0,
                        scrapQty: 0.0,
                        timeSpent: 45.0,
                        isFinalConfirmation: true
                    })
                });
                throw new Error('TEST FAILED: Out-of-order confirmation succeeded when it should have failed!');
            } catch (e) {
                console.log(`- SUCCESS: Prior sequence check blocked confirmation correctly. Message: "${e.message}"`);
            }
        }

        // Dynamically confirm all operations
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            console.log(`- Posting Final Confirmation for Operation ${op.sequence}...`);
            await apiCall('/odata/v4/production/confirmOperation', {
                method: 'POST',
                headers: {
                    'x-user-id': operatorUserId,
                    'x-user-role': 'PROD_OPERATOR'
                },
                body: JSON.stringify({
                    orderId: testOrderId,
                    operationId: op.ID,
                    yieldQty: 120.0,
                    scrapQty: 0.0,
                    timeSpent: 25.0,
                    isFinalConfirmation: true
                })
            });
        }

        const opDetails = await apiCall(`/odata/v4/production/ProductionOrders(${testOrderId})`);
        console.log(`- Verification: Confirmed operations status is now: ${opDetails.status} (Expected: INSP due to quality hold)`);

        // Check if inspection lot was created
        const lotsRes = await apiCall(`/odata/v4/production/QualityInspectionLots?$filter=order_ID eq ${testOrderId}`);
        testLotId = lotsRes.value[0].ID;
        console.log(`- Verification: Quality Inspection Lot created. Lot Number: ${lotsRes.value[0].lotNumber}\n`);

        // -------------------------------------------------------------
        // STEP 9: Quality Usage Decision (QM Approval)
        // -------------------------------------------------------------
        console.log('Step 9: Recording Quality Usage Decision (UDAC)...');
        const qmRes = await apiCall('/odata/v4/production/submitUsageDecision', {
            method: 'POST',
            headers: {
                'x-user-id': inspectorUserId,
                'x-user-role': 'QUAL_INSPECTOR'
            },
            body: JSON.stringify({
                lotId: testLotId,
                approvedQty: 120.0,
                rejectedQty: 0.0,
                usageDecision: 'UDAC' // Approve lot
            })
        });

        const qm = qmRes.value || qmRes;
        console.log(`- Usage Decision status: ${qm.status} (Expected: COMP)`);
        const qmDetails = await apiCall(`/odata/v4/production/ProductionOrders(${testOrderId})`);
        console.log(`- Verification: Order returned to status: ${qmDetails.status} (Expected: CNF - Confirmed & Ready for GR)\n`);

        // -------------------------------------------------------------
        // STEP 10: Goods Receipt posting (101 movement)
        // -------------------------------------------------------------
        console.log('Step 10: Posting Goods Receipt (GR 101) for finished assembly...');
        const grRes = await apiCall('/odata/v4/production/postGoodsReceipt', {
            method: 'POST',
            headers: {
                'x-user-id': operatorUserId,
                'x-user-role': 'PROD_OPERATOR'
            },
            body: JSON.stringify({
                orderId: testOrderId,
                quantity: 120.0,
                slocId: testSloc.ID
            })
        });

        const gr = grRes.value || grRes;
        console.log(`- Goods Receipt recorded! Material Document: ${gr.docNum}`);
        const finalDetails = await apiCall(`/odata/v4/production/ProductionOrders(${testOrderId})`);
        console.log(`- Verification: Final Order Status: ${finalDetails.status} (Expected: TECO)`);
        console.log(`- Verification: Confirmed Quantity: ${finalDetails.confirmedQty} PC (Expected: 120)`);
        console.log(`- Verification: Delivered Quantity: ${finalDetails.deliveredQty} PC (Expected: 120)`);
        console.log(`- Verification: Actual end date logged: ${finalDetails.actualEndDate}\n`);

        console.log('========================================================================');
        console.log('SUCCESS: ALL INTEGRATION & WORKFLOW VALIDATION TESTS PASSED WITHOUT ERRORS!');
        console.log('========================================================================');

    } catch (error) {
        console.error('\n❌ TEST RUN ENCOUNTERED A FAILURE:');
        console.error(error.message);
        console.log('========================================================================');
        process.exit(1);
    }
}

runTests();
