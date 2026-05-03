/**
 * Sales module — module-local i18n dictionary (multi-lot edition).
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
    pickerTitle: string;
    pickerSubtitle: string;
    cartTitle: string;
    cartEmpty: string;
  };
  fields: {
    salesNo: string;
    branch: string;
    rubberType: string;
    buyerName: string;
    saleType: string;
    drcPercent: string;
    drcWeightTotal: string;
    grossWeightTotal: string;
    pricePerKg: string;
    grossAmount: string;
    withholdingTaxPercent: string;
    withholdingTaxAmount: string;
    netReceivableAmount: string;
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
    // ── Lot picker / line table fields ──
    lotNo: string;
    sourceTicket: string;
    customer: string;
    remainingWeight: string;
    effectiveCostPerKg: string;
    lineGrossWeight: string;
    lineCostAmount: string;
    lots: string;
    // ── Receiving (ขายในนาม / บัญชีรับเงิน) ──
    receivingEntity: string;
    receivingEntityType: string;
    receivingTaxId: string;
    receivingBank: string;
    receivingBankAccountNo: string;
    receivingBankAccountName: string;
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
    addLotDefaultsToRemaining: string;
    canSellPartialLot: string;
  };
  placeholders: {
    listSearch: string;
    pickerSearch: string;
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
    addToBill: string;
    alreadyAdded: string;
    useAllRemaining: string;
    removeLine: string;
    loadMore: string;
    saveLines: string;
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
    weightTooManyDecimals: string;
    insufficientStock: string;
    insufficientStockOnLot: (lotNo: string) => string;
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
    linesLocked: string;
    cancelReasonRequired: string;
    cancelReasonTooLong: string;
    nothingToUpdate: string;
    fieldsAndStatusMixed: string;
    autoGenFailed: string;
    salesNoConflict: string;
    linesEmpty: string;
    duplicateLot: string;
    lineGrossPositive: string;
    receivingEntityIdInvalid: string;
    receivingBankAccountIdInvalid: string;
    receivingDefaultMissing: string;
    receivingNotInScope: string;
    receivingInactive: string;
    receivingLockedAfterConfirm: string;
  };
  empty: {
    list: string;
    noResults: (q: string) => string;
    noEligibleLots: string;
    noEligibleLotsForSearch: (q: string) => string;
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
    grossWeightTotal: string;
    drcWeightTotal: string;
    grossAmount: string;
    withholdingTaxAmount: string;
    netReceivableAmount: string;
    costAmount: string;
    profitAmount: string;
    warningInsufficient: string;
    linesCount: (n: number) => string;
  };
  misc: {
    paginationInfo: (from: number, to: number, total: number) => string;
    detailComputedHint: string;
    documentReadyHint: string;
    movementHistoryTitle: string;
    salesSnapshotTitle: string;
    linesSectionTitle: string;
    lotsSummary: (firstLotNo: string, more: number) => string;
    receivingSectionTitle: string;
    receivingPreviewLine: (entityName: string, bankLabel: string) => string;
    receivingMissingCta: string;
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
      "ค้นหา Stock Lot ที่ต้องการขาย กดเพิ่มเข้าบิลแล้วปรับน้ำหนักได้ (สถานะเริ่มต้น: DRAFT)",
    detailTitle: "รายละเอียดใบขาย",
    editTitle: "แก้ไขใบขาย",
    editSubtitle: (status) =>
      `กำลังแก้ไขในสถานะ "${status}" — ฟิลด์ที่แก้ได้ขึ้นกับสถานะ`,
    pickerTitle: "เลือก Stock Lot",
    pickerSubtitle:
      "ค้นหา lotNo / เลขใบรับซื้อ / ชื่อลูกค้า / ชนิดยาง — กด “เพิ่มเข้าบิล” เพื่อใส่ในใบขาย",
    cartTitle: "รายการในบิลขาย",
    cartEmpty: "ยังไม่มี Stock Lot ในบิลนี้ กดเพิ่มจากรายการด้านซ้าย",
  },
  fields: {
    salesNo: "เลขที่ใบขาย",
    branch: "สาขา",
    rubberType: "ชนิดยาง",
    buyerName: "ชื่อโรงงาน/ผู้รับซื้อ",
    saleType: "ประเภทการขาย",
    drcPercent: "DRC (%)",
    drcWeightTotal: "น้ำหนัก DRC รวม",
    grossWeightTotal: "น้ำหนักจริงรวม (Wet)",
    pricePerKg: "ราคา/กก. (DRC)",
    grossAmount: "ยอดขายรวม",
    withholdingTaxPercent: "ภาษีหัก ณ ที่จ่าย (%)",
    withholdingTaxAmount: "ยอดภาษีหัก ณ ที่จ่าย",
    netReceivableAmount: "ยอดสุทธิที่รอรับ",
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
    lotNo: "Lot",
    sourceTicket: "ใบรับซื้อ",
    customer: "ลูกค้า",
    remainingWeight: "คงเหลือ",
    effectiveCostPerKg: "ต้นทุน/กก.",
    lineGrossWeight: "น้ำหนักที่ขาย (Wet)",
    lineCostAmount: "ต้นทุนรายการนี้",
    lots: "Lots",
    receivingEntity: "ขายในนาม",
    receivingEntityType: "ประเภทผู้รับเงิน",
    receivingTaxId: "เลขผู้เสียภาษี",
    receivingBank: "ธนาคาร",
    receivingBankAccountNo: "เลขที่บัญชี",
    receivingBankAccountName: "ชื่อบัญชี",
  },
  units: {
    kg: "กก.",
    baht: "บาท",
    bahtPerKg: "บาท/กก.",
    percent: "%",
  },
  hints: {
    autoSalesNo: "ระบบจะสร้างเลขที่ใบขายให้อัตโนมัติ (เช่น SAL000001)",
    serverComputedDrcWeight: "ระบบคำนวณจาก น้ำหนักจริงรวม × DRC ÷ 100",
    serverComputedGrossAmount: "ระบบคำนวณจาก น้ำหนัก DRC รวม × ราคา/กก.",
    serverComputedTax: "ระบบคำนวณจาก ยอดขายรวม × ภาษี ÷ 100",
    serverComputedNet: "ระบบคำนวณจาก ยอดขายรวม − ภาษี",
    serverComputedCost: "ระบบคำนวณจาก Σ (น้ำหนักจริง × ต้นทุน/กก.) ของแต่ละ Lot",
    serverComputedProfit: "ระบบคำนวณจาก ยอดขายรวม − ต้นทุนรวม",
    weightDecimals: "ทศนิยมได้สูงสุด 2 ตำแหน่ง",
    priceDecimals: "ทศนิยมได้สูงสุด 2 ตำแหน่ง",
    percentDecimals: "ทศนิยมได้สูงสุด 2 ตำแหน่ง",
    grossDrivesStock: "น้ำหนักจริง (Wet) แต่ละ Lot คือค่าที่ใช้ตัด Stock เท่านั้น",
    drcDoesNotDriveStock:
      "DRC% ใช้คำนวณยอดขายระดับบิลเท่านั้น ไม่กระทบ Stock",
    confirmCutsStock:
      "เมื่อยืนยันใบขาย ระบบจะตัด Stock อัตโนมัติด้วย SALES_OUT แยกตาม Lot",
    cancelReversesStock:
      "ยกเลิกใบที่ยืนยันแล้ว ระบบจะคืนน้ำหนักกลับเข้าแต่ละ Lot ผ่าน CANCEL_REVERSE",
    addLotDefaultsToRemaining:
      "กดเพิ่มเข้าบิล ระบบจะใส่น้ำหนักเท่ากับคงเหลือของ Lot นั้นให้ก่อน",
    canSellPartialLot:
      "ขายบางส่วนได้ — แก้ตัวเลขลงเพื่อขายเพียงบางส่วน Lot ที่เหลือยังขายในบิลอื่นต่อได้",
  },
  placeholders: {
    listSearch: "ค้นหา เลขใบขาย / Lot / ชื่อผู้รับซื้อ",
    pickerSearch: "ค้นหา Lot / ใบรับซื้อ / ลูกค้า / ชนิดยาง",
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
    back: "← กลับ",
    detail: "ดูรายละเอียด",
    saving: "กำลังบันทึก...",
    showInactive: "แสดงที่ปิดใช้งานด้วย",
    hideInactive: "ซ่อนที่ปิดใช้งาน",
    clear: "ล้าง",
    prev: "← ก่อนหน้า",
    next: "ถัดไป →",
    addToBill: "+ เพิ่มเข้าบิล",
    alreadyAdded: "อยู่ในบิลแล้ว",
    useAllRemaining: "ใช้ทั้งหมด",
    removeLine: "ลบ",
    loadMore: "โหลดเพิ่ม",
    saveLines: "บันทึกรายการ Lot",
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
    buyerNameRequired: "กรุณากรอกชื่อโรงงาน/ผู้รับซื้อ",
    buyerNameTooLong: "ชื่อโรงงาน/ผู้รับซื้อยาวเกิน 200 ตัวอักษร",
    saleTypeInvalid: "ประเภทการขายไม่ถูกต้อง",
    rubberTypeInvalid: "ชนิดยางไม่ถูกต้อง",
    weightTooManyDecimals: "น้ำหนักมีทศนิยมเกิน 2 ตำแหน่ง",
    insufficientStock:
      "น้ำหนักที่ระบุเกินน้ำหนักคงเหลือใน Lot — ไม่สามารถดำเนินการ",
    insufficientStockOnLot: (lotNo) =>
      `Lot ${lotNo} มีน้ำหนักไม่พอตามที่ระบุ — กรุณาแก้ไขจำนวน`,
    drcRange: "DRC ต้องอยู่ระหว่าง 0–100",
    drcTooManyDecimals: "DRC มีทศนิยมเกิน 2 ตำแหน่ง",
    pricePositive: "ราคา/กก. ต้องมากกว่า 0",
    priceTooManyDecimals: "ราคา/กก. มีทศนิยมเกิน 2 ตำแหน่ง",
    percentRange: "เปอร์เซ็นต์ต้องอยู่ระหว่าง 0–100",
    percentTooManyDecimals: "เปอร์เซ็นต์มีทศนิยมเกิน 2 ตำแหน่ง",
    expectedDateInvalid: "วันที่คาดรับเงินไม่ถูกต้อง",
    noteTooLong: "หมายเหตุยาวเกิน 1000 ตัวอักษร",
    statusRequired: "กรุณาระบุสถานะ",
    statusInvalid: "สถานะไม่ถูกต้อง",
    statusTransitionForbidden: (from, to) =>
      `ไม่สามารถเปลี่ยนสถานะจาก "${from}" เป็น "${to}"`,
    statusFieldsLocked: "ฟิลด์นี้ถูกล็อกตามสถานะปัจจุบัน",
    linesLocked:
      "ใบนี้ยืนยัน/ยกเลิกแล้ว — แก้รายการ Lot ไม่ได้ ถ้าต้องแก้ ให้เปิดบิลใหม่",
    cancelReasonRequired: "ต้องระบุเหตุผลเมื่อยกเลิกใบที่ยืนยันแล้ว",
    cancelReasonTooLong: "เหตุผลยาวเกิน 500 ตัวอักษร",
    nothingToUpdate: "ไม่มีข้อมูลที่จะอัปเดต",
    fieldsAndStatusMixed:
      "ห้ามแก้ฟิลด์และเปลี่ยนสถานะในคำขอเดียวกัน กรุณาทำแยก",
    autoGenFailed: "ระบบสร้างเลขที่ใบขายไม่สำเร็จ กรุณาลองอีกครั้ง",
    salesNoConflict: "เลขที่ใบขายชนกัน กรุณาลองอีกครั้ง",
    linesEmpty: "ต้องมีอย่างน้อย 1 Lot ในใบขาย",
    duplicateLot: "Lot นี้อยู่ในบิลอยู่แล้ว ห้ามเพิ่มซ้ำ",
    lineGrossPositive: "น้ำหนักของแต่ละ Lot ต้องมากกว่า 0",
    receivingEntityIdInvalid: "รหัสผู้รับเงินไม่ถูกต้อง",
    receivingBankAccountIdInvalid: "รหัสบัญชีรับเงินไม่ถูกต้อง",
    receivingDefaultMissing:
      "ยังไม่ได้ตั้งค่าบัญชีรับเงินเริ่มต้นในระบบ — ไปที่หน้าตั้งค่าก่อนเปิดใบขาย",
    receivingNotInScope:
      "บัญชีรับเงินนี้ใช้ในสาขานี้ไม่ได้ — กรุณาเลือกบัญชีอื่น",
    receivingInactive: "บัญชีรับเงินนี้ถูกปิดใช้งาน กรุณาเลือกบัญชีอื่น",
    receivingLockedAfterConfirm:
      "ใบขายยืนยันแล้ว — แก้บัญชีรับเงินไม่ได้ ถ้าต้องแก้ ให้เปิดบิลใหม่",
  },
  empty: {
    list: "ยังไม่มีใบขายในระบบ",
    noResults: (q) => `ไม่พบใบขายที่ตรงกับ "${q}"`,
    noEligibleLots:
      "ยังไม่มี Stock Lot ที่ขายได้ (ต้อง ACTIVE และมีน้ำหนักคงเหลือ > 0)",
    noEligibleLotsForSearch: (q) => `ไม่พบ Stock Lot ที่ตรงกับ "${q}"`,
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
    grossWeightTotal: "น้ำหนักจริงรวม (ตัด Stock)",
    drcWeightTotal: "น้ำหนัก DRC รวม (คิดเงิน)",
    grossAmount: "ยอดขายรวม",
    withholdingTaxAmount: "หักภาษี",
    netReceivableAmount: "ยอดสุทธิรอรับ",
    costAmount: "ต้นทุนรวม",
    profitAmount: "กำไรประมาณการ",
    warningInsufficient:
      "มีบาง Lot ใส่น้ำหนักเกินคงเหลือ — กรุณาแก้ไขก่อนบันทึก",
    linesCount: (n) => `${n} รายการ`,
  },
  misc: {
    paginationInfo: (from, to, total) =>
      `แสดง ${from}–${to} จากทั้งหมด ${total}`,
    detailComputedHint: "ค่าที่คำนวณโดยระบบ — UI ใช้แสดงเท่านั้น",
    documentReadyHint:
      "ข้อมูลใบนี้พร้อมพิมพ์ใบกำกับการขายในอนาคต (ระบบเอกสาร/PDF จะมาภายหลัง)",
    movementHistoryTitle: "การเคลื่อนไหว Stock จากใบขายนี้",
    salesSnapshotTitle: "สรุปยอดและต้นทุน",
    linesSectionTitle: "รายการ Lot ที่ขาย",
    lotsSummary: (firstLotNo, more) =>
      more > 0 ? `${firstLotNo} + อีก ${more} รายการ` : firstLotNo,
    receivingSectionTitle: "ขายในนาม / บัญชีรับเงิน",
    receivingPreviewLine: (entityName, bank) => `${entityName} · ${bank}`,
    receivingMissingCta:
      "ยังไม่มีบัญชีรับเงินที่ใช้ได้ — ไปที่ตั้งค่าเพื่อเพิ่มก่อน",
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
      "Search stock lots, add them to the bill and tweak quantities. Initial status: DRAFT.",
    detailTitle: "Sales order details",
    editTitle: "Edit sales order",
    editSubtitle: (status) =>
      `Editing in "${status}" — editable fields depend on status`,
    pickerTitle: "Pick stock lots",
    pickerSubtitle:
      "Search by lot # / ticket # / customer / rubber type — click \"Add to bill\".",
    cartTitle: "Lots in this bill",
    cartEmpty: "No lots in this bill yet — add from the picker on the left.",
  },
  fields: {
    salesNo: "Sale #",
    branch: "Branch",
    rubberType: "Rubber type",
    buyerName: "Buyer / factory",
    saleType: "Sale type",
    drcPercent: "DRC (%)",
    drcWeightTotal: "DRC weight (total)",
    grossWeightTotal: "Gross weight total (wet)",
    pricePerKg: "Price / kg (DRC)",
    grossAmount: "Gross amount",
    withholdingTaxPercent: "Withholding tax (%)",
    withholdingTaxAmount: "Withholding tax",
    netReceivableAmount: "Net receivable",
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
    lotNo: "Lot",
    sourceTicket: "Source ticket",
    customer: "Customer",
    remainingWeight: "Remaining",
    effectiveCostPerKg: "Cost / kg",
    lineGrossWeight: "Line gross weight",
    lineCostAmount: "Line cost",
    lots: "Lots",
    receivingEntity: "Receiver",
    receivingEntityType: "Receiver type",
    receivingTaxId: "Tax ID",
    receivingBank: "Bank",
    receivingBankAccountNo: "Account #",
    receivingBankAccountName: "Account name",
  },
  units: {
    kg: "kg",
    baht: "THB",
    bahtPerKg: "THB/kg",
    percent: "%",
  },
  hints: {
    autoSalesNo: "Sales number is auto-generated (e.g. SAL000001)",
    serverComputedDrcWeight: "Computed: total gross × DRC ÷ 100",
    serverComputedGrossAmount: "Computed: total DRC weight × price per kg",
    serverComputedTax: "Computed: gross amount × withholding ÷ 100",
    serverComputedNet: "Computed: gross amount − withholding tax",
    serverComputedCost: "Computed: Σ (line gross × line cost / kg)",
    serverComputedProfit: "Computed: gross amount − cost amount",
    weightDecimals: "Up to 2 decimal places",
    priceDecimals: "Up to 2 decimal places",
    percentDecimals: "Up to 2 decimal places",
    grossDrivesStock:
      "Each line's gross weight is the only value that drives stock.",
    drcDoesNotDriveStock:
      "DRC% is for revenue calculation only — never affects stock.",
    confirmCutsStock:
      "Confirming creates one SALES_OUT movement per lot and decrements stock.",
    cancelReversesStock:
      "Cancelling a confirmed sale creates one CANCEL_REVERSE per lot and restores stock.",
    addLotDefaultsToRemaining:
      "Adding a lot defaults the line quantity to that lot's remaining weight.",
    canSellPartialLot:
      "Partial sale supported — lower the quantity, the rest stays sellable.",
  },
  placeholders: {
    listSearch: "Search sales # / lot # / buyer name",
    pickerSearch: "Search lot # / ticket # / customer / rubber type",
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
    back: "← Back",
    detail: "View",
    saving: "Saving...",
    showInactive: "Show inactive",
    hideInactive: "Hide inactive",
    clear: "Clear",
    prev: "← Prev",
    next: "Next →",
    addToBill: "+ Add to bill",
    alreadyAdded: "Already in bill",
    useAllRemaining: "Use all",
    removeLine: "Remove",
    loadMore: "Load more",
    saveLines: "Save lots",
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
    buyerNameRequired: "Please enter buyer/factory name",
    buyerNameTooLong: "Buyer/factory name exceeds 200 characters",
    saleTypeInvalid: "Invalid sale type",
    rubberTypeInvalid: "Invalid rubber type",
    weightTooManyDecimals: "Weight has more than 2 decimal places",
    insufficientStock: "Quantity exceeds remaining weight on the lot",
    insufficientStockOnLot: (lotNo) =>
      `Lot ${lotNo} has insufficient remaining weight`,
    drcRange: "DRC must be between 0 and 100",
    drcTooManyDecimals: "DRC has more than 2 decimal places",
    pricePositive: "Price/kg must be greater than 0",
    priceTooManyDecimals: "Price/kg has more than 2 decimal places",
    percentRange: "Percent must be between 0 and 100",
    percentTooManyDecimals: "Percent has more than 2 decimal places",
    expectedDateInvalid: "Invalid expected receive date",
    noteTooLong: "Note exceeds 1000 characters",
    statusRequired: "Status is required",
    statusInvalid: "Invalid status",
    statusTransitionForbidden: (from, to) =>
      `Cannot transition from "${from}" to "${to}"`,
    statusFieldsLocked: "This field is locked by the current status",
    linesLocked:
      "Lines cannot be edited after confirm/cancel. Open a new bill instead.",
    cancelReasonRequired:
      "A cancel reason is required when cancelling a CONFIRMED sale",
    cancelReasonTooLong: "Cancel reason exceeds 500 characters",
    nothingToUpdate: "Nothing to update",
    fieldsAndStatusMixed:
      "Cannot mix field updates with a status change in one request",
    autoGenFailed:
      "Failed to generate a unique sales number — please retry",
    salesNoConflict: "Sales number collision — please retry",
    linesEmpty: "At least one lot is required",
    duplicateLot: "This lot is already in the bill",
    lineGrossPositive: "Line gross weight must be > 0",
    receivingEntityIdInvalid: "Invalid receiving entity id",
    receivingBankAccountIdInvalid: "Invalid receiving bank account id",
    receivingDefaultMissing:
      "No default receiving account configured — set one in /settings before opening a sale",
    receivingNotInScope:
      "This receiving account is not usable in this branch — pick another",
    receivingInactive: "This receiving account is inactive — pick another",
    receivingLockedAfterConfirm:
      "Confirmed sales cannot have their receiving account changed",
  },
  empty: {
    list: "No sales orders yet",
    noResults: (q) => `No sales match "${q}"`,
    noEligibleLots:
      "No sellable stock lots (need ACTIVE and remaining weight > 0)",
    noEligibleLotsForSearch: (q) => `No lots match "${q}"`,
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
    grossWeightTotal: "Gross weight total (cuts stock)",
    drcWeightTotal: "DRC weight total (revenue)",
    grossAmount: "Gross amount",
    withholdingTaxAmount: "Withholding tax",
    netReceivableAmount: "Net receivable",
    costAmount: "Cost amount",
    profitAmount: "Estimated profit",
    warningInsufficient:
      "Some lots have quantities exceeding remaining weight — fix before saving",
    linesCount: (n) => `${n} lines`,
  },
  misc: {
    paginationInfo: (from, to, total) => `Showing ${from}–${to} of ${total}`,
    detailComputedHint: "Server-computed values — display only",
    documentReadyHint:
      "Ready for future invoice printing (PDF/document module ships later)",
    movementHistoryTitle: "Stock movements from this sale",
    salesSnapshotTitle: "Amount & cost snapshot",
    linesSectionTitle: "Lots in this sale",
    lotsSummary: (firstLotNo, more) =>
      more > 0 ? `${firstLotNo} + ${more} more` : firstLotNo,
    receivingSectionTitle: "Receiver / receiving account",
    receivingPreviewLine: (entityName, bank) => `${entityName} · ${bank}`,
    receivingMissingCta:
      "No usable receiving accounts yet — add one in /settings first",
  },
};

const DICTIONARIES: Record<SalesLocale, SalesDict> = { th: TH, en: EN };

export function salesT(locale: SalesLocale = DEFAULT_SALES_LOCALE): SalesDict {
  return DICTIONARIES[locale];
}
