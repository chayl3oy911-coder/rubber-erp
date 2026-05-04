/**
 * Purchase Return — module-local i18n dictionary.
 * Same shape and pattern as `purchase/i18n.ts`. Thai is the default.
 */

export type PurchaseReturnLocale = "th" | "en";
export const DEFAULT_PURCHASE_RETURN_LOCALE: PurchaseReturnLocale = "th";

type StatusDict = {
  DRAFT: string;
  CONFIRMED: string;
  CANCELLED: string;
};

type ReasonDict = {
  PRODUCT_ISSUE: string;
  QC_ERROR: string;
  WRONG_ENTRY: string;
  SUPPLIER_RETURN: string;
  OTHER: string;
};

type RefundStatusDict = {
  PENDING: string;
  NOT_REQUIRED: string;
  REFUNDED: string;
  CREDITED: string;
};

type PurchaseReturnDict = {
  module: {
    name: string;
    short: string;
  };
  page: {
    listTitle: string;
    listSubtitle: string;
    newTitle: string;
    newSubtitle: string;
    detailTitle: string;
  };
  status: StatusDict;
  reason: ReasonDict;
  refundStatus: RefundStatusDict;
  fields: {
    returnNo: string;
    branch: string;
    purchaseTicket: string;
    stockLot: string;
    customer: string;
    reasonType: string;
    reasonNote: string;
    returnWeight: string;
    returnCostAmount: string;
    refundStatus: string;
    refundedAmount: string;
    createdAt: string;
    createdBy: string;
    confirmedAt: string;
    confirmedBy: string;
    cancelledAt: string;
    cancelledBy: string;
    cancelReason: string;
  };
  buttons: {
    create: string;
    saveDraft: string;
    confirm: string;
    cancelDraft: string;
    backToList: string;
  };
  hints: {
    reasonNoteOther: string;
    weightHint: string;
    confirmIrreversible: string;
  };
  empty: {
    list: string;
    noLot: string;
  };
  errors: {
    notFound: string;
    branchMismatch: string;
    notDraft: string;
    alreadyConfirmed: string;
    alreadyCancelled: string;
    weightTooLarge: string;
    weightNotPositive: string;
    lotInactive: string;
    lotCancelled: string;
    purchaseNotApproved: string;
    intakeNotReceived: string;
    reasonRequired: string;
    cancelReasonTooShort: string;
    reasonNoteRequired: string;
    movementConflict: string;
  };
};

const TH: PurchaseReturnDict = {
  module: { name: "การคืนสินค้า", short: "คืนสินค้า" },
  page: {
    listTitle: "การคืนสินค้า",
    listSubtitle: "รายการคืนสินค้าจาก Stock ที่รับเข้าจากใบรับซื้อ",
    newTitle: "สร้างเอกสารคืนสินค้า",
    newSubtitle: "เลือก StockLot ที่ต้องการคืน — จะสร้างเป็น Draft ก่อน",
    detailTitle: "รายละเอียดการคืนสินค้า",
  },
  status: {
    DRAFT: "Draft",
    CONFIRMED: "ยืนยันแล้ว",
    CANCELLED: "ยกเลิกแล้ว",
  },
  reason: {
    PRODUCT_ISSUE: "สินค้ามีปัญหา",
    QC_ERROR: "QC ผิดพลาด",
    WRONG_ENTRY: "บันทึกผิด",
    SUPPLIER_RETURN: "ผู้ขายขอคืน",
    OTHER: "อื่น ๆ",
  },
  refundStatus: {
    PENDING: "รอการคืนเงิน",
    NOT_REQUIRED: "ไม่ต้องคืน (ยังไม่จ่าย)",
    REFUNDED: "คืนเงินแล้ว",
    CREDITED: "ใช้เครดิตแทน",
  },
  fields: {
    returnNo: "เลขที่เอกสาร",
    branch: "สาขา",
    purchaseTicket: "ใบรับซื้อ",
    stockLot: "Stock Lot",
    customer: "ผู้ขาย",
    reasonType: "เหตุผลที่คืน",
    reasonNote: "บันทึกเพิ่มเติม",
    returnWeight: "น้ำหนักที่คืน (กก.)",
    returnCostAmount: "ต้นทุนที่คืน (บาท)",
    refundStatus: "สถานะการคืนเงิน",
    refundedAmount: "ยอดคืนเงิน",
    createdAt: "สร้างเมื่อ",
    createdBy: "สร้างโดย",
    confirmedAt: "ยืนยันเมื่อ",
    confirmedBy: "ยืนยันโดย",
    cancelledAt: "ยกเลิกเมื่อ",
    cancelledBy: "ยกเลิกโดย",
    cancelReason: "เหตุผลที่ยกเลิก",
  },
  buttons: {
    create: "สร้างเอกสารคืนสินค้า",
    saveDraft: "บันทึก Draft",
    confirm: "ยืนยันการคืน",
    cancelDraft: "ยกเลิก Draft",
    backToList: "← กลับไปหน้ารายการ",
  },
  hints: {
    reasonNoteOther:
      "ต้องระบุรายละเอียดเมื่อเลือก \"อื่น ๆ\" (อย่างน้อย 5 ตัวอักษร)",
    weightHint: "น้ำหนักต้องมากกว่า 0 และไม่เกินน้ำหนักคงเหลือของ Lot",
    confirmIrreversible:
      "ยืนยันแล้วจะไม่สามารถย้อนกลับได้ — ระบบจะหัก Stock ทันที",
  },
  empty: {
    list: "ยังไม่มีเอกสารคืนสินค้า",
    noLot: "ไม่พบ StockLot ที่ระบุ",
  },
  errors: {
    notFound: "ไม่พบเอกสารคืนสินค้า",
    branchMismatch: "เอกสารนี้อยู่คนละสาขากับ Stock Lot ที่เลือก",
    notDraft: "เอกสารนี้ไม่อยู่ในสถานะ Draft",
    alreadyConfirmed: "เอกสารนี้ถูกยืนยันแล้ว",
    alreadyCancelled: "เอกสารนี้ถูกยกเลิกแล้ว",
    weightTooLarge: "น้ำหนักที่คืนเกินน้ำหนักคงเหลือของ Lot",
    weightNotPositive: "น้ำหนักที่คืนต้องมากกว่า 0",
    lotInactive: "Stock Lot นี้ไม่พร้อมใช้งาน",
    lotCancelled: "Stock Lot นี้ถูกยกเลิกแล้ว",
    purchaseNotApproved:
      "ใบรับซื้ออยู่ในสถานะที่ไม่อนุญาตให้สร้างเอกสารคืน (ต้อง APPROVED)",
    intakeNotReceived:
      "ใบรับซื้อนี้ยังไม่ถูกรับเข้า Stock — ไม่สามารถคืนสินค้าได้",
    reasonRequired: "กรุณาเลือกเหตุผลที่คืน",
    cancelReasonTooShort:
      "กรุณาระบุเหตุผลในการยกเลิกอย่างน้อย 5 ตัวอักษร",
    reasonNoteRequired:
      "กรุณาระบุรายละเอียดเมื่อเลือกเหตุผล \"อื่น ๆ\"",
    movementConflict:
      "ระบบกำลังประมวลผลเอกสารนี้อยู่ — กรุณาลองใหม่อีกครั้ง",
  },
};

