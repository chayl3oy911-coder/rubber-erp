/**
 * Purchase module — module-local i18n dictionary.
 *
 * Mirrors the pattern used in the Customer module: every UI string lives here
 * so we never hardcode in components/services. Default locale is Thai. When
 * full app-wide i18n lands we can swap `purchaseT()` for the framework's
 * `t()` and re-key the entries — components stay untouched.
 */

export type PurchaseLocale = "th" | "en";

export const DEFAULT_PURCHASE_LOCALE: PurchaseLocale = "th";

type StatusDict = {
  DRAFT: string;
  WAITING_QC: string;
  WAITING_APPROVAL: string;
  APPROVED: string;
  CANCELLED: string;
};

type PurchaseDict = {
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
    ticketNo: string;
    branch: string;
    customer: string;
    rubberType: string;
    grossWeight: string;
    tareWeight: string;
    netWeight: string;
    pricePerKg: string;
    totalAmount: string;
    withholdingTaxPercent: string;
    withholdingTaxAmount: string;
    netPayableAmount: string;
    status: string;
    note: string;
    createdAt: string;
    createdBy: string;
    approvedAt: string;
    approvedBy: string;
    cancelledAt: string;
    cancelledBy: string;
    cancelReason: string;
    actions: string;
  };
  units: {
    kg: string;
    bahtPerKg: string;
    baht: string;
    percent: string;
  };
  hints: {
    autoTicketNo: string;
    serverComputedNet: string;
    serverComputedTotal: string;
    serverComputedTax: string;
    serverComputedNetPayable: string;
    weightDecimals: string;
    priceDecimals: string;
    percentDecimals: string;
    tareOptional: string;
    withholdingDefault0: string;
    statusLockedFields: (status: string) => string;
  };
  placeholders: {
    selectBranch: string;
    selectCustomer: string;
    selectRubberType: string;
    customerSearch: string;
    customerSearchHint: string;
    customerNoMatches: (q: string) => string;
    customerSearching: string;
    customerChange: string;
    note: string;
    cancelReason: string;
    listSearch: string;
    selectStatus: string;
  };
  actions: {
    create: string;
    submitCreate: string;
    saveDraft: string;
    submitForQC: string;
    submitForApproval: string;
    approve: string;
    cancel: string;
    cancelConfirm: string;
    edit: string;
    back: string;
    detail: string;
    saving: string;
    showInactive: string;
    hideInactive: string;
    clear: string;
    prev: string;
    next: string;
    apply: string;
  };
  errors: {
    invalidJson: string;
    validation: string;
    customerRequired: string;
    customerInvalid: string;
    customerInactive: string;
    customerBranchMismatch: string;
    customerSearchFailed: string;
    rubberTypeRequired: string;
    rubberTypeInvalid: string;
    grossPositive: string;
    tareNonNegative: string;
    grossGtTare: string;
    pricePositive: string;
    weightTooManyDecimals: string;
    priceTooManyDecimals: string;
    percentRange: string;
    percentTooManyDecimals: string;
    noteTooLong: string;
    branchRequired: string;
    branchInvalid: string;
    branchNotInScope: string;
    statusRequired: string;
    statusInvalid: string;
    statusTransitionForbidden: (from: string, to: string) => string;
    statusFieldsLocked: string;
    cancelReasonRequired: string;
    notFound: string;
    ticketNoConflict: string;
    autoGenFailed: string;
    nothingToUpdate: string;
    fieldsAndStatusMixed: string;
    permissionDenied: string;
    unauthenticated: string;
  };
  empty: {
    list: string;
    noResults: (q: string) => string;
    noBranches: string;
    noCustomersInBranch: string;
  };
  status: StatusDict;
  badge: {
    active: string;
    inactive: string;
  };
  filters: {
    allStatuses: string;
    allBranches: string;
    dateFrom: string;
    dateTo: string;
  };
  misc: {
    paginationInfo: (from: number, to: number, total: number) => string;
    detailComputedHint: string;
    documentReadyHint: string;
  };
};

