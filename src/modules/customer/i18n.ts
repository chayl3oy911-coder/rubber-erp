/**
 * Customer module — module-local i18n dictionary.
 *
 * Module-scoped on purpose: full app-wide i18n (locale switching, URL routing)
 * lands later. For now every UI text lives here so we never hardcode strings
 * in components/services. When we adopt next-intl/i18next, swap `customerT()`
 * for the real `t()` and re-key entries — components stay untouched.
 *
 * "Customer" replaces the old "Farmer" terminology because counterparts
 * include farmers, dealers, middlemen, and cooperatives.
 */

export type CustomerLocale = "th" | "en";

export const DEFAULT_CUSTOMER_LOCALE: CustomerLocale = "th";

type CustomerDict = {
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
    bankAccounts: string;
    bankName: string;
    bankAccountNo: string;
    accountName: string;
    isPrimary: string;
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
    maxBankAccounts: string;
    primaryAutoSelect: string;
    bankAccountsOptional: string;
  };
  placeholders: {
    code: string;
    fullName: string;
    phone: string;
    nationalId: string;
    bankAccountNo: string;
    accountName: string;
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
    addBankAccount: string;
    removeBankAccount: string;
    setPrimary: string;
    viewAllBankAccounts: string;
    hideAllBankAccounts: string;
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
    bankAccountNoRequired: string;
    bankAccountNoTooLong: string;
    accountNameTooLong: string;
    notesTooLong: string;
    branchRequired: string;
    branchInvalid: string;
    branchNotInScope: string;
    notFound: string;
    codeConflict: (code: string) => string;
    nothingToUpdate: string;
    permissionDenied: string;
    unauthenticated: string;
    tooManyBankAccounts: string;
    noPrimaryAccount: string;
    multiplePrimaryAccounts: string;
    duplicateBankAccountInList: string;
    bankAccountConflict: (display: string) => string;
  };
  empty: {
    list: string;
    noBranches: string;
    noResults: (q: string) => string;
    noBankAccounts: string;
  };
  badge: {
    active: string;
    inactive: string;
    primary: string;
  };
  misc: {
    branchScope: string;
    superAdminScope: string;
    paginationInfo: (from: number, to: number, total: number) => string;
    rowsPerPage: string;
    branchAllOption: string;
    primaryBankAccount: string;
    otherBankAccounts: (count: number) => string;
  };
};

