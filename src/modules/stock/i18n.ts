/**
 * Stock module — module-local i18n dictionary.
 *
 * Default locale: Thai. Components must never hardcode strings — they go
 * through `stockT()` so a future locale switch is purely data-layer.
 *
 * Reason labels deliberately use plain ground-floor language ("น้ำหนักสูญเสีย
 * จากการเก็บ" rather than "WATER_LOSS") because the UI is operated by
 * warehouse staff, not engineers.
 */

export type StockLocale = "th" | "en";
export const DEFAULT_STOCK_LOCALE: StockLocale = "th";

type StatusDict = {
  ACTIVE: string;
  DEPLETED: string;
  CANCELLED: string;
};

type MovementTypeDict = {
  PURCHASE_IN: string;
  ADJUST_IN: string;
  ADJUST_OUT: string;
  SALES_OUT: string;
  PRODUCTION_OUT: string;
  PRODUCTION_IN: string;
  CANCEL_REVERSE: string;
  PURCHASE_RETURN_OUT: string;
};

type ReasonDict = {
  WATER_LOSS: string;
  DAMAGE: string;
  SCALE_ERROR: string;
  MANUAL_CORRECTION: string;
  OTHER: string;
};

type StockDict = {
  page: {
    listTitle: string;
    listSubtitleSuperAdmin: string;
    listSubtitleScoped: (count: number) => string;
    detailTitle: string;
    fromPurchaseTitle: string;
    fromPurchaseSubtitle: string;
    movementHistoryTitle: string;
    adjustSectionTitle: string;
  };
  fields: {
    lotNo: string;
    branch: string;
    sourceTicket: string;
    customer: string;
    rubberType: string;
    initialWeight: string;
    remainingWeight: string;
    /** ต้นทุนรับเข้ารวม (landed total at receive time) */
    initialCostAmount: string;
    /** ราคาซื้อ/กก. (landed rate at receive time) */
    initialCostPerKg: string;
    /** ต้นทุนคงเหลือ (current costAmount — decreases on SALES_OUT) */
    costAmount: string;
    /** ต้นทุนปัจจุบัน/กก. (current effectiveCostPerKg) */
    effectiveCostPerKg: string;
    status: string;
    createdAt: string;
    createdBy: string;
    movementType: string;
    movementQuantity: string;
    movementBefore: string;
    movementAfter: string;
    reasonType: string;
    note: string;
    actions: string;
    adjustmentDirection: string;
    quantity: string;
    netWeight: string;
    totalAmount: string;
    pricePerKg: string;
  };
  units: {
    kg: string;
    baht: string;
    bahtPerKg: string;
  };
  hints: {
    autoLotNo: string;
    serverComputedCostPerKg: string;
    serverComputedAfter: string;
    weightDecimals: string;
    waterLossExplain: string;
    adjustmentNoteRequired: string;
    fromPurchaseExplain: string;
  };
  placeholders: {
    listSearch: string;
    fromPurchaseSearch: string;
    selectRubberType: string;
    selectStatus: string;
    selectReason: string;
    note: string;
  };
  actions: {
    detail: string;
    adjust: string;
    fromPurchase: string;
    createLot: string;
    createLotConfirm: string;
    confirmCreateLotPrompt: (ticketNo: string) => string;
    submitAdjust: string;
    confirmAdjustPrompt: (
      direction: "ADJUST_IN" | "ADJUST_OUT",
      qty: string,
    ) => string;
    backToList: string;
    backToDetail: string;
    viewSourceTicket: string;
    showInactive: string;
    hideInactive: string;
    clear: string;
    prev: string;
    next: string;
    // Step 11 — stock intake
    bulkCreateAll: string;
    bulkCreateSelected: string;
    selectAll: string;
    deselectAll: string;
    skipIntake: string;
    confirmSkipIntake: string;
    cancelSkipIntake: string;
    confirmSkipIntakePrompt: (ticketNo: string) => string;
    confirmBulkCreatePrompt: (count: number) => string;
    undoSkipIntake: string;
    confirmUndoSkipPrompt: (ticketNo: string) => string;
    viewPending: string;
    viewSkipped: string;
    submitting: string;
  };
  errors: {
    invalidJson: string;
    validation: string;
    notFound: string;
    permissionDenied: string;
    unauthenticated: string;
    branchInvalid: string;
    branchNotInScope: string;
    purchaseTicketIdInvalid: string;
    purchaseTicketNotFound: string;
    purchaseTicketBranchMismatch: string;
    purchaseTicketNotApproved: string;
    purchaseTicketInactive: string;
    stockLotIdInvalid: string;
    stockLotAlreadyExists: string;
    quantityPositive: string;
    quantityTooManyDecimals: string;
    insufficientStock: string;
    reasonRequired: string;
    reasonInvalid: string;
    noteRequired: string;
    noteTooLong: string;
    adjustmentDirectionInvalid: string;
    autoGenFailed: string;
    statusInvalid: string;
    rubberTypeInvalid: string;
    cannotAdjustDepleted: string;
    // Step 11 — stock intake
    intakeViewInvalid: string;
    bulkTicketIdsEmpty: string;
    bulkTicketIdsTooMany: string;
    skipReasonTooShort: string;
    skipReasonTooLong: string;
    intakeAlreadyReceived: string;
    intakeAlreadySkipped: string;
    intakeNotSkipped: string;
  };
  empty: {
    list: string;
    noResults: (q: string) => string;
    noMovements: string;
    fromPurchaseEmpty: string;
    fromPurchaseNoResults: (q: string) => string;
    skippedEmpty: string;
  };
  status: StatusDict;
  movementType: MovementTypeDict;
  reason: ReasonDict;
  filters: {
    allStatuses: string;
    allRubberTypes: string;
    allBranches: string;
  };
  adjustment: {
    directionIn: string;
    directionOut: string;
    previewBefore: string;
    previewAfter: string;
    previewCostPerKg: string;
    previewWarningInsufficient: string;
  };
  misc: {
    paginationInfo: (from: number, to: number, total: number) => string;
    detailComputedHint: string;
    primaryBadge: string;
    // Step 11 — stock intake
    pendingCount: (n: number) => string;
    skippedCount: (n: number) => string;
    selectedCount: (n: number) => string;
    skipReasonLabel: string;
    skipReasonPlaceholder: string;
    skipReasonHelp: string;
    skippedAt: (iso: string) => string;
    skippedReason: (text: string) => string;
    intakeStatusReceived: string;
    intakeStatusPending: string;
    intakeStatusSkipped: string;
    toastBulkSuccess: (n: number) => string;
    toastBulkPartial: (success: number, failed: number) => string;
    toastBulkAllFailed: (n: number) => string;
    toastSingleSuccess: (lotNo: string) => string;
    toastSkipSuccess: (ticketNo: string) => string;
    toastUndoSkipSuccess: (ticketNo: string) => string;
    toastDismiss: string;
    failureLine: (ticketNo: string, reason: string) => string;
  };
};

