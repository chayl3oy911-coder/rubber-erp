/**
 * Farmer module — module-local i18n dictionary.
 *
 * Module-scoped on purpose: full app-wide i18n (locale switching, URL routing)
 * lands later. For now every UI text lives here so we never hardcode strings
 * in components/services. When we adopt next-intl/i18next, swap `farmerT()`
 * for the real `t()` and re-key entries — components stay untouched.
 */

export type FarmerLocale = "th" | "en";

export const DEFAULT_FARMER_LOCALE: FarmerLocale = "th";

type FarmerDict = {
  page: {
    listTitle: string;
    listSubtitleSuperAdmin: string;
    listSubtitleScoped: (count: number) => string;
    newTitle: string;
    newSubtitle: string;
    editTitle: string;
    detailHeading: string;
  };
  fields: {
    code: string;
    fullName: string;
    phone: string;
    nationalId: string;
    bankName: string;
    bankAccountNo: string;
    notes: string;
    branch: string;
    status: string;
    actions: string;
  };
  hints: {
    code: string;
    codeAuto: string;
    optional: string;
    notesOptional: string;
  };
  placeholders: {
    code: string;
    fullName: string;
    phone: string;
    nationalId: string;
    bankAccountNo: string;
    selectBranch: string;
    selectBank: string;
    search: string;
  };
  actions: {
    create: string;
    edit: string;
    submitCreate: string;
    submitUpdate: string;
    saving: string;
    activate: string;
    deactivate: string;
    showInactive: string;
    hideInactive: string;
    back: string;
    search: string;
    clear: string;
    prev: string;
    next: string;
  };
  errors: {
    invalidJson: string;
    validation: string;
    codeFormat: string;
    codeTooLong: string;
    codeAutoGenFailed: string;
    fullNameRequired: string;
    fullNameTooLong: string;
    phoneTooLong: string;
    nationalIdTooLong: string;
    bankInvalid: string;
    bankAccountNoTooLong: string;
    notesTooLong: string;
    branchRequired: string;
    branchInvalid: string;
    branchNotInScope: string;
    notFound: string;
    codeConflict: (code: string) => string;
    nothingToUpdate: string;
    permissionDenied: string;
    unauthenticated: string;
  };
  empty: {
    list: string;
    noBranches: string;
    noResults: (q: string) => string;
  };
  badge: {
    active: string;
    inactive: string;
  };
  misc: {
    branchScope: string;
    superAdminScope: string;
    paginationInfo: (from: number, to: number, total: number) => string;
    rowsPerPage: string;
    branchAllOption: string;
  };
};