const TH: CustomerDict = {
  page: {
    listTitle: "ลูกค้า",
    listSubtitleSuperAdmin: "Super Admin เห็นลูกค้าทุกสาขา",
    listSubtitleScoped: (count) =>
      `แสดงเฉพาะลูกค้าในสาขาที่บัญชีของคุณเข้าถึงได้ (${count} สาขา)`,
    newTitle: "เพิ่มลูกค้าใหม่",
    newSubtitle: "กรอกรายละเอียดลูกค้า รหัสห้ามซ้ำในสาขาเดียวกัน",
    editTitle: "แก้ไขลูกค้า",
    detailHeading: "รายละเอียดลูกค้า",
  },
  fields: {
    code: "รหัสลูกค้า",
    fullName: "ชื่อ-นามสกุล",
    phone: "เบอร์โทร",
    nationalId: "เลขบัตรประชาชน",
    bankAccounts: "บัญชีธนาคาร",
    bankName: "ธนาคาร",
    bankAccountNo: "เลขที่บัญชี",
    accountName: "ชื่อบัญชี",
    isPrimary: "บัญชีหลัก",
    notes: "หมายเหตุ",
    branch: "สาขา",
    status: "สถานะ",
    actions: "การจัดการ",
  },
  hints: {
    code: "ใช้ A-Z, 0-9, _, - เท่านั้น (ไม่ซ้ำในสาขาเดียวกัน)",
    codeAuto: "ปล่อยว่างเพื่อให้ระบบสร้างให้ (เช่น CUS000001)",
    optional: "(ถ้ามี)",
    notesOptional: "(ถ้ามี — ไม่เกิน 1000 ตัวอักษร)",
    maxBankAccounts: "เพิ่มได้สูงสุด 3 บัญชี ต้องเลือกบัญชีหลัก 1 บัญชี",
    primaryAutoSelect: "ระบบจะเลือกบัญชีแรกเป็นบัญชีหลักให้อัตโนมัติ",
    bankAccountsOptional:
      "ไม่บังคับ — เพิ่มภายหลังได้ (สูงสุด 3 บัญชีต่อลูกค้า)",
  },
  placeholders: {
    code: "เช่น CUS000001 (หรือเว้นว่างให้ระบบสร้าง)",
    fullName: "เช่น สมชาย ใจดี",
    phone: "เช่น 081-xxx-xxxx",
    nationalId: "เช่น 1-2345-67890-12-3",
    bankAccountNo: "เช่น 123-4-56789-0",
    accountName: "เช่น สมชาย ใจดี",
    selectBranch: "— เลือกสาขา —",
    selectBank: "— เลือกธนาคาร —",
    search: "ค้นหา รหัส / ชื่อ / เบอร์",
  },
  actions: {
    create: "+ เพิ่มลูกค้า",
    edit: "แก้ไข",
    submitCreate: "สร้างลูกค้า",
    submitUpdate: "บันทึกการเปลี่ยนแปลง",
    saving: "กำลังบันทึก...",
    activate: "เปิดใช้งาน",
    deactivate: "ปิดใช้งาน",
    showInactive: "แสดงที่ปิดใช้งานด้วย",
    hideInactive: "ซ่อนที่ปิดใช้งาน",
    back: "← กลับไปยังรายการลูกค้า",
    search: "ค้นหา",
    clear: "ล้าง",
    prev: "← ก่อนหน้า",
    next: "ถัดไป →",
    addBankAccount: "+ เพิ่มบัญชี",
    removeBankAccount: "ลบบัญชี",
    setPrimary: "ตั้งเป็นบัญชีหลัก",
    viewAllBankAccounts: "ดูบัญชีทั้งหมด",
    hideAllBankAccounts: "ย่อบัญชี",
  },
  errors: {
    invalidJson: "รูปแบบข้อมูลไม่ถูกต้อง",
    validation: "ข้อมูลไม่ถูกต้อง",
    codeFormat: "รหัสลูกค้าใช้ได้เฉพาะ A-Z, 0-9, _, -",
    codeTooLong: "รหัสลูกค้ายาวเกิน 20 ตัวอักษร",
    codeAutoGenFailed: "ระบบสร้างรหัสไม่สำเร็จ กรุณาลองอีกครั้ง",
    fullNameRequired: "กรุณากรอกชื่อ-นามสกุล",
    fullNameTooLong: "ชื่อ-นามสกุลยาวเกิน 200 ตัวอักษร",
    phoneTooLong: "เบอร์โทรยาวเกิน 40 ตัวอักษร",
    nationalIdTooLong: "เลขบัตรประชาชนยาวเกิน 20 ตัวอักษร",
    bankInvalid: "กรุณาเลือกธนาคารจากรายการ",
    bankAccountNoRequired: "กรุณากรอกเลขที่บัญชี",
    bankAccountNoTooLong: "เลขที่บัญชียาวเกิน 50 ตัวอักษร",
    accountNameTooLong: "ชื่อบัญชียาวเกิน 200 ตัวอักษร",
    notesTooLong: "หมายเหตุยาวเกิน 1000 ตัวอักษร",
    branchRequired: "กรุณาเลือกสาขา",
    branchInvalid: "รหัสสาขาไม่ถูกต้อง",
    branchNotInScope: "ไม่มีสิทธิ์สร้างลูกค้าในสาขานี้",
    notFound: "ไม่พบลูกค้าที่ระบุ",
    codeConflict: (code) => `รหัส "${code}" มีอยู่แล้วในสาขานี้`,
    nothingToUpdate: "ไม่มีข้อมูลที่จะอัพเดต",
    permissionDenied: "สิทธิ์ไม่เพียงพอสำหรับการดำเนินการนี้",
    unauthenticated: "ต้องเข้าสู่ระบบก่อนใช้งาน",
    tooManyBankAccounts: "เพิ่มบัญชีธนาคารได้สูงสุด 3 บัญชีต่อลูกค้า",
    noPrimaryAccount:
      "ต้องเลือกบัญชีหลัก 1 บัญชีเมื่อมีบัญชีธนาคารอย่างน้อย 1 บัญชี",
    multiplePrimaryAccounts: "เลือกบัญชีหลักได้เพียง 1 บัญชี",
    duplicateBankAccountInList: "มีบัญชีธนาคารซ้ำกันในรายการเดียวกัน",
    bankAccountConflict: (display) =>
      `บัญชีธนาคาร "${display}" มีลูกค้าใช้งานอยู่แล้ว`,
  },
  empty: {
    list: "ยังไม่มีลูกค้าในระบบ",
    noBranches: "บัญชีของคุณยังไม่ได้ผูกสาขา ติดต่อผู้ดูแลระบบ",
    noResults: (q) => `ไม่พบลูกค้าที่ตรงกับ "${q}"`,
    noBankAccounts: "ยังไม่มีบัญชีธนาคาร",
  },
  badge: {
    active: "เปิดใช้งาน",
    inactive: "ปิดใช้งาน",
    primary: "บัญชีหลัก",
  },
  misc: {
    branchScope: "แสดงเฉพาะลูกค้าในสาขาที่บัญชีของคุณเข้าถึงได้",
    superAdminScope: "Super Admin เห็นลูกค้าทุกสาขา",
    paginationInfo: (from, to, total) =>
      `แสดง ${from}–${to} จากทั้งหมด ${total}`,
    rowsPerPage: "ต่อหน้า",
    branchAllOption: "ทุกสาขา",
    primaryBankAccount: "บัญชีหลัก",
    otherBankAccounts: (count) => `+ อีก ${count} บัญชี`,
  },
};

