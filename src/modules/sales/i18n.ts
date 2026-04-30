/**
 * Sales module — module-local i18n dictionary.
 *
 * Default locale: Thai. Components must never hardcode strings — they go
 * through `salesT()` so locale switching is data-only.
 */

export type SalesLocale = "th" | "en";
export const DEFAULT_SALES_LOCALE: SalesLocale = "th";

type StatusDict = {
  DRAFT: string;
  CONFIRMED: string;
  CANCELLED: string;
};

type SaleTypeDict = {
  SALE: string;
  CONSIGNMENT: string;
};

type SalesDict = {
  page: {
    listTitle: string;
    listSubtitleSuperAdmin: string;
    listSubtitleScoped: (count: number) => string;
    newTitle: string;
    newSubtitle: string;
    detailTitle: string;
    editTitle: string;
    editSubtitle: (status: string) => string;
  };
  fields: {
    salesNo: string;
    branch: string;
    sourceLot: string;
    rubberType: string;
    buyerName: string;
    saleType: string;
    grossWeight: string;
    drcPercent: string;
    drcWeight: string;
    pricePerKg: string;
    grossAmount: string;
    withholdingTaxPercent: string;
    withholdingTaxAmount: string;
    netReceivableAmount: string;
    costPerKg: string;
    costAmount: string;
    profitAmount: string;
    status: string;
    expectedReceiveDate: string;
    receivedAt: string;
    note: string;
    createdAt: string;
    createdBy: string;
    confirmedAt: string;
    confirmedBy: string;
    cancelledAt: string;
    cancelledBy: string;
    cancelReason: string;
    actions: string;
    movementType: string;
    movementQuantity: string;
    movementBefore: string;
    movementAfter: string;
  };
  units: {
    kg: string;
    baht: string;
    bahtPerKg: string;
    percent: string;
  };
  hints: {
    autoSalesNo: string;
    serverComputedDrcWeight: string;
    serverComputedGrossAmount: string;
    serverComputedTax: string;
    serverComputedNet: string;
    serverComputedCost: string;
    serverComputedProfit: string;
    weightDecimals: string;
    priceDecimals: string;
    percentDecimals: string;
    grossDrivesStock: string;
    drcDoesNotDriveStock: string;
    confirmCutsStock: string;
    cancelReversesStock: string;
  };
  placeholders: {
    listSearch: string;
    selectLot: string;
    selectBranch: string;
    selectSaleType: string;
    selectStatus: string;
    buyerName: string;
    note: string;
    cancelReason: string;
  };
  actions: {
    create: string;
    submitCreate: string;
    saveDraft: string;
    confirm: string;
    confirmConfirm: (salesNo: string) => string;
    cancel: string;
    cancelConfirm: string;
    confirmCancelPrompt: (salesNo: string) => string;
    edit: string;
    back: string;
    detail: string;
    saving: string;
    showInactive: string;
    hideInactive: string;
    clear: string;
    prev: string;
    next: string;
  };
  errors: {
    invalidJson: string;
    validation: string;
    notFound: string;
    permissionDenied: string;
    unauthenticated: string;
    branchInvalid: string;
    branchNotInScope: string;
    stockLotIdInvalid: string;
    stockLotNotFound: string;
    stockLotBranchMismatch: string;
    stockLotNotActive: string;
    stockLotInactive: string;
    buyerNameRequired: string;
    buyerNameTooLong: string;
    saleTypeInvalid: string;
    rubberTypeInvalid: string;
    grossPositive: string;
    weightTooManyDecimals: string;
    insufficientStock: string;
    drcRange: string;
    drcTooManyDecimals: string;
    pricePositive: string;
    priceTooManyDecimals: string;
    percentRange: string;
    percentTooManyDecimals: string;
    expectedDateInvalid: string;
    noteTooLong: string;
    statusRequired: string;
    statusInvalid: string;
    statusTransitionForbidden: (from: string, to: string) => string;
    statusFieldsLocked: string;
    cancelReasonRequired: string;
    cancelReasonTooLong: string;
    nothingToUpdate: string;
    fieldsAndStatusMixed: string;
    autoGenFailed: string;
    salesNoConflict: string;
  };
  empty: {
    list: string;
    noResults: (q: string) => string;
    noEligibleLots: string;
    noBranches: string;
    noMovements: string;
  };
  status: StatusDict;
  saleType: SaleTypeDict;
  filters: {
    allStatuses: string;
    allSaleTypes: string;
    allBranches: string;
    dateFrom: string;
    dateTo: string;
  };
  preview: {
    title: string;
    grossWeight: string;
    drcWeight: string;
    grossAmount: string;
    withholdingTaxAmount: string;
    netReceivableAmount: string;
    costPerKg: string;
    costAmount: string;
    profitAmount: string;
    warningInsufficient: string;
  };
  misc: {
    paginationInfo: (from: number, to: number, total: number) => string;
    detailComputedHint: string;
    documentReadyHint: string;
    movementHistoryTitle: string;
    salesSnapshotTitle: string;
  };
};