const TH: StockDict = {
  page: {
    listTitle: "สต็อก (Stock Lot)",
    listSubtitleSuperAdmin: "Super Admin เห็น Stock Lot ทุกสาขา",
    listSubtitleScoped: (count) =>
      `แสดงเฉพาะ Stock Lot ในสาขาที่บัญชีของคุณเข้าถึงได้ (${count} สาขา)`,
    detailTitle: "รายละเอียด Stock Lot",
    fromPurchaseTitle: "รับเข้า Stock จากใบรับซื้อ",
    fromPurchaseSubtitle:
      "เลือกใบรับซื้อที่อนุมัติแล้วและยังไม่ได้รับเข้า Stock เพื่อสร้าง Lot ใหม่",
    movementHistoryTitle: "ประวัติการเคลื่อนไหว",
    adjustSectionTitle: "ปรับ Stock",
  },
  fields: {
    lotNo: "เลข Lot",
    branch: "สาขา",
    sourceTicket: "ใบรับซื้อต้นทาง",
    customer: "ลูกค้า",
    rubberType: "ชนิดยาง",
    initialWeight: "น้ำหนักรับเข้า",
    remainingWeight: "น้ำหนักคงเหลือ",
    initialCostAmount: "ต้นทุนรับเข้ารวม",
    initialCostPerKg: "ราคาซื้อ/กก.",
    costAmount: "ต้นทุนคงเหลือ",
    effectiveCostPerKg: "ต้นทุนปัจจุบัน/กก.",
    status: "สถานะ",
    createdAt: "สร้างเมื่อ",
    createdBy: "ผู้สร้าง",
    movementType: "ประเภท",
    movementQuantity: "จำนวน",
    movementBefore: "ก่อน",
    movementAfter: "หลัง",
    reasonType: "เหตุผล",
    note: "หมายเหตุ",
    actions: "การจัดการ",
    adjustmentDirection: "ทิศทาง",
    quantity: "จำนวน (กก.)",
    netWeight: "น้ำหนักสุทธิ",
    totalAmount: "ยอดรวม",
    pricePerKg: "ราคา/กก.",
  },
  units: {
    kg: "กก.",
    baht: "บาท",
    bahtPerKg: "บาท/กก.",
  },
  hints: {
    autoLotNo: "ระบบจะสร้างเลข Lot ให้อัตโนมัติ (เช่น LOT000001)",
    serverComputedCostPerKg: "ระบบคำนวณจาก ต้นทุนคงเหลือ ÷ น้ำหนักคงเหลือ",
    serverComputedAfter:
      "น้ำหนักหลังคำนวณจาก น้ำหนักคงเหลือ ± จำนวนที่ปรับ",
    weightDecimals: "ทศนิยมได้สูงสุด 2 ตำแหน่ง",
    waterLossExplain:
      "การปรับน้ำหนักนี้จะไม่กระทบใบรับซื้อ — ต้นทุนคงเหลือคงเดิม แต่ต้นทุน/กก. จะเพิ่มขึ้นตามน้ำหนักที่เหลือ",
    adjustmentNoteRequired: "ต้องระบุหมายเหตุทุกครั้งที่ปรับ Stock",
    fromPurchaseExplain:
      "เมื่อกด \"สร้าง Stock Lot\" ระบบจะสร้าง Lot และบันทึก movement ประเภท PURCHASE_IN ในรายการเดียว",
  },
  placeholders: {
    listSearch: "ค้นหา เลข Lot / เลขใบรับซื้อ / ชื่อลูกค้า / รหัสลูกค้า",
    fromPurchaseSearch: "ค้นหา เลขใบรับซื้อ / ชื่อลูกค้า",
    selectRubberType: "ทุกชนิดยาง",
    selectStatus: "ทุกสถานะ",
    selectReason: "— เลือกเหตุผล —",
    note: "เช่น เก็บ 2 วัน น้ำออก หรือ ของเสียจากการขนส่ง",
  },
  actions: {
    detail: "ดูรายละเอียด",
    adjust: "ปรับ Stock",
    fromPurchase: "+ รับเข้า Stock จากใบรับซื้อ",
    createLot: "สร้าง Stock Lot",
    createLotConfirm: "ยืนยันการสร้าง",
    confirmCreateLotPrompt: (ticketNo) =>
      `ยืนยันการรับเข้า Stock จากใบรับซื้อ ${ticketNo}?`,
    submitAdjust: "บันทึกการปรับ Stock",
    confirmAdjustPrompt: (direction, qty) =>
      direction === "ADJUST_IN"
        ? `ยืนยันการเพิ่มน้ำหนัก ${qty} กก. ?`
        : `ยืนยันการลดน้ำหนัก ${qty} กก. ?`,
    backToList: "← กลับไปยังรายการ Stock",
    backToDetail: "← กลับไปยัง Lot",
    viewSourceTicket: "ดูใบรับซื้อ",
    showInactive: "แสดงที่ปิดใช้งานด้วย",
    hideInactive: "ซ่อนที่ปิดใช้งาน",
    clear: "ล้าง",
    prev: "← ก่อนหน้า",
    next: "ถัดไป →",
    bulkCreateAll: "รับเข้า Stock ทั้งหมด",
    bulkCreateSelected: "รับเข้า Stock ที่เลือก",
    selectAll: "เลือกทั้งหมด",
    deselectAll: "ยกเลิกการเลือก",
    skipIntake: "ข้ามการรับเข้า Stock",
    confirmSkipIntake: "ยืนยันข้าม",
    cancelSkipIntake: "ยกเลิก",
    confirmSkipIntakePrompt: (ticketNo) =>
      `ยืนยันข้ามการรับเข้า Stock ของใบ ${ticketNo}?`,
    confirmBulkCreatePrompt: (count) =>
      `ยืนยันการรับเข้า Stock จากใบรับซื้อ ${count} ใบ?`,
    undoSkipIntake: "นำกลับมารอรับเข้า",
    confirmUndoSkipPrompt: (ticketNo) =>
      `ยืนยันนำใบ ${ticketNo} กลับมารอรับเข้า Stock?`,
    viewPending: "รอรับเข้า",
    viewSkipped: "ที่ข้าม",
    submitting: "กำลังบันทึก...",
  },
  errors: {
    invalidJson: "รูปแบบข้อมูลไม่ถูกต้อง",
    validation: "ข้อมูลไม่ถูกต้อง",
    notFound: "ไม่พบ Stock Lot ที่ระบุ",
    permissionDenied: "สิทธิ์ไม่เพียงพอสำหรับการดำเนินการนี้",
    unauthenticated: "ต้องเข้าสู่ระบบก่อนใช้งาน",
    branchInvalid: "รหัสสาขาไม่ถูกต้อง",
    branchNotInScope: "ไม่มีสิทธิ์ในการดำเนินการในสาขานี้",
    purchaseTicketIdInvalid: "รหัสใบรับซื้อไม่ถูกต้อง",
    purchaseTicketNotFound: "ไม่พบใบรับซื้อที่ระบุ",
    purchaseTicketBranchMismatch: "ใบรับซื้อไม่ได้อยู่ในสาขาที่คุณเข้าถึงได้",
    purchaseTicketNotApproved:
      "ใบรับซื้อต้องอยู่ในสถานะ APPROVED ก่อนรับเข้า Stock",
    purchaseTicketInactive: "ใบรับซื้อนี้ถูกปิดใช้งาน",
    stockLotIdInvalid: "รหัส Stock Lot ไม่ถูกต้อง",
    stockLotAlreadyExists:
      "ใบรับซื้อนี้มี Stock Lot อยู่แล้ว ไม่สามารถสร้างซ้ำ",
    quantityPositive: "จำนวนต้องมากกว่า 0",
    quantityTooManyDecimals: "จำนวนมีทศนิยมเกิน 2 ตำแหน่ง",
    insufficientStock:
      "จำนวนที่ปรับออกมากกว่าน้ำหนักคงเหลือ ไม่สามารถทำรายการ",
    reasonRequired: "กรุณาเลือกเหตุผล",
    reasonInvalid: "เหตุผลที่เลือกไม่ถูกต้อง",
    noteRequired: "กรุณาระบุหมายเหตุ",
    noteTooLong: "หมายเหตุยาวเกิน 1000 ตัวอักษร",
    adjustmentDirectionInvalid: "ทิศทางการปรับไม่ถูกต้อง",
    autoGenFailed: "ระบบสร้างเลข Lot ไม่สำเร็จ กรุณาลองอีกครั้ง",
    statusInvalid: "สถานะ Stock Lot ไม่ถูกต้อง",
    rubberTypeInvalid: "ชนิดยางไม่ถูกต้อง",
    cannotAdjustDepleted:
      "Lot นี้หมดแล้ว ไม่สามารถปรับออกเพิ่มได้ (ปรับเข้าเพื่อรับน้ำหนักกลับยังทำได้)",
    intakeViewInvalid: "มุมมองรายการรับเข้าไม่ถูกต้อง",
    bulkTicketIdsEmpty: "กรุณาเลือกใบรับซื้ออย่างน้อย 1 รายการ",
    bulkTicketIdsTooMany: "เลือกได้ไม่เกิน 50 ใบต่อครั้ง",
    skipReasonTooShort: "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร",
    skipReasonTooLong: "เหตุผลยาวเกิน 500 ตัวอักษร",
    intakeAlreadyReceived: "ใบรับซื้อนี้ได้รับเข้า Stock แล้ว",
    intakeAlreadySkipped: "ใบรับซื้อนี้ถูกข้ามการรับเข้าไว้แล้ว",
    intakeNotSkipped: "ใบรับซื้อนี้ไม่ได้อยู่ในสถานะข้ามการรับเข้า",
  },
  empty: {
    list: "ยังไม่มี Stock Lot ในระบบ",
    noResults: (q) => `ไม่พบ Stock Lot ที่ตรงกับ "${q}"`,
    noMovements: "ยังไม่มีประวัติการเคลื่อนไหว",
    fromPurchaseEmpty:
      "ไม่มีใบรับซื้อที่อนุมัติแล้วและรอรับเข้า Stock ในขณะนี้",
    fromPurchaseNoResults: (q) => `ไม่พบใบรับซื้อที่ตรงกับ "${q}"`,
    skippedEmpty: "ยังไม่มีใบรับซื้อที่ถูกข้ามการรับเข้า",
  },
  status: {
    ACTIVE: "ใช้งานได้",
    DEPLETED: "หมดแล้ว",
    CANCELLED: "ยกเลิก",
  },
  movementType: {
    PURCHASE_IN: "รับเข้าจากใบรับซื้อ",
    ADJUST_IN: "ปรับเข้า",
    ADJUST_OUT: "ปรับออก",
    SALES_OUT: "ขายออก",
    PRODUCTION_OUT: "ใช้ในการผลิต",
    PRODUCTION_IN: "ผลิตเข้า",
    CANCEL_REVERSE: "ย้อนยกเลิก",
    PURCHASE_RETURN_OUT: "คืนสินค้าให้ผู้ขาย",
  },
  reason: {
    WATER_LOSS: "น้ำหนักสูญเสียจากการเก็บ",
    DAMAGE: "ของเสียหาย",
    SCALE_ERROR: "ชั่งคลาดเคลื่อน",
    MANUAL_CORRECTION: "ปรับด้วยมือ",
    OTHER: "อื่น ๆ",
  },
  filters: {
    allStatuses: "ทุกสถานะ",
    allRubberTypes: "ทุกชนิดยาง",
    allBranches: "ทุกสาขา",
  },
  adjustment: {
    directionIn: "เพิ่มน้ำหนัก (ปรับเข้า)",
    directionOut: "ลดน้ำหนัก (ปรับออก)",
    previewBefore: "น้ำหนักก่อน",
    previewAfter: "น้ำหนักหลัง",
    previewCostPerKg: "ต้นทุน/กก. ใหม่",
    previewWarningInsufficient: "จำนวนที่ปรับออกเกินน้ำหนักคงเหลือ",
  },
  misc: {
    paginationInfo: (from, to, total) =>
      `แสดง ${from}–${to} จากทั้งหมด ${total}`,
    detailComputedHint: "ค่าที่คำนวณโดยระบบ — UI ใช้แสดงเท่านั้น",
    primaryBadge: "บัญชีหลัก",
    pendingCount: (n) => `รอรับเข้า (${n})`,
    skippedCount: (n) => `ที่ข้าม (${n})`,
    selectedCount: (n) => `เลือกแล้ว ${n}`,
    skipReasonLabel: "เหตุผลที่ข้าม",
    skipReasonPlaceholder: "ระบุเหตุผล (อย่างน้อย 5 ตัวอักษร)",
    skipReasonHelp: "เหตุผลที่ข้ามการรับเข้า — ต้องระบุเพื่อตรวจสอบย้อนหลังได้",
    skippedAt: (iso) => {
      const d = new Date(iso);
      return `ข้ามเมื่อ ${d.toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    },
    skippedReason: (text) => `เหตุผล: ${text}`,
    intakeStatusReceived: "รับเข้าแล้ว",
    intakeStatusPending: "รอรับเข้า",
    intakeStatusSkipped: "ข้ามแล้ว",
    toastBulkSuccess: (n) => `สร้าง Stock Lot สำเร็จ ${n} ใบ`,
    toastBulkPartial: (success, failed) =>
      `สำเร็จ ${success} ใบ · ล้มเหลว ${failed} ใบ`,
    toastBulkAllFailed: (n) => `ล้มเหลวทั้งหมด ${n} ใบ`,
    toastSingleSuccess: (lotNo) => `สร้าง Stock Lot ${lotNo} สำเร็จ`,
    toastSkipSuccess: (ticketNo) => `ข้ามการรับเข้าใบ ${ticketNo} แล้ว`,
    toastUndoSkipSuccess: (ticketNo) =>
      `นำใบ ${ticketNo} กลับมารอรับเข้าแล้ว`,
    toastDismiss: "ปิด",
    failureLine: (ticketNo, reason) => `${ticketNo} — ${reason}`,
  },
};

const EN: StockDict = {
  page: {
    listTitle: "Stock (Lots)",
    listSubtitleSuperAdmin: "Super Admin sees stock lots from all branches",
    listSubtitleScoped: (count) =>
      `Showing only stock lots in branches you can access (${count} branches)`,
    detailTitle: "Stock Lot details",
    fromPurchaseTitle: "Receive Stock from Purchase",
    fromPurchaseSubtitle:
      "Pick an APPROVED purchase ticket that has not yet been received into stock to create a new lot.",
    movementHistoryTitle: "Movement history",
    adjustSectionTitle: "Adjust stock",
  },
  fields: {
    lotNo: "Lot #",
    branch: "Branch",
    sourceTicket: "Source ticket",
    customer: "Customer",
    rubberType: "Rubber type",
    initialWeight: "Initial weight",
    remainingWeight: "Remaining weight",
    initialCostAmount: "Landed cost (total)",
    initialCostPerKg: "Purchase price / kg",
    costAmount: "Remaining cost",
    effectiveCostPerKg: "Current cost / kg",
    status: "Status",
    createdAt: "Created at",
    createdBy: "Created by",
    movementType: "Type",
    movementQuantity: "Qty",
    movementBefore: "Before",
    movementAfter: "After",
    reasonType: "Reason",
    note: "Note",
    actions: "Actions",
    adjustmentDirection: "Direction",
    quantity: "Quantity (kg)",
    netWeight: "Net weight",
    totalAmount: "Total",
    pricePerKg: "Price / kg",
  },
  units: {
    kg: "kg",
    baht: "THB",
    bahtPerKg: "THB/kg",
  },
  hints: {
    autoLotNo: "Lot number is auto-generated (e.g. LOT000001)",
    serverComputedCostPerKg:
      "Server-computed: remaining cost ÷ remaining weight",
    serverComputedAfter: "Server-computed: remaining weight ± adjustment qty",
    weightDecimals: "Up to 2 decimal places",
    waterLossExplain:
      "This adjustment does NOT modify the source purchase ticket. Remaining cost stays the same; current cost per kg rises proportionally.",
    adjustmentNoteRequired: "A note is required for every stock adjustment.",
    fromPurchaseExplain:
      "Clicking \"Create stock lot\" creates the lot and a single PURCHASE_IN movement atomically.",
  },
  placeholders: {
    listSearch: "Search lot # / ticket # / customer name / customer code",
    fromPurchaseSearch: "Search ticket # / customer name",
    selectRubberType: "All rubber types",
    selectStatus: "All statuses",
    selectReason: "— Select reason —",
    note: "e.g. stored 2 days, water loss; or transport damage",
  },
  actions: {
    detail: "View",
    adjust: "Adjust",
    fromPurchase: "+ Receive from purchase",
    createLot: "Create stock lot",
    createLotConfirm: "Confirm create",
    confirmCreateLotPrompt: (ticketNo) =>
      `Create a stock lot from purchase ${ticketNo}?`,
    submitAdjust: "Save adjustment",
    confirmAdjustPrompt: (direction, qty) =>
      direction === "ADJUST_IN"
        ? `Add ${qty} kg to this lot?`
        : `Remove ${qty} kg from this lot?`,
    backToList: "← Back to stock list",
    backToDetail: "← Back to lot",
    viewSourceTicket: "View ticket",
    showInactive: "Show inactive",
    hideInactive: "Hide inactive",
    clear: "Clear",
    prev: "← Prev",
    next: "Next →",
    bulkCreateAll: "Receive all",
    bulkCreateSelected: "Receive selected",
    selectAll: "Select all",
    deselectAll: "Clear selection",
    skipIntake: "Skip stock intake",
    confirmSkipIntake: "Confirm skip",
    cancelSkipIntake: "Cancel",
    confirmSkipIntakePrompt: (ticketNo) =>
      `Skip stock intake for ticket ${ticketNo}?`,
    confirmBulkCreatePrompt: (count) =>
      `Create stock lots for ${count} purchase ticket(s)?`,
    undoSkipIntake: "Re-queue for intake",
    confirmUndoSkipPrompt: (ticketNo) =>
      `Re-queue ticket ${ticketNo} for stock intake?`,
    viewPending: "Pending",
    viewSkipped: "Skipped",
    submitting: "Saving…",
  },
  errors: {
    invalidJson: "Invalid request body",
    validation: "Invalid input",
    notFound: "Stock lot not found",
    permissionDenied: "You do not have permission for this action",
    unauthenticated: "Please sign in first",
    branchInvalid: "Invalid branch id",
    branchNotInScope: "You are not allowed to operate in this branch",
    purchaseTicketIdInvalid: "Invalid purchase ticket id",
    purchaseTicketNotFound: "Purchase ticket not found",
    purchaseTicketBranchMismatch:
      "Purchase ticket does not belong to a branch you can access",
    purchaseTicketNotApproved:
      "Purchase ticket must be APPROVED before being received into stock",
    purchaseTicketInactive: "Purchase ticket is inactive",
    stockLotIdInvalid: "Invalid stock lot id",
    stockLotAlreadyExists:
      "A stock lot already exists for this purchase ticket",
    quantityPositive: "Quantity must be greater than 0",
    quantityTooManyDecimals: "Quantity has more than 2 decimal places",
    insufficientStock:
      "Adjustment exceeds remaining weight — cannot proceed",
    reasonRequired: "Please select a reason",
    reasonInvalid: "Selected reason is invalid",
    noteRequired: "Note is required",
    noteTooLong: "Note exceeds 1000 characters",
    adjustmentDirectionInvalid: "Invalid adjustment direction",
    autoGenFailed: "Failed to generate a unique lot number — please retry",
    statusInvalid: "Invalid stock lot status",
    rubberTypeInvalid: "Invalid rubber type",
    cannotAdjustDepleted:
      "This lot is depleted — cannot remove more (you may add weight back via ADJUST_IN).",
    intakeViewInvalid: "Invalid intake view",
    bulkTicketIdsEmpty: "Select at least one purchase ticket",
    bulkTicketIdsTooMany: "You can select at most 50 tickets per request",
    skipReasonTooShort: "Please provide a reason of at least 5 characters",
    skipReasonTooLong: "Reason must not exceed 500 characters",
    intakeAlreadyReceived: "This purchase ticket is already received into stock",
    intakeAlreadySkipped: "This purchase ticket is already skipped",
    intakeNotSkipped: "This purchase ticket is not in a skipped state",
  },
  empty: {
    list: "No stock lots yet",
    noResults: (q) => `No stock lots match "${q}"`,
    noMovements: "No movements yet",
    fromPurchaseEmpty:
      "There are no APPROVED purchase tickets waiting to be received into stock.",
    fromPurchaseNoResults: (q) => `No tickets match "${q}"`,
    skippedEmpty: "No skipped purchase tickets",
  },
  status: {
    ACTIVE: "Active",
    DEPLETED: "Depleted",
    CANCELLED: "Cancelled",
  },
  movementType: {
    PURCHASE_IN: "Purchase in",
    ADJUST_IN: "Adjust in",
    ADJUST_OUT: "Adjust out",
    SALES_OUT: "Sales out",
    PRODUCTION_OUT: "Production out",
    PRODUCTION_IN: "Production in",
    CANCEL_REVERSE: "Cancel reverse",
    PURCHASE_RETURN_OUT: "Purchase return",
  },
  reason: {
    WATER_LOSS: "Water loss during storage",
    DAMAGE: "Damage",
    SCALE_ERROR: "Scale error",
    MANUAL_CORRECTION: "Manual correction",
    OTHER: "Other",
  },
  filters: {
    allStatuses: "All statuses",
    allRubberTypes: "All rubber types",
    allBranches: "All branches",
  },
  adjustment: {
    directionIn: "Add weight (ADJUST_IN)",
    directionOut: "Remove weight (ADJUST_OUT)",
    previewBefore: "Before",
    previewAfter: "After",
    previewCostPerKg: "New cost / kg",
    previewWarningInsufficient: "Adjustment exceeds remaining weight",
  },
  misc: {
    paginationInfo: (from, to, total) => `Showing ${from}–${to} of ${total}`,
    detailComputedHint: "Server-computed values — display only",
    primaryBadge: "Primary",
    pendingCount: (n) => `Pending (${n})`,
    skippedCount: (n) => `Skipped (${n})`,
    selectedCount: (n) => `${n} selected`,
    skipReasonLabel: "Reason",
    skipReasonPlaceholder: "Reason (at least 5 characters)",
    skipReasonHelp: "Required for audit — explain why intake is skipped.",
    skippedAt: (iso) => {
      const d = new Date(iso);
      return `Skipped on ${d.toLocaleString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    },
    skippedReason: (text) => `Reason: ${text}`,
    intakeStatusReceived: "Received",
    intakeStatusPending: "Pending",
    intakeStatusSkipped: "Skipped",
    toastBulkSuccess: (n) => `Created ${n} stock lot(s)`,
    toastBulkPartial: (success, failed) =>
      `${success} succeeded · ${failed} failed`,
    toastBulkAllFailed: (n) => `All ${n} requests failed`,
    toastSingleSuccess: (lotNo) => `Created stock lot ${lotNo}`,
    toastSkipSuccess: (ticketNo) => `Skipped intake for ticket ${ticketNo}`,
    toastUndoSkipSuccess: (ticketNo) =>
      `Ticket ${ticketNo} re-queued for intake`,
    toastDismiss: "Dismiss",
    failureLine: (ticketNo, reason) => `${ticketNo} — ${reason}`,
  },
};

const DICTIONARIES: Record<StockLocale, StockDict> = { th: TH, en: EN };

export function stockT(locale: StockLocale = DEFAULT_STOCK_LOCALE): StockDict {
  return DICTIONARIES[locale];
}