const EN: CustomerDict = {
  page: {
    listTitle: "Customers",
    listSubtitleSuperAdmin: "Super Admin sees customers from all branches",
    listSubtitleScoped: (count) =>
      `Showing only customers in branches you can access (${count} branches)`,
    newTitle: "Add new customer",
    newSubtitle:
      "Fill in customer details. Code must be unique within the same branch.",
    editTitle: "Edit customer",
    detailHeading: "Customer details",
  },
  fields: {
    code: "Customer Code",
    fullName: "Full Name",
    phone: "Phone",
    nationalId: "National ID",
    bankAccounts: "Bank Accounts",
    bankName: "Bank",
    bankAccountNo: "Account No.",
    accountName: "Account Name",
    isPrimary: "Primary",
    notes: "Notes",
    branch: "Branch",
    status: "Status",
    actions: "Actions",
  },
  hints: {
    code: "A-Z, 0-9, _, - only (unique within the same branch)",
    codeAuto: "Leave blank to auto-generate (e.g. CUS000001)",
    optional: "(optional)",
    notesOptional: "(optional — up to 1000 characters)",
    maxBankAccounts: "Up to 3 accounts; one must be marked primary",
    primaryAutoSelect:
      "The first account is auto-selected as primary if you don't choose",
    bankAccountsOptional:
      "Optional — can be added later (up to 3 accounts per customer)",
  },
  placeholders: {
    code: "e.g. CUS000001 (or leave blank to auto-generate)",
    fullName: "e.g. John Doe",
    phone: "e.g. 081-xxx-xxxx",
    nationalId: "e.g. 1-2345-67890-12-3",
    bankAccountNo: "e.g. 123-4-56789-0",
    accountName: "e.g. John Doe",
    selectBranch: "— Select branch —",
    selectBank: "— Select bank —",
    search: "Search code / name / phone",
  },
  actions: {
    create: "+ Add customer",
    edit: "Edit",
    submitCreate: "Create customer",
    submitUpdate: "Save changes",
    saving: "Saving...",
    activate: "Activate",
    deactivate: "Deactivate",
    showInactive: "Show inactive",
    hideInactive: "Hide inactive",
    back: "← Back to customers",
    search: "Search",
    clear: "Clear",
    prev: "← Prev",
    next: "Next →",
    addBankAccount: "+ Add account",
    removeBankAccount: "Remove",
    setPrimary: "Set primary",
    viewAllBankAccounts: "View all accounts",
    hideAllBankAccounts: "Hide accounts",
  },
  errors: {
    invalidJson: "Invalid request body",
    validation: "Invalid input",
    codeFormat: "Use A-Z, 0-9, _, - only",
    codeTooLong: "Customer code exceeds 20 characters",
    codeAutoGenFailed: "Failed to generate a unique code. Please try again.",
    fullNameRequired: "Please enter full name",
    fullNameTooLong: "Full name exceeds 200 characters",
    phoneTooLong: "Phone exceeds 40 characters",
    nationalIdTooLong: "National ID exceeds 20 characters",
    bankInvalid: "Please pick a bank from the list",
    bankAccountNoRequired: "Please enter the account number",
    bankAccountNoTooLong: "Account no. exceeds 50 characters",
    accountNameTooLong: "Account name exceeds 200 characters",
    notesTooLong: "Notes exceed 1000 characters",
    branchRequired: "Please select a branch",
    branchInvalid: "Invalid branch id",
    branchNotInScope: "You are not allowed to create customers in this branch",
    notFound: "Customer not found",
    codeConflict: (code) => `Code "${code}" already exists in this branch`,
    nothingToUpdate: "Nothing to update",
    permissionDenied: "You do not have permission for this action",
    unauthenticated: "Please sign in first",
    tooManyBankAccounts: "Up to 3 bank accounts per customer",
    noPrimaryAccount:
      "Exactly one bank account must be marked primary when at least one exists",
    multiplePrimaryAccounts: "Only one bank account can be marked primary",
    duplicateBankAccountInList: "Duplicate bank account in this list",
    bankAccountConflict: (display) =>
      `Bank account "${display}" is already used by another customer`,
  },
  empty: {
    list: "No customers yet",
    noBranches: "Your account has no branch assigned. Contact admin.",
    noResults: (q) => `No customers match "${q}"`,
    noBankAccounts: "No bank accounts yet",
  },
  badge: {
    active: "Active",
    inactive: "Inactive",
    primary: "Primary",
  },
  misc: {
    branchScope: "Showing only customers in branches you can access",
    superAdminScope: "Super Admin sees customers from all branches",
    paginationInfo: (from, to, total) => `Showing ${from}–${to} of ${total}`,
    rowsPerPage: "per page",
    branchAllOption: "All branches",
    primaryBankAccount: "Primary",
    otherBankAccounts: (count) => `+ ${count} more`,
  },
};

const DICTIONARIES: Record<CustomerLocale, CustomerDict> = {
  th: TH,
  en: EN,
};

export function customerT(
  locale: CustomerLocale = DEFAULT_CUSTOMER_LOCALE,
): CustomerDict {
  return DICTIONARIES[locale];
}