const TH: PurchaseDict = {
  page: {
    listTitle: "ใบรับซื้อ",
    listSubtitleSuperAdmin: "Super Admin เห็นใบรับซื้อทุกสาขา",
    listSubtitleScoped: (count) =>
      `แสดงเฉพาะใบรับซื้อในสาขาที่บัญชีของคุณเข้าถึงได้ (${count} สาขา)`,
    newTitle: "เปิดใบรับซื้อใหม่",
    newSubtitle:
      "บันทึกน้ำหนัก/ราคาเริ่มต้น ระบบจะออกเลขใบรับซื้อให้อัตโนมัติ (สถานะเริ่มต้น: DRAFT)",
    detailTitle: "รายละเอียดใบรับซื้อ",
    editTitle: "แก้ไขใบรับซื้อ",
    editSubtitle: (status) =>
      `กำลังแก้ไขในสถานะ "${status}" — ฟิลด์ที่แก้ได้ขึ้นกับสถานะ`,
  },
  fields: {
    ticketNo: "เลขที่ใบรับซื้อ",
    branch: "สาขา",
    customer: "ลูกค้า",
    rubberType: "ชนิดยาง",
    grossWeight: "น้ำหนักรวม (Gross)",
    tareWeight: "น้ำหนักภาชนะ (Tare)",
    netWeight: "น้ำหนักสุทธิ (Net)",
    pricePerKg: "ราคา/กก.",
    totalAmount: "ยอดรวม",
    withholdingTaxPercent: "ภาษีหัก ณ ที่จ่าย (%)",
    withholdingTaxAmount: "ยอดภาษีหัก ณ ที่จ่าย",
    netPayableAmount: "ยอดสุทธิที่ต้องจ่าย",
    status: "สถานะ",
    note: "หมายเหตุ",
    createdAt: "เปิดเมื่อ",
    createdBy: "ผู้เปิดใบ",
    approvedAt: "อนุมัติเมื่อ",
    approvedBy: "ผู้อนุมัติ",
    cancelledAt: "ยกเลิกเมื่อ",
    cancelledBy: "ผู้ยกเลิก",
    cancelReason: "เหตุผลที่ยกเลิก",
    actions: "การจัดการ",
  },
  units: {
    kg: "กก.",
    bahtPerKg: "บาท/กก.",
    baht: "บาท",
    percent: "%",
  },
  hints: {
    autoTicketNo: "ระบบจะสร้างเลขที่ใบรับซื้อให้อัตโนมัติ (เช่น PUR000001)",
    serverComputedNet: "ระบบคำนวณจาก Gross − Tare",
    serverComputedTotal: "ระบบคำนวณจาก Net × ราคา/กก.",
    serverComputedTax: "ระบบคำนวณจาก ยอดรวม × ภาษี ÷ 100",
    serverComputedNetPayable: "ระบบคำนวณจาก ยอดรวม − ภาษีหัก ณ ที่จ่าย",
    weightDecimals: "ทศนิยมได้สูงสุด 2 ตำแหน่ง",
    priceDecimals: "ทศนิยมได้สูงสุด 4 ตำแหน่ง",
    percentDecimals: "ระหว่าง 0–100% ทศนิยมได้สูงสุด 2 ตำแหน่ง",
    tareOptional: "ไม่บังคับ — ถ้าไม่กรอกระบบจะใช้ค่า 0",
    withholdingDefault0: "ค่าเริ่มต้น 0% (เกษตรกรที่ไม่หักภาษี)",
    statusLockedFields: (status) =>
      `ในสถานะ "${status}" ระบบจะล็อกฟิลด์น้ำหนัก/ราคา/ภาษี ห้ามแก้`,
  },
  placeholders: {
    selectBranch: "— เลือกสาขา —",
    selectCustomer: "— เลือกลูกค้า —",
    selectRubberType: "— เลือกชนิดยาง —",
    customerSearch: "ค้นหา รหัส / ชื่อ / เบอร์",
    customerSearchHint: "พิมพ์อย่างน้อย 1 ตัวอักษรเพื่อค้นหาลูกค้า",
    customerNoMatches: (q) => `ไม่พบลูกค้าที่ตรงกับ "${q}"`,
    customerSearching: "กำลังค้นหา...",
    customerChange: "เปลี่ยน",
    note: "บันทึกเพิ่มเติม (ถ้ามี)",
    cancelReason: "ระบุเหตุผลในการยกเลิก",
    listSearch: "ค้นหา เลขที่ / รหัสลูกค้า / ชื่อลูกค้า",
    selectStatus: "ทุกสถานะ",
  },
  actions: {
    create: "+ เปิดใบรับซื้อ",
    submitCreate: "บันทึกเป็น Draft",
    saveDraft: "บันทึกการเปลี่ยนแปลง",
    submitForQC: "ส่งตรวจ QC",
    submitForApproval: "ส่งขออนุมัติ",
    approve: "อนุมัติ",
    cancel: "ยกเลิกใบ",
    cancelConfirm: "ยืนยันการยกเลิก",
    edit: "แก้ไข",
    back: "← กลับไปยังรายการ",
    detail: "ดูรายละเอียด",
    saving: "กำลังบันทึก...",
    showInactive: "แสดงที่ปิดใช้งานด้วย",
    hideInactive: "ซ่อนที่ปิดใช้งาน",
    clear: "ล้าง",
    prev: "← ก่อนหน้า",
    next: "ถัดไป →",
    apply: "ใช้งาน",
  },
  errors: {
    invalidJson: "รูปแบบข้อมูลไม่ถูกต้อง",
    validation: "ข้อมูลไม่ถูกต้อง",
    customerRequired: "กรุณาเลือกลูกค้า",
    customerInvalid: "ข้อมูลลูกค้าไม่ถูกต้อง",
    customerInactive: "ลูกค้านี้ถูกปิดใช้งาน ห้ามใช้สร้างใบใหม่",
    customerBranchMismatch: "ลูกค้าไม่อยู่ในสาขาเดียวกับใบรับซื้อ",
    customerSearchFailed: "ค้นหาลูกค้าไม่สำเร็จ ลองอีกครั้ง",
    rubberTypeRequired: "กรุณาเลือกชนิดยาง",
    rubberTypeInvalid: "ชนิดยางไม่ถูกต้อง",
    grossPositive: "น้ำหนัก Gross ต้องมากกว่า 0",
    tareNonNegative: "น้ำหนัก Tare ต้องไม่ติดลบ",
    grossGtTare: "น้ำหนัก Gross ต้องมากกว่า Tare",
    pricePositive: "ราคา/กก. ต้องมากกว่า 0",
    weightTooManyDecimals: "น้ำหนักมีทศนิยมเกิน 2 ตำแหน่ง",
    priceTooManyDecimals: "ราคา/กก. มีทศนิยมเกิน 4 ตำแหน่ง",
    percentRange: "ภาษีหัก ณ ที่จ่ายต้องอยู่ระหว่าง 0–100",
    percentTooManyDecimals: "ภาษีมีทศนิยมเกิน 2 ตำแหน่ง",
    noteTooLong: "หมายเหตุยาวเกิน 1000 ตัวอักษร",
    branchRequired: "กรุณาเลือกสาขา",
    branchInvalid: "รหัสสาขาไม่ถูกต้อง",
    branchNotInScope: "ไม่มีสิทธิ์เปิดใบรับซื้อในสาขานี้",
    statusRequired: "กรุณาระบุสถานะ",
    statusInvalid: "สถานะไม่ถูกต้อง",
    statusTransitionForbidden: (from, to) =>
      `ไม่สามารถเปลี่ยนสถานะจาก "${from}" เป็น "${to}"`,
    statusFieldsLocked: "ฟิลด์นี้ถูกล็อกตามสถานะปัจจุบัน",
    cancelReasonRequired: "ต้องระบุเหตุผลเมื่อยกเลิกใบที่อนุมัติแล้ว",
    notFound: "ไม่พบใบรับซื้อที่ระบุ",
    ticketNoConflict: "เลขที่ใบรับซื้อชนกัน กรุณาลองอีกครั้ง",
    autoGenFailed: "ระบบสร้างเลขที่ใบรับซื้อไม่สำเร็จ กรุณาลองอีกครั้ง",
    nothingToUpdate: "ไม่มีข้อมูลที่จะอัพเดต",
    fieldsAndStatusMixed:
      "ห้ามแก้ฟิลด์และเปลี่ยนสถานะในคำขอเดียวกัน กรุณาทำแยก",
    permissionDenied: "สิทธิ์ไม่เพียงพอสำหรับการดำเนินการนี้",
    unauthenticated: "ต้องเข้าสู่ระบบก่อนใช้งาน",
  },
  empty: {
    list: "ยังไม่มีใบรับซื้อในระบบ",
    noResults: (q) => `ไม่พบใบรับซื้อที่ตรงกับ "${q}"`,
    noBranches: "บัญชีของคุณยังไม่ได้ผูกสาขา ติดต่อผู้ดูแลระบบ",
    noCustomersInBranch: "ยังไม่มีลูกค้าที่ใช้งานอยู่ในสาขานี้",
  },
  status: {
    DRAFT: "ร่าง",
    WAITING_QC: "รอตรวจ QC",
    WAITING_APPROVAL: "รออนุมัติ",
    APPROVED: "อนุมัติแล้ว",
    CANCELLED: "ยกเลิก",
  },
  badge: {
    active: "ใช้งาน",
    inactive: "ปิดใช้งาน",
  },
  filters: {
    allStatuses: "ทุกสถานะ",
    allBranches: "ทุกสาขา",
    dateFrom: "ตั้งแต่วันที่",
    dateTo: "ถึงวันที่",
  },
  misc: {
    paginationInfo: (from, to, total) =>
      `แสดง ${from}–${to} จากทั้งหมด ${total}`,
    detailComputedHint: "ค่าที่คำนวณโดยระบบ — UI ใช้แสดงเท่านั้น",
    documentReadyHint:
      "ข้อมูลใบนี้พร้อมพิมพ์ใบรับซื้อในอนาคต (ระบบเอกสาร/PDF จะมาภายหลัง)",
  },
};