const TH: SalesDict = {
  page: {
    listTitle: "ใบขาย",
    listSubtitleSuperAdmin: "Super Admin เห็นใบขายทุกสาขา",
    listSubtitleScoped: (count) =>
      `แสดงเฉพาะใบขายในสาขาที่บัญชีของคุณเข้าถึงได้ (${count} สาขา)`,
    newTitle: "เปิดใบขายใหม่",
    newSubtitle:
      "เลือก Stock Lot และระบุข้อมูลขาย ระบบจะออกเลขใบขายให้อัตโนมัติ (สถานะเริ่มต้น: DRAFT)",
    detailTitle: "รายละเอียดใบขาย",
    editTitle: "แก้ไขใบขาย",
    editSubtitle: (status) =>
      `กำลังแก้ไขในสถานะ "${status}" — ฟิลด์ที่แก้ได้ขึ้นกับสถานะ`,
  },
  fields: {
    salesNo: "เลขที่ใบขาย",
    branch: "สาขา",
    sourceLot: "Stock Lot ต้นทาง",
    rubberType: "ชนิดยาง",
    buyerName: "ชื่อโรงงาน/ผู้รับซื้อ",
    saleType: "ประเภทการขาย",
    grossWeight: "น้ำหนักจริง (Wet)",
    drcPercent: "DRC (%)",
    drcWeight: "น้ำหนัก DRC (Dry)",
    pricePerKg: "ราคา/กก. (DRC)",
    grossAmount: "ยอดขายรวม",
    withholdingTaxPercent: "ภาษีหัก ณ ที่จ่าย (%)",
    withholdingTaxAmount: "ยอดภาษีหัก ณ ที่จ่าย",
    netReceivableAmount: "ยอดสุทธิที่รอรับ",
    costPerKg: "ต้นทุน/กก. (Wet)",
    costAmount: "ต้นทุนรวม",
    profitAmount: "กำไรประมาณการ",
    status: "สถานะ",
    expectedReceiveDate: "วันคาดรับเงิน",
    receivedAt: "รับเงินเมื่อ",
    note: "หมายเหตุ",
    createdAt: "เปิดเมื่อ",
    createdBy: "ผู้เปิดใบ",
    confirmedAt: "ยืนยันเมื่อ",
    confirmedBy: "ผู้ยืนยัน",
    cancelledAt: "ยกเลิกเมื่อ",
    cancelledBy: "ผู้ยกเลิก",
    cancelReason: "เหตุผลที่ยกเลิก",
    actions: "การจัดการ",
    movementType: "ประเภท",
    movementQuantity: "จำนวน",
    movementBefore: "ก่อน",
    movementAfter: "หลัง",
  },
  units: {
    kg: "กก.",
    baht: "บาท",
    bahtPerKg: "บาท/กก.",
    percent: "%",
  },
  hints: {
    autoSalesNo: "ระบบจะสร้างเลขที่ใบขายให้อัตโนมัติ (เช่น SAL000001)",
    serverComputedDrcWeight: "ระบบคำนวณจาก น้ำหนักจริง × DRC ÷ 100",
    serverComputedGrossAmount: "ระบบคำนวณจาก น้ำหนัก DRC × ราคา/กก.",
    serverComputedTax: "ระบบคำนวณจาก ยอดขายรวม × ภาษี ÷ 100",
    serverComputedNet: "ระบบคำนวณจาก ยอดขายรวม − ภาษี",
    serverComputedCost: "ระบบคำนวณจาก น้ำหนักจริง × ต้นทุน/กก. ของ Lot",
    serverComputedProfit: "ระบบคำนวณจาก ยอดขายรวม − ต้นทุนรวม",
    weightDecimals: "ทศนิยมได้สูงสุด 2 ตำแหน่ง",
    priceDecimals: "ทศนิยมได้สูงสุด 4 ตำแหน่ง",
    percentDecimals: "ทศนิยมได้สูงสุด 2 ตำแหน่ง",
    grossDrivesStock: "น้ำหนักจริง (Wet) เป็นค่าที่ใช้ตัด Stock เท่านั้น",
    drcDoesNotDriveStock:
      "น้ำหนัก DRC (Dry) ใช้คำนวณยอดขายเท่านั้น ไม่กระทบ Stock",
    confirmCutsStock:
      "เมื่อยืนยันใบขาย ระบบจะตัด Stock อัตโนมัติด้วย SALES_OUT",
    cancelReversesStock:
      "ยกเลิกใบที่ยืนยันแล้ว ระบบจะคืนน้ำหนักกลับเข้า Lot ผ่าน CANCEL_REVERSE",
  },
  placeholders: {
    listSearch: "ค้นหา เลขใบขาย / Lot / ชื่อผู้รับซื้อ",
    selectLot: "— เลือก Stock Lot —",
    selectBranch: "— เลือกสาขา —",
    selectSaleType: "— เลือกประเภท —",
    selectStatus: "ทุกสถานะ",
    buyerName: "เช่น โรงงาน ABC จำกัด",
    note: "บันทึกเพิ่มเติม (ถ้ามี)",
    cancelReason: "ระบุเหตุผลในการยกเลิก",
  },
  actions: {
    create: "+ เปิดใบขาย",
    submitCreate: "บันทึกเป็น Draft",
    saveDraft: "บันทึกการเปลี่ยนแปลง",
    confirm: "ยืนยันใบขาย (ตัด Stock)",
    confirmConfirm: (salesNo) =>
      `ยืนยันใบขาย ${salesNo}? ระบบจะตัด Stock ทันที`,
    cancel: "ยกเลิกใบขาย",
    cancelConfirm: "ยืนยันการยกเลิก",
    confirmCancelPrompt: (salesNo) =>
      `ยืนยันการยกเลิกใบขาย ${salesNo}? ถ้าใบยืนยันแล้ว ระบบจะคืน Stock อัตโนมัติ`,
    edit: "แก้ไข",
    back: "← กลับไปยังรายการ",
    detail: "ดูรายละเอียด",
    saving: "กำลังบันทึก...",
    showInactive: "แสดงที่ปิดใช้งานด้วย",
    hideInactive: "ซ่อนที่ปิดใช้งาน",
    clear: "ล้าง",
    prev: "← ก่อนหน้า",
    next: "ถัดไป →",
  },
  errors: {
    invalidJson: "รูปแบบข้อมูลไม่ถูกต้อง",
    validation: "ข้อมูลไม่ถูกต้อง",
    notFound: "ไม่พบใบขายที่ระบุ",
    permissionDenied: "สิทธิ์ไม่เพียงพอสำหรับการดำเนินการนี้",
    unauthenticated: "ต้องเข้าสู่ระบบก่อนใช้งาน",
    branchInvalid: "รหัสสาขาไม่ถูกต้อง",
    branchNotInScope: "ไม่มีสิทธิ์ดำเนินการในสาขานี้",
    stockLotIdInvalid: "รหัส Stock Lot ไม่ถูกต้อง",
    stockLotNotFound: "ไม่พบ Stock Lot ที่ระบุ",
    stockLotBranchMismatch:
      "Stock Lot ไม่อยู่ในสาขาเดียวกับใบขาย / นอกสาขาที่เข้าถึง",
    stockLotNotActive: "Stock Lot ไม่อยู่ในสถานะ ACTIVE — ไม่สามารถขายได้",
    stockLotInactive: "Stock Lot นี้ถูกปิดใช้งาน",
    buyerNameRequired: "กรุณาระบุชื่อผู้รับซื้อ",
    buyerNameTooLong: "ชื่อผู้รับซื้อยาวเกิน 200 ตัวอักษร",
    saleTypeInvalid: "ประเภทการขายไม่ถูกต้อง",
    rubberTypeInvalid: "ชนิดยางไม่ถูกต้อง",
    grossPositive: "น้ำหนักจริงต้องมากกว่า 0",
    weightTooManyDecimals: "น้ำหนักมีทศนิยมเกิน 2 ตำแหน่ง",
    insufficientStock:
      "น้ำหนักที่ระบุเกินน้ำหนักคงเหลือใน Lot — ไม่สามารถดำเนินการ",
    drcRange: "DRC ต้องอยู่ระหว่าง 0–100",
    drcTooManyDecimals: "DRC มีทศนิยมเกิน 2 ตำแหน่ง",
    pricePositive: "ราคา/กก. ต้องมากกว่า 0",
    priceTooManyDecimals: "ราคา/กก. มีทศนิยมเกิน 4 ตำแหน่ง",
    percentRange: "เปอร์เซ็นต์ต้องอยู่ระหว่าง 0–100",
    percentTooManyDecimals: "เปอร์เซ็นต์มีทศนิยมเกิน 2 ตำแหน่ง",
    expectedDateInvalid: "วันที่คาดรับเงินไม่ถูกต้อง",
    noteTooLong: "หมายเหตุยาวเกิน 1000 ตัวอักษร",
    statusRequired: "กรุณาระบุสถานะ",
    statusInvalid: "สถานะไม่ถูกต้อง",
    statusTransitionForbidden: (from, to) =>
      `ไม่สามารถเปลี่ยนสถานะจาก "${from}" เป็น "${to}"`,
    statusFieldsLocked: "ฟิลด์นี้ถูกล็อกตามสถานะปัจจุบัน",
    cancelReasonRequired: "ต้องระบุเหตุผลเมื่อยกเลิกใบที่ยืนยันแล้ว",
    cancelReasonTooLong: "เหตุผลยาวเกิน 500 ตัวอักษร",
    nothingToUpdate: "ไม่มีข้อมูลที่จะอัปเดต",
    fieldsAndStatusMixed:
      "ห้ามแก้ฟิลด์และเปลี่ยนสถานะในคำขอเดียวกัน กรุณาทำแยก",
    autoGenFailed: "ระบบสร้างเลขที่ใบขายไม่สำเร็จ กรุณาลองอีกครั้ง",
    salesNoConflict: "เลขที่ใบขายชนกัน กรุณาลองอีกครั้ง",
  },
  empty: {
    list: "ยังไม่มีใบขายในระบบ",
    noResults: (q) => `ไม่พบใบขายที่ตรงกับ "${q}"`,
    noEligibleLots:
      "ยังไม่มี Stock Lot ที่ขายได้ (ต้อง ACTIVE และมีน้ำหนักคงเหลือ > 0)",
    noBranches: "บัญชีของคุณยังไม่ได้ผูกสาขา ติดต่อผู้ดูแลระบบ",
    noMovements: "ยังไม่มีการเคลื่อนไหว Stock จากใบขายนี้",
  },
  status: {
    DRAFT: "ร่าง",
    CONFIRMED: "ยืนยันแล้ว",
    CANCELLED: "ยกเลิก",
  },
  saleType: {
    SALE: "ขายขาด",
    CONSIGNMENT: "ฝากขาย",
  },
  filters: {
    allStatuses: "ทุกสถานะ",
    allSaleTypes: "ทุกประเภท",
    allBranches: "ทุกสาขา",
    dateFrom: "ตั้งแต่วันที่",
    dateTo: "ถึงวันที่",
  },
  preview: {
    title: "สรุปการคำนวณ",
    grossWeight: "น้ำหนักจริง (ตัด Stock)",
    drcWeight: "น้ำหนัก DRC (คิดเงิน)",
    grossAmount: "ยอดขายรวม",
    withholdingTaxAmount: "หักภาษี",
    netReceivableAmount: "ยอดสุทธิรอรับ",
    costPerKg: "ต้นทุน/กก.",
    costAmount: "ต้นทุนรวม",
    profitAmount: "กำไรประมาณการ",
    warningInsufficient:
      "น้ำหนักที่ระบุเกินน้ำหนักคงเหลือใน Lot — กรุณาตรวจสอบ",
  },
  misc: {
    paginationInfo: (from, to, total) =>
      `แสดง ${from}–${to} จากทั้งหมด ${total}`,
    detailComputedHint: "ค่าที่คำนวณโดยระบบ — UI ใช้แสดงเท่านั้น",
    documentReadyHint:
      "ข้อมูลใบนี้พร้อมพิมพ์ใบกำกับการขายในอนาคต (ระบบเอกสาร/PDF จะมาภายหลัง)",
    movementHistoryTitle: "การเคลื่อนไหว Stock จากใบขายนี้",
    salesSnapshotTitle: "สรุปยอดและต้นทุน",
  },
};

