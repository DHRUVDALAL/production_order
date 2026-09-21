import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  PageBreak
} from 'docx';
import fs from 'fs';
import path from 'path';

// Define Corporate Palette
const COLOR_NAVY = '082641';
const COLOR_SAP_BLUE = '016CE1';
const COLOR_SKY = '38BDF8';
const COLOR_DARK_TEXT = '1E293B';
const COLOR_MUTED = '64748B';
const COLOR_LIGHT_BG = 'F8FAFC';
const COLOR_BORDER = 'CBD5E1';
const COLOR_CALLOUT_BG = 'F0F4F8';

function textRun(text, options = {}) {
  return new TextRun({
    text,
    font: 'Segoe UI',
    size: options.size || 21, // 10.5 pt
    color: options.color || COLOR_DARK_TEXT,
    bold: options.bold || false,
    italics: options.italics || false,
    ...options
  });
}

function p(text = '', options = {}) {
  const children = typeof text === 'string' ? [textRun(text, options)] : text;
  return new Paragraph({
    children,
    spacing: { after: options.after !== undefined ? options.after : 120, line: 276 },
    alignment: options.alignment || AlignmentType.LEFT,
    ...options
  });
}

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    run: {
      font: 'Segoe UI',
      size: 32, // 16 pt
      bold: true,
      color: COLOR_NAVY
    }
  });
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    run: {
      font: 'Segoe UI',
      size: 26, // 13 pt
      bold: true,
      color: COLOR_SAP_BLUE
    }
  });
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    run: {
      font: 'Segoe UI',
      size: 22, // 11 pt
      bold: true,
      color: COLOR_DARK_TEXT
    }
  });
}

function callout(title, text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_CALLOUT_BG },
            margins: { top: 140, bottom: 140, left: 200, right: 200 },
            borders: {
              top: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_SAP_BLUE }
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `NOTE: ${title}`, bold: true, color: COLOR_NAVY, font: 'Segoe UI', size: 21 })
                ],
                spacing: { after: 60 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text, color: COLOR_DARK_TEXT, font: 'Segoe UI', size: 20 })
                ],
                spacing: { after: 0 }
              })
            ]
          })
        ]
      })
    ]
  });
}

function imageFigure(imageRelativePath, caption, width = 560, height = 350) {
  const fullPath = path.resolve(imageRelativePath);
  if (!fs.existsSync(fullPath)) {
    return p(`[Image placeholder: ${caption}]`, { italics: true, color: COLOR_MUTED });
  }
  const imgData = fs.readFileSync(fullPath);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: imgData,
          transformation: { width, height }
        })
      ],
      spacing: { before: 140, after: 60 }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: caption, italics: true, size: 18, color: COLOR_MUTED, font: 'Segoe UI' })
      ],
      spacing: { after: 160 }
    })
  ];
}

function bullet(text, boldPrefix = '') {
  const runs = [];
  if (boldPrefix) {
    runs.push(textRun(boldPrefix, { bold: true, color: COLOR_NAVY }));
  }
  runs.push(textRun(text));
  return new Paragraph({
    children: runs,
    bullet: { level: 0 },
    spacing: { after: 80, line: 260 }
  });
}