const TH: FarmerDict = {
  page: {
    listTitle: "เกษตรกร",
    listSubtitleSuperAdmin: "Super Admin เห็นเกษตรกรทุกสาขา",
    listSubtitleScoped: (count) =>
      `แสดงเฉพาะเกษตรกรในสาขาที่บัญชีของคุณเข้าถึงได้ (${count} สาขา)`,
    newTitle: "เพิ่มเกษตรกรใหม่",
    newSubtitle: "กรอกรายละเอียดเกษตรกร รหัสห้ามซ้ำในสาขาเดียวกัน",
    editTitle: "แก้ไขเกษตรกร",
    detailHeading: "รายละเอียดเกษตรกร",
  },
  fields: {
    code: "รหัสเกษตรกร",
    fullName: "ชื่อ-นามสกุล",
    phone: "เบอร์โทร",
    nationalId: "เลขบัตรประชาชน",
    bankName: "ธนาคาร",
    bankAccountNo: "เลขที่บัญชี",
    notes: "หมายเหตุ",
    branch: "สาขา",
    status: "สถานะ",
    actions: "การจัดการ",
  },
  hints: {
    code: "ใช้ A-Z, 0-9, _, - เท่านั้น (ไม่ซ้ำในสาขาเดียวกัน)",
    codeAuto: "ปล่อยว่างเพื่อให้ระบบสร้างให้ (เช่น FAR000001)",
    optional: "(ถ้ามี)",
    notesOptional: "(ถ้ามี — ไม่เกิน 1000 ตัวอักษร)",
  },
  placeholders: {
    code: "เช่น FAR000001 (หรือเว้นว่างให้ระบบสร้าง)",
    fullName: "เช่น สมชาย ใจดี",
    phone: "เช่น 081-xxx-xxxx",
    nationalId: "เช่น 1-2345-67890-12-3",
    bankAccountNo: "เช่น 123-4-56789-0",
    selectBranch: "— เลือกสาขา —",
    selectBank: "— ไม่ระบุ —",
    search: "ค้นหา รหัส / ชื่อ / เบอร์",
  },
  actions: {
    create: "+ เพิ่มเกษตรกร",
    edit: "แก้ไข",
    submitCreate: "สร้างเกษตรกร",
    submitUpdate: "บันทึกการเปลี่ยนแปลง",
    saving: "กำลังบันทึก...",
    activate: "เปิดใช้งาน",
    deactivate: "ปิดใช้งาน",
    showInactive: "แสดงที่ปิดใช้งานด้วย",
    hideInactive: "ซ่อนที่ปิดใช้งาน",
    back: "← กลับไปยังรายการเกษตรกร",
    search: "ค้นหา",
    clear: "ล้าง",
    prev: "← ก่อนหน้า",
    next: "ถัดไป →",
  },
  errors: {
    invalidJson: "รูปแบบข้อมูลไม่ถูกต้อง",
    validation: "ข้อมูลไม่ถูกต้อง",
    codeFormat: "รหัสเกษตรกรใช้ได้เฉพาะ A-Z, 0-9, _, -",
    codeTooLong: "รหัสเกษตรกรยาวเกิน 20 ตัวอักษร",
    codeAutoGenFailed: "ระบบสร้างรหัสไม่สำเร็จ กรุณาลองอีกครั้ง",
    fullNameRequired: "กรุณากรอกชื่อ-นามสกุล",
    fullNameTooLong: "ชื่อ-นามสกุลยาวเกิน 200 ตัวอักษร",
    phoneTooLong: "เบอร์โทรยาวเกิน 40 ตัวอักษร",
    nationalIdTooLong: "เลขบัตรประชาชนยาวเกิน 20 ตัวอักษร",
    bankInvalid: "กรุณาเลือกธนาคารจากรายการ",
    bankAccountNoTooLong: "เลขที่บัญชียาวเกิน 50 ตัวอักษร",
    notesTooLong: "หมายเหตุยาวเกิน 1000 ตัวอักษร",
    branchRequired: "กรุณาเลือกสาขา",
    branchInvalid: "รหัสสาขาไม่ถูกต้อง",
    branchNotInScope: "ไม่มีสิทธิ์สร้างเกษตรกรในสาขานี้",
    notFound: "ไม่พบเกษตรกรที่ระบุ",
    codeConflict: (code) => `รหัส "${code}" มีอยู่แล้วในสาขานี้`,
    nothingToUpdate: "ไม่มีข้อมูลที่จะอัพเดต",
    permissionDenied: "สิทธิ์ไม่เพียงพอสำหรับการดำเนินการนี้",
    unauthenticated: "ต้องเข้าสู่ระบบก่อนใช้งาน",
  },
  empty: {
    list: "ยังไม่มีเกษตรกรในระบบ",
    noBranches: "บัญชีของคุณยังไม่ได้ผูกสาขา ติดต่อผู้ดูแลระบบ",
    noResults: (q) => `ไม่พบเกษตรกรที่ตรงกับ "${q}"`,
  },
  badge: {
    active: "เปิดใช้งาน",
    inactive: "ปิดใช้งาน",
  },
  misc: {
    branchScope: "แสดงเฉพาะเกษตรกรในสาขาที่บัญชีของคุณเข้าถึงได้",
    superAdminScope: "Super Admin เห็นเกษตรกรทุกสาขา",
    paginationInfo: (from, to, total) =>
      `แสดง ${from}–${to} จากทั้งหมด ${total}`,
    rowsPerPage: "ต่อหน้า",
    branchAllOption: "ทุกสาขา",
  },
};