const EN: PurchaseDict = {
  page: {
    listTitle: "Purchase Tickets",
    listSubtitleSuperAdmin: "Super Admin sees purchases from all branches",
    listSubtitleScoped: (count) =>
      `Showing only purchases in branches you can access (${count} branches)`,
    newTitle: "New purchase ticket",
    newSubtitle:
      "Record initial weights & price. Ticket number is auto-generated. Initial status: DRAFT.",
    detailTitle: "Ticket details",
    editTitle: "Edit ticket",
    editSubtitle: (status) =>
      `Editing in "${status}" — editable fields depend on status`,
  },
  fields: {
    ticketNo: "Ticket #",
    branch: "Branch",
    customer: "Customer",
    rubberType: "Rubber Type",
    grossWeight: "Gross Weight",
    tareWeight: "Tare Weight",
    netWeight: "Net Weight",
    pricePerKg: "Price / kg",
    totalAmount: "Total",
    withholdingTaxPercent: "Withholding Tax (%)",
    withholdingTaxAmount: "Withholding Tax",
    netPayableAmount: "Net Payable",
    status: "Status",
    note: "Note",
    createdAt: "Created at",
    createdBy: "Created by",
    approvedAt: "Approved at",
    approvedBy: "Approved by",
    cancelledAt: "Cancelled at",
    cancelledBy: "Cancelled by",
    cancelReason: "Cancel reason",
    actions: "Actions",
  },
  units: {
    kg: "kg",
    bahtPerKg: "THB/kg",
    baht: "THB",
    percent: "%",
  },
  hints: {
    autoTicketNo: "Ticket number is auto-generated (e.g. PUR000001)",
    serverComputedNet: "Computed by server: Gross − Tare",
    serverComputedTotal: "Computed by server: Net × Price/kg",
    serverComputedTax: "Computed by server: Total × Withholding ÷ 100",
    serverComputedNetPayable: "Computed by server: Total − Withholding",
    weightDecimals: "Up to 2 decimal places",
    priceDecimals: "Up to 4 decimal places",
    percentDecimals: "Between 0–100, up to 2 decimal places",
    tareOptional: "Optional — defaults to 0 if blank",
    withholdingDefault0: "Defaults to 0% (customers exempt from withholding)",
    statusLockedFields: (status) =>
      `In status "${status}" weight/price/tax fields are locked`,
  },
  placeholders: {
    selectBranch: "— Select branch —",
    selectCustomer: "— Select customer —",
    selectRubberType: "— Select rubber type —",
    customerSearch: "Search code / name / phone",
    customerSearchHint: "Type at least 1 character to search customers",
    customerNoMatches: (q) => `No customers match "${q}"`,
    customerSearching: "Searching...",
    customerChange: "Change",
    note: "Optional note",
    cancelReason: "Reason for cancellation",
    listSearch: "Search ticket # / customer code / customer name",
    selectStatus: "All statuses",
  },
  actions: {
    create: "+ New ticket",
    submitCreate: "Save as Draft",
    saveDraft: "Save changes",
    submitForQC: "Submit for QC",
    submitForApproval: "Submit for approval",
    approve: "Approve",
    cancel: "Cancel ticket",
    cancelConfirm: "Confirm cancel",
    edit: "Edit",
    back: "← Back to list",
    detail: "View",
    saving: "Saving...",
    showInactive: "Show inactive",
    hideInactive: "Hide inactive",
    clear: "Clear",
    prev: "← Prev",
    next: "Next →",
    apply: "Apply",
  },
  errors: {
    invalidJson: "Invalid request body",
    validation: "Invalid input",
    customerRequired: "Please select a customer",
    customerInvalid: "Invalid customer",
    customerInactive: "Customer is inactive — cannot create new tickets",
    customerBranchMismatch: "Customer does not belong to the selected branch",
    customerSearchFailed: "Customer search failed — please retry",
    rubberTypeRequired: "Please select a rubber type",
    rubberTypeInvalid: "Invalid rubber type",
    grossPositive: "Gross weight must be greater than 0",
    tareNonNegative: "Tare weight cannot be negative",
    grossGtTare: "Gross weight must exceed tare weight",
    pricePositive: "Price per kg must be greater than 0",
    weightTooManyDecimals: "Weight has more than 2 decimal places",
    priceTooManyDecimals: "Price/kg has more than 4 decimal places",
    percentRange: "Withholding must be between 0–100",
    percentTooManyDecimals: "Withholding has more than 2 decimal places",
    noteTooLong: "Note exceeds 1000 characters",
    branchRequired: "Please select a branch",
    branchInvalid: "Invalid branch id",
    branchNotInScope: "You are not allowed to create tickets in this branch",
    statusRequired: "Status is required",
    statusInvalid: "Invalid status",
    statusTransitionForbidden: (from, to) =>
      `Cannot transition from "${from}" to "${to}"`,
    statusFieldsLocked: "This field is locked by the current status",
    cancelReasonRequired:
      "A cancel reason is required when cancelling an APPROVED ticket",
    notFound: "Ticket not found",
    ticketNoConflict: "Ticket number collision — please retry",
    autoGenFailed: "Failed to generate a unique ticket number — please retry",
    nothingToUpdate: "Nothing to update",
    fieldsAndStatusMixed:
      "Cannot mix field updates with a status change in one request",
    permissionDenied: "You do not have permission for this action",
    unauthenticated: "Please sign in first",
  },
  empty: {
    list: "No purchase tickets yet",
    noResults: (q) => `No tickets match "${q}"`,
    noBranches: "Your account has no branch assigned. Contact admin.",
    noCustomersInBranch: "No active customers in this branch yet",
  },
  status: {
    DRAFT: "Draft",
    WAITING_QC: "Waiting QC",
    WAITING_APPROVAL: "Waiting approval",
    APPROVED: "Approved",
    CANCELLED: "Cancelled",
  },
  badge: {
    active: "Active",
    inactive: "Inactive",
  },
  filters: {
    allStatuses: "All statuses",
    allBranches: "All branches",
    dateFrom: "From",
    dateTo: "To",
  },
  misc: {
    paginationInfo: (from, to, total) => `Showing ${from}–${to} of ${total}`,
    detailComputedHint: "Server-computed values — display only",
    documentReadyHint:
      "This ticket's data is ready for future receipt printing (PDF/document module ships later)",
  },
};

const DICTIONARIES: Record<PurchaseLocale, PurchaseDict> = { th: TH, en: EN };

export function purchaseT(
  locale: PurchaseLocale = DEFAULT_PURCHASE_LOCALE,
): PurchaseDict {
  return DICTIONARIES[locale];
}