const EN: SalesDict = {
  page: {
    listTitle: "Sales Orders",
    listSubtitleSuperAdmin: "Super Admin sees sales from all branches",
    listSubtitleScoped: (count) =>
      `Showing only sales in branches you can access (${count} branches)`,
    newTitle: "New sales order",
    newSubtitle:
      "Pick a stock lot and fill the sale info. Sales number is auto-generated. Initial status: DRAFT.",
    detailTitle: "Sales order details",
    editTitle: "Edit sales order",
    editSubtitle: (status) =>
      `Editing in "${status}" — editable fields depend on status`,
  },
  fields: {
    salesNo: "Sale #",
    branch: "Branch",
    sourceLot: "Source lot",
    rubberType: "Rubber type",
    buyerName: "Buyer / factory",
    saleType: "Sale type",
    grossWeight: "Gross weight (wet)",
    drcPercent: "DRC (%)",
    drcWeight: "DRC weight (dry)",
    pricePerKg: "Price / kg (DRC)",
    grossAmount: "Gross amount",
    withholdingTaxPercent: "Withholding tax (%)",
    withholdingTaxAmount: "Withholding tax",
    netReceivableAmount: "Net receivable",
    costPerKg: "Cost / kg (wet)",
    costAmount: "Cost amount",
    profitAmount: "Estimated profit",
    status: "Status",
    expectedReceiveDate: "Expected receive date",
    receivedAt: "Received at",
    note: "Note",
    createdAt: "Created at",
    createdBy: "Created by",
    confirmedAt: "Confirmed at",
    confirmedBy: "Confirmed by",
    cancelledAt: "Cancelled at",
    cancelledBy: "Cancelled by",
    cancelReason: "Cancel reason",
    actions: "Actions",
    movementType: "Type",
    movementQuantity: "Qty",
    movementBefore: "Before",
    movementAfter: "After",
  },
  units: {
    kg: "kg",
    baht: "THB",
    bahtPerKg: "THB/kg",
    percent: "%",
  },
  hints: {
    autoSalesNo: "Sales number is auto-generated (e.g. SAL000001)",
    serverComputedDrcWeight: "Computed: gross weight × DRC ÷ 100",
    serverComputedGrossAmount: "Computed: DRC weight × price per kg",
    serverComputedTax: "Computed: gross amount × withholding ÷ 100",
    serverComputedNet: "Computed: gross amount − withholding tax",
    serverComputedCost: "Computed: gross weight × lot cost per kg",
    serverComputedProfit: "Computed: gross amount − cost amount",
    weightDecimals: "Up to 2 decimal places",
    priceDecimals: "Up to 4 decimal places",
    percentDecimals: "Up to 2 decimal places",
    grossDrivesStock: "Gross weight (wet) is the only value that drives stock.",
    drcDoesNotDriveStock:
      "DRC weight (dry) is for revenue calculation only — never affects stock.",
    confirmCutsStock:
      "Confirming creates a SALES_OUT movement and decrements lot stock.",
    cancelReversesStock:
      "Cancelling a confirmed sale creates a CANCEL_REVERSE movement and restores stock.",
  },
  placeholders: {
    listSearch: "Search sales # / lot # / buyer name",
    selectLot: "— Select stock lot —",
    selectBranch: "— Select branch —",
    selectSaleType: "— Select type —",
    selectStatus: "All statuses",
    buyerName: "e.g. ABC Rubber Co., Ltd.",
    note: "Optional note",
    cancelReason: "Reason for cancellation",
  },
  actions: {
    create: "+ New sale",
    submitCreate: "Save as draft",
    saveDraft: "Save changes",
    confirm: "Confirm sale (cut stock)",
    confirmConfirm: (salesNo) =>
      `Confirm sale ${salesNo}? Stock will be deducted immediately.`,
    cancel: "Cancel sale",
    cancelConfirm: "Confirm cancel",
    confirmCancelPrompt: (salesNo) =>
      `Cancel sale ${salesNo}? Stock will be restored if it was confirmed.`,
    edit: "Edit",
    back: "← Back to list",
    detail: "View",
    saving: "Saving...",
    showInactive: "Show inactive",
    hideInactive: "Hide inactive",
    clear: "Clear",
    prev: "← Prev",
    next: "Next →",
  },
  errors: {
    invalidJson: "Invalid request body",
    validation: "Invalid input",
    notFound: "Sales order not found",
    permissionDenied: "You do not have permission for this action",
    unauthenticated: "Please sign in first",
    branchInvalid: "Invalid branch id",
    branchNotInScope: "You are not allowed to operate in this branch",
    stockLotIdInvalid: "Invalid stock lot id",
    stockLotNotFound: "Stock lot not found",
    stockLotBranchMismatch:
      "Stock lot does not belong to a branch you can access",
    stockLotNotActive: "Stock lot is not ACTIVE — cannot be sold",
    stockLotInactive: "Stock lot is inactive",
    buyerNameRequired: "Buyer name is required",
    buyerNameTooLong: "Buyer name exceeds 200 characters",
    saleTypeInvalid: "Invalid sale type",
    rubberTypeInvalid: "Invalid rubber type",
    grossPositive: "Gross weight must be greater than 0",
    weightTooManyDecimals: "Weight has more than 2 decimal places",
    insufficientStock: "Quantity exceeds remaining weight on the lot",
    drcRange: "DRC must be between 0 and 100",
    drcTooManyDecimals: "DRC has more than 2 decimal places",
    pricePositive: "Price/kg must be greater than 0",
    priceTooManyDecimals: "Price/kg has more than 4 decimal places",
    percentRange: "Percent must be between 0 and 100",
    percentTooManyDecimals: "Percent has more than 2 decimal places",
    expectedDateInvalid: "Invalid expected receive date",
    noteTooLong: "Note exceeds 1000 characters",
    statusRequired: "Status is required",
    statusInvalid: "Invalid status",
    statusTransitionForbidden: (from, to) =>
      `Cannot transition from "${from}" to "${to}"`,
    statusFieldsLocked: "This field is locked by the current status",
    cancelReasonRequired:
      "A cancel reason is required when cancelling a CONFIRMED sale",
    cancelReasonTooLong: "Cancel reason exceeds 500 characters",
    nothingToUpdate: "Nothing to update",
    fieldsAndStatusMixed:
      "Cannot mix field updates with a status change in one request",
    autoGenFailed:
      "Failed to generate a unique sales number — please retry",
    salesNoConflict: "Sales number collision — please retry",
  },
  empty: {
    list: "No sales orders yet",
    noResults: (q) => `No sales match "${q}"`,
    noEligibleLots:
      "No sellable stock lots (need ACTIVE and remaining weight > 0)",
    noBranches: "Your account has no branch assigned. Contact admin.",
    noMovements: "No stock movements from this sale yet",
  },
  status: {
    DRAFT: "Draft",
    CONFIRMED: "Confirmed",
    CANCELLED: "Cancelled",
  },
  saleType: {
    SALE: "Outright sale",
    CONSIGNMENT: "Consignment",
  },
  filters: {
    allStatuses: "All statuses",
    allSaleTypes: "All types",
    allBranches: "All branches",
    dateFrom: "From",
    dateTo: "To",
  },
  preview: {
    title: "Calculation preview",
    grossWeight: "Gross weight (cuts stock)",
    drcWeight: "DRC weight (revenue)",
    grossAmount: "Gross amount",
    withholdingTaxAmount: "Withholding tax",
    netReceivableAmount: "Net receivable",
    costPerKg: "Cost / kg",
    costAmount: "Cost amount",
    profitAmount: "Estimated profit",
    warningInsufficient: "Quantity exceeds remaining weight — please review",
  },
  misc: {
    paginationInfo: (from, to, total) => `Showing ${from}–${to} of ${total}`,
    detailComputedHint: "Server-computed values — display only",
    documentReadyHint:
      "This sale's data is ready for future invoice printing (PDF/document module ships later)",
    movementHistoryTitle: "Stock movements from this sale",
    salesSnapshotTitle: "Amount & cost snapshot",
  },
};

const DICTIONARIES: Record<SalesLocale, SalesDict> = { th: TH, en: EN };

export function salesT(locale: SalesLocale = DEFAULT_SALES_LOCALE): SalesDict {
  return DICTIONARIES[locale];
}