const EN: FarmerDict = {
  page: {
    listTitle: "Farmers",
    listSubtitleSuperAdmin: "Super Admin sees farmers from all branches",
    listSubtitleScoped: (count) =>
      `Showing only farmers in branches you can access (${count} branches)`,
    newTitle: "Add new farmer",
    newSubtitle:
      "Fill in farmer details. Code must be unique within the same branch.",
    editTitle: "Edit farmer",
    detailHeading: "Farmer details",
  },
  fields: {
    code: "Farmer Code",
    fullName: "Full Name",
    phone: "Phone",
    nationalId: "National ID",
    bankName: "Bank",
    bankAccountNo: "Account No.",
    notes: "Notes",
    branch: "Branch",
    status: "Status",
    actions: "Actions",
  },
  hints: {
    code: "A-Z, 0-9, _, - only (unique within the same branch)",
    codeAuto: "Leave blank to auto-generate (e.g. FAR000001)",
    optional: "(optional)",
    notesOptional: "(optional — up to 1000 characters)",
  },
  placeholders: {
    code: "e.g. FAR000001 (or leave blank to auto-generate)",
    fullName: "e.g. John Doe",
    phone: "e.g. 081-xxx-xxxx",
    nationalId: "e.g. 1-2345-67890-12-3",
    bankAccountNo: "e.g. 123-4-56789-0",
    selectBranch: "— Select branch —",
    selectBank: "— Not specified —",
    search: "Search code / name / phone",
  },
  actions: {
    create: "+ Add farmer",
    edit: "Edit",
    submitCreate: "Create farmer",
    submitUpdate: "Save changes",
    saving: "Saving...",
    activate: "Activate",
    deactivate: "Deactivate",
    showInactive: "Show inactive",
    hideInactive: "Hide inactive",
    back: "← Back to farmers",
    search: "Search",
    clear: "Clear",
    prev: "← Prev",
    next: "Next →",
  },
  errors: {
    invalidJson: "Invalid request body",
    validation: "Invalid input",
    codeFormat: "Use A-Z, 0-9, _, - only",
    codeTooLong: "Farmer code exceeds 20 characters",
    codeAutoGenFailed: "Failed to generate a unique code. Please try again.",
    fullNameRequired: "Please enter full name",
    fullNameTooLong: "Full name exceeds 200 characters",
    phoneTooLong: "Phone exceeds 40 characters",
    nationalIdTooLong: "National ID exceeds 20 characters",
    bankInvalid: "Please pick a bank from the list",
    bankAccountNoTooLong: "Account no. exceeds 50 characters",
    notesTooLong: "Notes exceed 1000 characters",
    branchRequired: "Please select a branch",
    branchInvalid: "Invalid branch id",
    branchNotInScope: "You are not allowed to create farmers in this branch",
    notFound: "Farmer not found",
    codeConflict: (code) => `Code "${code}" already exists in this branch`,
    nothingToUpdate: "Nothing to update",
    permissionDenied: "You do not have permission for this action",
    unauthenticated: "Please sign in first",
  },
  empty: {
    list: "No farmers yet",
    noBranches: "Your account has no branch assigned. Contact admin.",
    noResults: (q) => `No farmers match "${q}"`,
  },
  badge: {
    active: "Active",
    inactive: "Inactive",
  },
  misc: {
    branchScope: "Showing only farmers in branches you can access",
    superAdminScope: "Super Admin sees farmers from all branches",
    paginationInfo: (from, to, total) =>
      `Showing ${from}–${to} of ${total}`,
    rowsPerPage: "per page",
    branchAllOption: "All branches",
  },
};

const DICTIONARIES: Record<FarmerLocale, FarmerDict> = {
  th: TH,
  en: EN,
};

export function farmerT(locale: FarmerLocale = DEFAULT_FARMER_LOCALE): FarmerDict {
  return DICTIONARIES[locale];
}