const EN: PurchaseReturnDict = {
  module: { name: "Purchase returns", short: "Returns" },
  page: {
    listTitle: "Purchase returns",
    listSubtitle: "Reverse-flow records for stock lots received from purchases",
    newTitle: "Create return",
    newSubtitle: "Pick a stock lot to return — saves as Draft first",
    detailTitle: "Purchase return detail",
  },
  status: {
    DRAFT: "Draft",
    CONFIRMED: "Confirmed",
    CANCELLED: "Cancelled",
  },
  reason: {
    PRODUCT_ISSUE: "Product issue",
    QC_ERROR: "QC error",
    WRONG_ENTRY: "Wrong entry",
    SUPPLIER_RETURN: "Supplier return",
    OTHER: "Other",
  },
  refundStatus: {
    PENDING: "Pending",
    NOT_REQUIRED: "Not required (unpaid)",
    REFUNDED: "Refunded",
    CREDITED: "Credited",
  },
  fields: {
    returnNo: "Return No.",
    branch: "Branch",
    purchaseTicket: "Purchase ticket",
    stockLot: "Stock lot",
    customer: "Supplier",
    reasonType: "Reason",
    reasonNote: "Note",
    returnWeight: "Return weight (kg)",
    returnCostAmount: "Returned cost (THB)",
    refundStatus: "Refund status",
    refundedAmount: "Refunded amount",
    createdAt: "Created at",
    createdBy: "Created by",
    confirmedAt: "Confirmed at",
    confirmedBy: "Confirmed by",
    cancelledAt: "Cancelled at",
    cancelledBy: "Cancelled by",
    cancelReason: "Cancel reason",
  },
  buttons: {
    create: "Create return",
    saveDraft: "Save draft",
    confirm: "Confirm return",
    cancelDraft: "Cancel draft",
    backToList: "← Back to list",
  },
  hints: {
    reasonNoteOther: "Note required when reason is \"Other\" (≥ 5 chars)",
    weightHint: "Weight must be > 0 and ≤ lot remaining",
    confirmIrreversible:
      "Confirm is irreversible — stock will be deducted immediately.",
  },
  empty: {
    list: "No purchase returns yet",
    noLot: "Stock lot not found",
  },
  errors: {
    notFound: "Purchase return not found",
    branchMismatch: "Document and stock lot are in different branches",
    notDraft: "Document is not in Draft status",
    alreadyConfirmed: "Document is already confirmed",
    alreadyCancelled: "Document is already cancelled",
    weightTooLarge: "Return weight exceeds lot remaining",
    weightNotPositive: "Return weight must be greater than 0",
    lotInactive: "Stock lot is not active",
    lotCancelled: "Stock lot is cancelled",
    purchaseNotApproved:
      "Purchase ticket is not in a state that allows returns (must be APPROVED)",
    intakeNotReceived:
      "Purchase ticket has not been received into stock — cannot return",
    reasonRequired: "Please select a return reason",
    cancelReasonTooShort:
      "Please provide a cancel reason (≥ 5 characters)",
    reasonNoteRequired: "Please provide a note when reason is \"Other\"",
    movementConflict:
      "Document is being processed — please retry",
  },
};

const DICTS: Record<PurchaseReturnLocale, PurchaseReturnDict> = {
  th: TH,
  en: EN,
};

export function purchaseReturnT(
  locale: PurchaseReturnLocale = DEFAULT_PURCHASE_RETURN_LOCALE,
): PurchaseReturnDict {
  return DICTS[locale];
}