function createTable(headers, rowsData, colWidths = []) {
  const tableRows = [];

  // Header Row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headers.map((h, i) =>
        new TableCell({
          width: colWidths[i] ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
          shading: { fill: COLOR_NAVY },
          margins: { top: 120, bottom: 120, left: 140, right: 140 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', font: 'Segoe UI', size: 20 })]
            })
          ]
        })
      )
    })
  );

  // Data Rows
  rowsData.forEach((row, rowIdx) => {
    const isAlt = rowIdx % 2 === 1;
    tableRows.push(
      new TableRow({
        children: row.map((cellText, i) =>
          new TableCell({
            width: colWidths[i] ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
            shading: { fill: isAlt ? COLOR_LIGHT_BG : 'FFFFFF' },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
              left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
              right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER }
            },
            children: [
              new Paragraph({
                children: [new TextRun({ text: cellText, font: 'Segoe UI', size: 19, color: COLOR_DARK_TEXT })]
              })
            ]
          })
        )
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
}

async function buildCombinedDoc() {
  console.log('Building combined Enterprise Word Document...');

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Segoe UI', size: 21, color: COLOR_DARK_TEXT }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'PRODOPS — Production Planning, Execution & Quality Platform',
                    size: 16,
                    color: COLOR_MUTED,
                    font: 'Segoe UI'
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Abhiyanta India Solutions Pvt. Ltd. | Client Documentation Suite | Page ',
                    size: 16,
                    color: COLOR_MUTED,
                    font: 'Segoe UI'
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: COLOR_MUTED,
                    font: 'Segoe UI'
                  })
                ]
              })
            ]
          })
        },
        children: [
          // ==========================================
          // COVER PAGE
          // ==========================================
          new Paragraph({ spacing: { before: 400, after: 200 } }),
          ...imageFigure('docs/assets/prodops-logo.png', '', 260, 65),
          new Paragraph({ spacing: { after: 300 } }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'PRODOPS',
                size: 56, // 28pt
                bold: true,
                color: COLOR_NAVY,
                font: 'Segoe UI'
              })
            ],
            spacing: { after: 80 }
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'Production Planning, Execution & Quality Platform',
                size: 28, // 14pt
                bold: true,
                color: COLOR_SAP_BLUE,
                font: 'Segoe UI'
              })
            ],
            spacing: { after: 200 }
          }),
          p(
            'Complete Client-Facing Enterprise Documentation Suite comprising Product Overview, Business Process Guide, Practical User Guide, Role & Module Access Guide, and Visual Feature Guide.',
            { size: 22, color: COLOR_MUTED, after: 300 }
          ),

          createTable(
            ['Document Metadata', 'Specification & Value'],
            [
              ['Product Name', 'ProdOps Enterprise Platform'],
              ['Tagline', 'Production Planning, Execution & Quality Platform'],
              ['Developer & Publisher', 'Abhiyanta India Solutions Pvt. Ltd.'],
              ['Product Domain', 'Discrete & Process Manufacturing Operations'],
              ['Target System Alignment', 'Designed for SAP S/4HANA-Oriented Production Environments'],
              ['Target Audience', 'Plant Leadership, Planners, Operators, Inspectors, Storekeepers'],
              ['Document Release', 'Enterprise Edition 2026.1 (Consolidated Master Volume)'],
              ['Confidentiality', 'Commercial Client-Facing Documentation']
            ],
            [35, 65]
          ),

          new Paragraph({ spacing: { after: 200 } }),
          callout(
            'Enterprise Synchronization Posture',
            'ProdOps provides a unified operational workspace designed around SAP S/4HANA production processes. It keeps production orders, component availability, operation confirmations, goods movements, and quality inspection lots synchronized with central enterprise data.'
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // ==========================================
          // MASTER INDEX & TABLE OF CONTENTS
          // ==========================================
          h1('Documentation Suite Index & Master Catalog'),
          p(
            'This consolidated volume gathers the entire official client documentation for ProdOps into an organized reference handbook.'
          ),

          createTable(
            ['Doc #', 'Document Title', 'Primary Audience', 'Key Focus Area'],
            [
              ['Doc 01', 'Product Overview', 'Plant Managers, Executives, Decision Makers', 'Value proposition, manufacturing challenges, business benefits, end-to-end flow'],
              ['Doc 02', 'Business Process Guide', 'Planners, Process Engineers, Supervisors', 'Production order lifecycle (CRTD to CLSD), 3-D status architecture, movements, quality gates'],
              ['Doc 03', 'Practical User Guide', 'Machine Operators, Planners, Storekeepers', 'Screen-by-screen practical instructions, visual callouts, step-by-step procedures'],
              ['Doc 04', 'Role & Module Guide', 'Department Heads, System Admins, HR', '8 business personas, role-to-module matrix, cross-functional collaboration'],
              ['Doc 05', 'Feature & Workflow Guide', 'Operations Leads, CI Teams, Evaluators', 'Deep-dive visual analysis of 15 core manufacturing workflows with real screenshots']
            ],
            [12, 28, 30, 30]
          ),

          new Paragraph({ spacing: { after: 180 } }),
          h2('Platform Reader Guidelines'),
          bullet('For Executive Review: Read Document 01 (Product Overview) and Document 04 (Role Profiles).', 'Executive Briefing: '),
          bullet('For Standard Operating Procedures (SOP): Adopt Document 02 (Business Process Guide).', 'Process Alignment: '),
          bullet('For Shift Training & Onboarding: Use Document 03 (User Guide) as the primary floor handbook.', 'Shop-Floor Operations: '),
          bullet('For System Evaluation: Review Document 05 (Feature & Workflow Guide).', 'Functional Evaluation: '),

          new Paragraph({ children: [new PageBreak()] }),

          // ==========================================
          // DOCUMENT 01: PRODUCT OVERVIEW
          // ==========================================
          h1('Document 01: ProdOps Product Overview'),
          h2('1. Executive Introduction'),
          p(
            'ProdOps is an enterprise-grade Production Planning, Execution & Quality Platform developed by Abhiyanta India Solutions Pvt. Ltd. Designed to work in concert with SAP S/4HANA production environments, ProdOps provides a unified, intuitive workspace that streamlines the entire production order lifecycle.'
          ),
          p(
            'By integrating order scheduling, material availability checks, operation confirmations, goods movements, and quality inspections into an accessible operational cockpit, ProdOps empowers cross-functional teams to eliminate operational latency, reduce paperwork, and achieve complete shop-floor transparency.'
          ),

          ...imageFigure('docs/assets/screenshots/03_dashboard.png', 'Figure 1.1: ProdOps Executive Operational Dashboard'),

          h2('2. Manufacturing Challenges Addressed'),
          bullet('Disparate Operational Information: Production schedules, component stock, and machine runtimes are scattered across disconnected screens.', 'Information Silos: '),
          bullet('Limited Shop-Floor Visibility: Supervisors cannot immediately verify if an order is actively running, delayed by material shortages, or awaiting quality sign-off.', 'Operational Blind Spots: '),
          bullet('Intensive Manual Follow-Up: Production controllers spend hours walking the shop floor, making phone calls, or generating manual shift reports.', 'Manual Overhead: '),
          bullet('Material Movement Blind Spots: Delays in issuing components (261) or receiving finished goods (101) cause discrepancies between physical floor stock and recorded balances.', 'Inventory Disconnect: '),
          bullet('Fragmented Quality Gates: Inspection lot approvals operate outside the production flow, causing delays in clearing finished goods for shipment.', 'Quality Latency: '),

          h2('3. Key Platform Capabilities'),
          bullet('Production Order Monitoring & Search across plants, storage locations, and statuses.', 'Order Cockpit: '),
          bullet('Structured Order Headers covering General, Assignment, Goods Receipt, and Master Data.', 'Order Detail Management: '),
          bullet('Component Reservations & Availability Checks to identify shortages prior to release.', 'Material Availability Engine: '),
          bullet('Operation Confirmations capturing yield, scrap, and actual machine/labor runtimes.', 'Shop-Floor Execution: '),
          bullet('Standardized Goods Movements supporting Movement 261 (Goods Issue) and Movement 101 (Goods Receipt).', 'Inventory Movements: '),
          bullet('Integrated Quality Control supporting In-Process (Type 03) and Post-Production (Type 04) inspections.', 'Quality Assurance: '),

          ...imageFigure('docs/assets/screenshots/04_production_orders_monitor.png', 'Figure 1.2: Central Production Order Monitor with multi-criteria filtering'),

          h2('4. Measurable Business Benefits'),
          createTable(
            ['Operational Dimension', 'Traditional Legacy Operations', 'With ProdOps Platform'],
            [
              ['Operational Visibility', 'Fragmented paper travelers and isolated screens', 'Unified cockpit with live order, yield, and inventory status'],
              ['Material Traceability', 'Delayed consumption postings causing floor stock errors', 'Immediate goods issue (261) and receipt (101) directly linked to orders'],
              ['Decision Velocity', 'Planners rely on end-of-shift reports to catch delays', 'Immediate visibility into bottlenecks, scrap occurrences, and stalled jobs'],
              ['Quality Compliance', 'Disconnected spreadsheets and paper sign-offs', 'Built-in inspection lots (Type 03/04) with formal usage decisions'],
              ['User Productivity', 'Operators navigate complex multi-screen enterprise menus', 'Streamlined, role-tailored screens focused entirely on user tasks'],
              ['Data Integrity', 'High potential for conflicting status overrides', 'Independent 3-dimension status architecture protecting milestones']
            ],
            [25, 37, 38]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          // ==========================================
          // DOCUMENT 02: BUSINESS PROCESS GUIDE
          // ==========================================
          h1('Document 02: Business Process Guide'),
          h2('1. Production Order Lifecycle & System Statuses'),
          p(
            'In discrete manufacturing, a Production Order authorizes the conversion of raw materials into finished marketable goods. ProdOps guides every order through a disciplined chronological status lifecycle:'
          ),

          createTable(
            ['Status Code', 'Status Name', 'Operational Definition & Manufacturing Rules'],
            [
              ['CRTD', 'Created', 'Order is generated with basic dates and target quantity. BOM reservations and routing operations are planned, but floor execution is not yet permitted.'],
              ['MACA', 'Material Availability Checked', 'A formal availability check has evaluated all required components with no shortages detected. Order is cleared for release.'],
              ['MSPT', 'Material Shortage', 'An availability check revealed that one or more components lack stock. Planners must address shortages before line dispatch.'],
              ['REL', 'Released', 'Order is officially released to the plant floor. Component reservations become active for withdrawal, and operations enter operator queues.'],
              ['PCNF', 'Partially Confirmed', 'Shop-floor operators have confirmed partial yield or time against one or more operation steps. Production is underway.'],
              ['CNF', 'Confirmed', 'All planned operations have received final confirmations. Total yield has been fully reported from the shop floor.'],
              ['TECO', 'Technically Completed', 'Physical production is finished. Open reservations are closed, and the order enters financial variance settlement.'],
              ['CLSD', 'Closed', 'The order is financially settled (Actual Costs - Credits = 0) and permanently locked against any further postings.']
            ],
            [15, 25, 60]
          ),

          h2('2. The 3-Dimension Independent Status Architecture'),
          p(
            'To ensure that physical material movements do not accidentally corrupt milestone progress, ProdOps tracks orders across three independent status dimensions:'
          ),
          bullet('Tracks overall manufacturing progress: CRTD -> REL -> PCNF -> CNF -> TECO -> CLSD.', '1. System Operational Status: '),
          bullet('Tracks component withdrawal (NOT_POSTED -> POSTED) via Movement 261 without altering the primary status.', '2. Goods Issue Status: '),
          bullet('Tracks finished product receipt (NOT_POSTED -> POSTED) via Movement 101 into warehouse stock.', '3. Goods Receipt Status: '),

          h2('3. Standardized Goods Movements & Reversals'),
          createTable(
            ['Action Code', 'Transaction Description', 'Movement Type', 'Business Purpose & Impact'],
            [
              ['A07', 'Goods Issue', '261', 'Issues raw materials from warehouse to the production order. Debits order costs and reduces warehouse stock.'],
              ['A01', 'Goods Receipt', '101', 'Receives finished goods into warehouse inventory. Credits order value and increments finished stock.'],
              ['A03', 'Goods Receipt Cancellation', '102', 'Reverses an incorrect goods receipt posting. Reopens open order yield balance.'],
              ['A03', 'Goods Issue Cancellation', '262', 'Returns unused materials from the shop floor back to warehouse stock. Credits material costs.']
            ],
            [12, 28, 15, 45]
          ),

          ...imageFigure('docs/assets/screenshots/12_goods_movement_migo.png', 'Figure 2.1: Standardized Goods Movement interface configured for Movement 261'),

          new Paragraph({ children: [new PageBreak()] }),

          // ==========================================
          // DOCUMENT 03: PRACTICAL USER GUIDE
          // ==========================================
          h1('Document 03: Practical User Guide'),
          p(
            'This practical operational handbook provides screen-by-screen instructions for performing daily tasks inside ProdOps.'
          ),

          h2('Screen 1: Accessing ProdOps & User Authentication'),
          ...imageFigure('docs/assets/screenshots/02_login_screen.png', 'Figure 3.1: ProdOps Sign-In Screen with role-persona selector'),
          p('What This Screen Does: Authenticates enterprise users and routes them to their personalized workspace.', { bold: true }),
          p('When to Use It: At the start of every work shift or when switching operational roles.', { italics: true }),
          bullet('Navigate to the ProdOps portal URL.', '1. '),
          bullet('Enter your enterprise Username and Password, or click a quick-select persona during evaluation.', '2. '),
          bullet('Click Sign In to open your role-tailored dashboard.', '3. '),
          p('Expected Result: User is authenticated and loaded directly into their authorized modules.', { color: COLOR_SAP_BLUE }),

          h2('Screen 2: Production Order Monitor'),
          ...imageFigure('docs/assets/screenshots/04_production_orders_monitor.png', 'Figure 3.2: Production Order Monitor cockpit'),
          p('What This Screen Does: Central cockpit for filtering, searching, and managing all plant production orders.', { bold: true }),
          p('When to Use It: To evaluate order progress, inspect unissued materials, or locate orders for release.', { italics: true }),
          bullet('Enter an order number or material name in the Search Bar.', '1. '),
          bullet('Apply filters: Status (CRTD, REL, PCNF, CNF), Goods Movement, or Manufacturing Plant.', '2. '),
          bullet('Click any Order Number link to open the full order details.', '3. '),
          p('Expected Result: Instant filtering with live status pills and enterprise sync indicators.', { color: COLOR_SAP_BLUE }),

          h2('Screen 3: Creating a Production Order'),
          ...imageFigure('docs/assets/screenshots/05_create_order_modal.png', 'Figure 3.3: Production Order Creation modal'),
          p('What This Screen Does: Generates a new manufacturing order with automated BOM explosion and routing calculation.', { bold: true }),
          p('When to Use It: When demand requirements or stock replenishment triggers a new manufacturing batch.', { italics: true }),
          bullet('Click Create Production Order on the monitor toolbar.', '1. '),
          bullet('Select the Finished Material, Production Plant, and Target Storage Location.', '2. '),
          bullet('Enter Planned Target Quantity and specify Planned Start/Finish dates.', '3. '),
          bullet('Configure float margins (before/after production) and click Create Order.', '4. '),
          p('Expected Result: A 10-digit order is generated in status CRTD with active component reservations.', { color: COLOR_SAP_BLUE }),

          h2('Screen 4: Order Detail & SAP Action Toolbar'),
          ...imageFigure('docs/assets/screenshots/06_order_detail_header.png', 'Figure 3.4: Order Detail Header and Action Toolbar'),
          p('What This Screen Does: Provides 360-degree control of an individual order, including manual sync, release, and scheduling.', { bold: true }),
          p('When to Use It: Whenever managing, releasing, or updating an existing production order.', { italics: true }),
          bullet('Review order metrics across General, Assignment, Goods Receipt, and Master Data tabs.', '1. '),
          bullet('Click "Check Availability" to evaluate component stock in the warehouse.', '2. '),
          bullet('Click "Release Order" to authorize shop-floor execution (status advances to REL).', '3. '),
          p('Expected Result: Order status updates with full audit history and active work center queues.', { color: COLOR_SAP_BLUE }),

          h2('Screen 5: Routing & Work Center Operations'),
          ...imageFigure('docs/assets/screenshots/07_order_detail_operations.png', 'Figure 3.5: Operation routing sequence grid'),
          p('What This Screen Does: Displays chronological operation steps, work center codes, and confirmed yield.', { bold: true }),
          p('When to Use It: To verify which operations are finished, active, or pending on the shop floor.', { italics: true }),
          bullet('Inspect operation sequence numbers (0010, 0020, 0030).', '1. '),
          bullet('Review assigned work centers and planned setup/machine durations.', '2. '),
          bullet('Monitor confirmed yield to detect machine bottlenecks.', '3. '),
          p('Expected Result: Real-time visibility into line progress across all plant work centers.', { color: COLOR_SAP_BLUE }),

          h2('Screen 6: Bill of Materials & Component Overview'),
          ...imageFigure('docs/assets/screenshots/08_order_detail_components.png', 'Figure 3.6: Component overview and withdrawal status'),
          p('What This Screen Does: Tracks component reservations, comparing required vs. withdrawn quantities.', { bold: true }),
          p('When to Use It: To verify component availability prior to release or ensure staging before machine setup.', { italics: true }),
          bullet('Review required quantities calculated from order batch size.', '1. '),
          bullet('Compare required against withdrawn quantities.', '2. '),
          bullet('Verify issuing storage locations for staging.', '3. '),
          p('Expected Result: Complete accountability for raw material consumption and floor stock.', { color: COLOR_SAP_BLUE }),

          h2('Screen 7: Shop-Floor Operation Confirmations'),
          ...imageFigure('docs/assets/screenshots/10_operations_confirmation.png', 'Figure 3.7: Operator confirmation modal'),
          p('What This Screen Does: Captures shop-floor yield, scrap counts, and actual labor/machine runtimes.', { bold: true }),
          p('When to Use It: At the completion of an operation run, at shift change, or after completing a discrete batch.', { italics: true }),
          bullet('Navigate to Confirm Operations (/operations) and locate the target order.', '1. '),
          bullet('Enter confirmed Yield Quantity and rejected Scrap Quantity.', '2. '),
          bullet('Enter actual Time Spent in minutes and check Final Confirmation if the step is complete.', '3. '),
          bullet('Click Confirm Operation to record the posting.', '4. '),
          p('Expected Result: Operation status flips to CNF and order primary status updates immediately.', { color: COLOR_SAP_BLUE }),

          h2('Screen 8: Standardized Goods Movements (MIGO Style)'),
          ...imageFigure('docs/assets/screenshots/12_goods_movement_migo.png', 'Figure 3.8: Standardized Goods Movement interface'),
          p('What This Screen Does: Issues raw materials (261), receives finished products (101), and handles reversals.', { bold: true }),
          p('When to Use It: Whenever moving physical inventory between the warehouse and the production floor.', { italics: true }),
          bullet('Select transaction Goods Issue (A07) with reference to Order (R08).', '1. '),
          bullet('Enter Order Number to load reserved components.', '2. '),
          bullet('Enter actual issued quantities and click Check followed by Post.', '3. '),
          p('Expected Result: A formal Material Document is generated and warehouse inventory balances decrease.', { color: COLOR_SAP_BLUE }),

          h2('Screen 9: Documented Goods Movements Log & Drill-Down'),
          ...imageFigure('docs/assets/screenshots/09_order_detail_goods_movements.png', 'Figure 3.9: Associated goods movements log'),
          p('What This Screen Does: Provides an immutable historical audit log of all inventory transactions on the order.', { bold: true }),
          p('When to Use It: To verify component withdrawals, delivery quantities, or inspect cancellation linkages.', { italics: true }),
          bullet('Scroll to Associated Goods Movements on the order detail page.', '1. '),
          bullet('Click any clickable Material Document Number to open the Drill-Down modal.', '2. '),
          bullet('Review document year, storage locations, and linked reversal documents.', '3. '),
          p('Expected Result: Complete physical and financial traceability for audit compliance.', { color: COLOR_SAP_BLUE }),

          h2('Screen 10: Quality Control & Usage Decisions'),
          ...imageFigure('docs/assets/screenshots/11_quality_control.png', 'Figure 3.10: Quality inspection lot management'),
          p('What This Screen Does: Allows quality inspectors to record test samples and grant formal usage decisions.', { bold: true }),
          p('When to Use It: In-process (Type 03) during active machining, or post-production (Type 04) on finished batches.', { italics: true }),
          bullet('Open Quality Control (/quality) and select the assigned inspection lot.', '1. '),
          bullet('Click Record Results to log inspected samples and defect counts.', '2. '),
          bullet('Click Usage Decision to grant Accepted (UDAC) or Rejected (UDRJ) disposition.', '3. '),
          p('Expected Result: Approved finished goods are cleared for warehouse stocking.', { color: COLOR_SAP_BLUE }),

          new Paragraph({ children: [new PageBreak()] }),

          // ==========================================
          // DOCUMENT 04: ROLE & MODULE GUIDE
          // ==========================================
          h1('Document 04: Role & Module Guide'),
          h2('1. Persona-Driven Design Philosophy'),
          p(
            'ProdOps tailors the operational workspace to the specific responsibilities of each employee. Buttons, navigation menus, and actions that do not pertain to a user role are hidden, preventing errors and speeding up training.'
          ),

          h2('2. Master Role-to-Module Access Matrix'),
          createTable(
            ['Business Role', 'Code', 'Dashboard', 'Orders', 'Detail', 'Operations', 'Quality', 'Movements', 'Inventory'],
            [
              ['Production Planner', 'PROD_PLANNER', 'YES', 'YES', 'YES', 'YES', 'YES', '—', 'YES'],
              ['Plant Supervisor', 'PLANT_SUPV', 'YES', 'YES', 'YES', 'YES', 'YES', '—', 'YES'],
              ['Production Operator', 'PROD_OPERATOR', 'YES', '—', '—', 'YES', '—', '—', '—'],
              ['Quality Inspector', 'QUAL_INSPECTOR', 'YES', '—', '—', '—', 'YES', '—', '—'],
              ['Inventory Manager', 'INV_MANAGER', 'YES', 'YES', 'YES', '—', '—', '—', 'YES'],
              ['Purchaser / Storekeeper', 'PURCHASER', 'YES', '—', '—', '—', '—', 'YES', '—'],
              ['Plant / Operations Manager', 'PLANT_MGR', 'YES', 'YES', 'YES', '—', '—', '—', 'YES'],
              ['System Administrator', 'SYS_ADMIN', 'YES', 'YES', 'YES', 'YES', 'YES', 'YES', 'YES']
            ],
            [22, 16, 9, 8, 8, 10, 9, 9, 9]
          ),

          h2('3. Key Role Profiles'),
          bullet('Responsible for creating orders, checking material availability, setting scheduling dates, and releasing orders to the plant floor.', 'Production Planner: '),
          bullet('Supervises shop-floor lines, handles operational exceptions, verifies yields, and authorizes Technical Completion (TECO).', 'Plant Supervisor: '),
          bullet('Operates machines and assembly lines, reporting confirmed yield, scrap, and actual runtimes against assigned operations.', 'Production Operator: '),
          bullet('Inspects in-process samples (Type 03) and finished production (Type 04), recording test results and granting usage decisions.', 'Quality Inspector: '),
          bullet('Manages raw material staging, component withdrawals (Movement 261), finished goods intake (Movement 101), and reversals.', 'Storekeeper / Purchaser: '),

          new Paragraph({ children: [new PageBreak()] }),

          // ==========================================
          // DOCUMENT 05: FEATURE & WORKFLOW GUIDE
          // ==========================================
          h1('Document 05: Feature & Workflow Guide'),
          p(
            'This visual guide highlights the key functional workflows across the ProdOps platform.'
          ),

          h2('Workflow 1: Material Availability Checking'),
          p(
            'The Material Availability Verification Engine compares required BOM component quantities against unrestricted warehouse inventory before order release. If sufficient stock exists, the order advances to MACA (Material Availability Checked). If shortages exist, status switches to MSPT (Material Shortage) and a Missing Parts List is generated.'
          ),

          h2('Workflow 2: Shop-Floor Operation Confirmations'),
          p(
            'Shop floor operators report progress directly against assigned routing steps. Entering yield, scrap, and machine runtimes debits operational costs to the order and advances milestone progress from REL to PCNF and CNF.'
          ),

          h2('Workflow 3: Integrated Quality Gates'),
          p(
            'Quality lots are generated automatically during execution. Type 03 lots evaluate intermediate machining quality, while Type 04 lots inspect finished goods prior to unrestricted warehouse stocking. Usage decisions (UDAC / UDRJ) enforce strict quality compliance.'
          ),

          h2('Workflow 4: Technical Completion & Closure Safety'),
          p(
            'Before bringing an order to Technical Completion (TECO), ProdOps presents an interactive Pre-Check Safety Modal to verify status eligibility, open confirmations, and reservation clearance. Order Closure (CLSD) verifies that financial balances are settled.'
          ),

          new Paragraph({ spacing: { after: 300 } }),
          callout(
            'Document Governance & Sign-Off',
            'This complete client documentation suite has been verified against the live ProdOps platform by Abhiyanta India Solutions Pvt. Ltd. It reflects all verified business rules, workflows, and operational capabilities.'
          )
        ]
      }
    ]
  });

  const targetPath = path.resolve('docs/PRODOPS_CLIENT_DOCUMENTATION_SUITE.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(targetPath, buffer);
  console.log(`✓ Combined Word document successfully created at: ${targetPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

buildCombinedDoc().catch(err => {
  console.error('Error generating combined document:', err);
  process.exit(1);
});
