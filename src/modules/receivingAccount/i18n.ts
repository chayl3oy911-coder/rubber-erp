/**
 * Receiving account module — module-local i18n dictionary.
 *
 * Default locale: Thai. Components must never hardcode strings — they go
 * through `receivingAccountT()` so locale switching is data-only (mirrors
 * the customer / sales module pattern).
 */

import { MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY } from "./types";

export type ReceivingAccountLocale = "th" | "en";
export const DEFAULT_RECEIVING_ACCOUNT_LOCALE: ReceivingAccountLocale = "th";

type EntityTypeDict = {
  COMPANY: string;
  PERSONAL: string;
};

type ReceivingAccountDict = {
  page: {
    settingsTitle: string;
    settingsSubtitle: string;
    listTitle: string;
    listSubtitle: string;
    newTitle: string;
    newSubtitle: string;
    editTitle: string;
    editSubtitle: (name: string) => string;
  };
  fields: {
    name: string;
    type: string;
    taxId: string;
    address: string;
    branch: string;
    isDefault: string;
    isActive: string;
    bankAccounts: string;
    bankName: string;
    bankAccountNo: string;
    bankAccountName: string;
    isPrimary: string;
    accountCount: string;
    actions: string;
  };
  hints: {
    branchScopeNull: string;
    branchScopePerBranch: string;
    isDefault: string;
    isPrimary: string;
    maxBankAccounts: string;
    cannotAddMore: string;
    softDeleteOnly: string;
  };
  placeholders: {
    name: string;
    taxId: string;
    address: string;
    bankAccountNo: string;
    bankAccountName: string;
    selectBank: string;
    selectBranch: string;
    branchAll: string;
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
    setDefault: string;
    setPrimary: string;
    addBankAccount: string;
    removeBankAccount: string;
    showInactive: string;
    hideInactive: string;
    back: string;
    search: string;
    clear: string;
    prev: string;
    next: string;
    goToSettings: string;
  };
  errors: {
    invalidJson: string;
    validation: string;
    notFound: string;
    permissionDenied: string;
    branchInvalid: string;
    branchNotInScope: string;
    typeInvalid: string;
    nameRequired: string;
    nameTooLong: string;
    taxIdInvalid: string;
    taxIdTooLong: string;
    addressTooLong: string;
    bankInvalid: string;
    bankAccountNoRequired: string;
    bankAccountNoTooLong: string;
    bankAccountNameRequired: string;
    bankAccountNameTooLong: string;
    tooManyBankAccounts: string;
    noPrimaryAccount: string;
    multiplePrimaryAccounts: string;
    duplicateBankAccountInList: string;
    bankAccountConflict: (display: string) => string;
    primaryReassignRequired: string;
    defaultReassignRequired: string;
    nothingToUpdate: string;
    inactiveCannotBeDefault: string;
    inactiveCannotBePrimary: string;
  };
  badges: {
    default: string;
    inactive: string;
    primary: string;
    companyWide: string;
  };
  empty: {
    list: string;
    listForSearch: (q: string) => string;
    noEntitiesForSales: string;
  };
  type: EntityTypeDict;
  misc: {
    paginationInfo: (from: number, to: number, total: number) => string;
    accountCountWithMax: (current: number) => string;
    branchAll: string;
    listSubtitleSuperAdmin: string;
    listSubtitleScoped: (count: number) => string;
  };
};

const TH: ReceivingAccountDict = {
  page: {
    settingsTitle: "ตั้งค่าระบบ",
    settingsSubtitle:
      "จัดการข้อมูลกลางของระบบ เช่น บัญชีรับเงินที่ปรากฏบนใบขาย",
    listTitle: "ขายในนาม / บัญชีรับเงิน",
    listSubtitle:
      "ผู้รับเงินที่จะปรากฏบนใบขาย พร้อมบัญชีธนาคารที่ใช้รับโอน",
    newTitle: "เพิ่มผู้รับเงินใหม่",
    newSubtitle:
      "ระบุชื่อนิติบุคคล/บุคคล ขอบเขตสาขา และเพิ่มบัญชีธนาคารที่ใช้รับเงิน",
    editTitle: "แก้ไขผู้รับเงิน",
    editSubtitle: (name) => `กำลังแก้ไข "${name}"`,
  },
  fields: {
    name: "ชื่อผู้รับเงิน",
    type: "ประเภท",
    taxId: "เลขผู้เสียภาษี",
    address: "ที่อยู่",
    branch: "สาขา",
    isDefault: "ตั้งเป็นค่าเริ่มต้น",
    isActive: "เปิดใช้งาน",
    bankAccounts: "บัญชีธนาคาร",
    bankName: "ธนาคาร",
    bankAccountNo: "เลขที่บัญชี",
    bankAccountName: "ชื่อบัญชี",
    isPrimary: "บัญชีหลัก",
    accountCount: "จำนวนบัญชี",
    actions: "การจัดการ",
  },
  hints: {
    branchScopeNull: "ใช้ได้ทุกสาขา (company-wide)",
    branchScopePerBranch: "ใช้ได้เฉพาะสาขาที่เลือกเท่านั้น",
    isDefault:
      "ค่าเริ่มต้นจะถูกเลือกอัตโนมัติเวลาเปิดใบขายใหม่ ในแต่ละขอบเขตสาขามีได้ 1 รายการ",
    isPrimary: "บัญชีหลัก 1 บัญชีต่อผู้รับเงิน 1 ราย",
    maxBankAccounts: `สามารถเพิ่มบัญชีได้สูงสุด ${MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY} บัญชี`,
    cannotAddMore: "ครบจำนวนสูงสุดแล้ว",
    softDeleteOnly:
      "ระบบไม่ลบบัญชีจริง ใช้การปิดใช้งาน (soft delete) เพื่อรักษาประวัติ",
  },
  placeholders: {
    name: "เช่น บริษัท เอเวอร์รับเบอร์ จำกัด",
    taxId: "เช่น 0105561234567",
    address: "ที่อยู่ตามใบทะเบียน (ไม่บังคับ)",
    bankAccountNo: "เช่น 123-4-56789-0",
    bankAccountName: "ชื่อตามสมุดบัญชี",
    selectBank: "— เลือกธนาคาร —",
    selectBranch: "— เลือกสาขา —",
    branchAll: "ทุกสาขา (company-wide)",
    search: "ค้นหาชื่อ / เลขผู้เสียภาษี / เลขบัญชี",
  },
  actions: {
    create: "+ เพิ่มผู้รับเงิน",
    edit: "แก้ไข",
    submitCreate: "บันทึก",
    submitUpdate: "บันทึกการแก้ไข",
    saving: "กำลังบันทึก…",
    activate: "เปิดใช้งาน",
    deactivate: "ปิดใช้งาน",
    setDefault: "ตั้งเป็นค่าเริ่มต้น",
    setPrimary: "ตั้งเป็นบัญชีหลัก",
    addBankAccount: "+ เพิ่มบัญชี",
    removeBankAccount: "ลบ",
    showInactive: "แสดงที่ปิดใช้งาน",
    hideInactive: "ซ่อนที่ปิดใช้งาน",
    back: "← กลับ",
    search: "ค้นหา",
    clear: "ล้าง",
    prev: "← ก่อนหน้า",
    next: "ถัดไป →",
    goToSettings: "ไปที่หน้าตั้งค่า",
  },
  errors: {
    invalidJson: "รูปแบบข้อมูลไม่ถูกต้อง",
    validation: "ข้อมูลไม่ผ่านการตรวจสอบ",
    notFound: "ไม่พบผู้รับเงินที่ระบุ",
    permissionDenied: "สิทธิ์ไม่เพียงพอสำหรับการดำเนินการนี้",
    branchInvalid: "รหัสสาขาไม่ถูกต้อง",
    branchNotInScope: "ไม่มีสิทธิ์ดำเนินการในสาขานี้",
    typeInvalid: "ประเภทผู้รับเงินไม่ถูกต้อง",
    nameRequired: "กรุณากรอกชื่อผู้รับเงิน",
    nameTooLong: "ชื่อผู้รับเงินยาวเกิน 200 ตัวอักษร",
    taxIdInvalid: "เลขผู้เสียภาษีไม่ถูกต้อง (ใช้เฉพาะตัวเลขและขีด)",
    taxIdTooLong: "เลขผู้เสียภาษียาวเกิน 30 ตัวอักษร",
    addressTooLong: "ที่อยู่ยาวเกิน 500 ตัวอักษร",
    bankInvalid: "กรุณาเลือกธนาคารจากรายการ",
    bankAccountNoRequired: "กรุณากรอกเลขที่บัญชี",
    bankAccountNoTooLong: "เลขที่บัญชียาวเกิน 50 ตัวอักษร",
    bankAccountNameRequired: "กรุณากรอกชื่อบัญชี",
    bankAccountNameTooLong: "ชื่อบัญชียาวเกิน 200 ตัวอักษร",
    tooManyBankAccounts: `เพิ่มบัญชีธนาคารได้สูงสุด ${MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY} บัญชีต่อผู้รับเงิน`,
    noPrimaryAccount: "ต้องมีบัญชีหลักอย่างน้อย 1 บัญชี",
    multiplePrimaryAccounts: "เลือกบัญชีหลักได้เพียง 1 บัญชี",
    duplicateBankAccountInList: "มีบัญชีธนาคารซ้ำกันในรายการเดียวกัน",
    bankAccountConflict: (display) =>
      `บัญชี ${display} มีอยู่แล้วใต้ผู้รับเงินรายนี้`,
    primaryReassignRequired:
      "ต้องเลือกบัญชีหลักใหม่ก่อนปิดใช้งานบัญชีหลักเดิม",
    defaultReassignRequired:
      "ต้องตั้งผู้รับเงินรายอื่นเป็นค่าเริ่มต้นก่อนปิดใช้งานรายเดิม",
    nothingToUpdate: "ไม่มีข้อมูลที่จะอัปเดต",
    inactiveCannotBeDefault: "ผู้รับเงินที่ปิดใช้งานไม่สามารถเป็นค่าเริ่มต้นได้",
    inactiveCannotBePrimary: "บัญชีที่ปิดใช้งานไม่สามารถเป็นบัญชีหลักได้",
  },
  badges: {
    default: "ค่าเริ่มต้น",
    inactive: "ปิดใช้งาน",
    primary: "บัญชีหลัก",
    companyWide: "ทุกสาขา",
  },
  empty: {
    list: "ยังไม่มีผู้รับเงิน เริ่มเพิ่มจากปุ่มด้านบนได้เลย",
    listForSearch: (q) => `ไม่พบผู้รับเงินที่ตรงกับ "${q}"`,
    noEntitiesForSales:
      "ยังไม่มีบัญชีรับเงิน ต้องตั้งค่าก่อนเปิดใบขายใบใหม่",
  },
  type: {
    COMPANY: "บริษัท / นิติบุคคล",
    PERSONAL: "บุคคลธรรมดา",
  },
  misc: {
    paginationInfo: (from, to, total) =>
      `แสดง ${from}–${to} จากทั้งหมด ${total}`,
    accountCountWithMax: (current) =>
      `${current} / ${MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY} บัญชี`,
    branchAll: "ทุกสาขา",
    listSubtitleSuperAdmin: "Super Admin เห็นผู้รับเงินทุกสาขา",
    listSubtitleScoped: (count) =>
      `แสดงเฉพาะผู้รับเงินใน ${count} สาขา + รายการ company-wide`,
  },
};

const EN: ReceivingAccountDict = {
  page: {
    settingsTitle: "Settings",
    settingsSubtitle:
      "Manage system master data such as receiving bank accounts shown on sales orders.",
    listTitle: "Receiving accounts",
    listSubtitle:
      "Receivers printed on sales orders, with the bank accounts buyers transfer into.",
    newTitle: "New receiving entity",
    newSubtitle:
      "Enter the legal/personal name, branch scope, and add the bank accounts used to collect payment.",
    editTitle: "Edit receiving entity",
    editSubtitle: (name) => `Editing "${name}"`,
  },
  fields: {
    name: "Receiver name",
    type: "Type",
    taxId: "Tax ID",
    address: "Address",
    branch: "Branch",
    isDefault: "Set as default",
    isActive: "Active",
    bankAccounts: "Bank accounts",
    bankName: "Bank",
    bankAccountNo: "Account #",
    bankAccountName: "Account name",
    isPrimary: "Primary",
    accountCount: "Accounts",
    actions: "Actions",
  },
  hints: {
    branchScopeNull: "Available across every branch (company-wide)",
    branchScopePerBranch: "Available only in the selected branch",
    isDefault:
      "The default receiver is auto-selected on /sales/new. Each branch scope allows one default.",
    isPrimary: "One primary account per entity.",
    maxBankAccounts: `Up to ${MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY} bank accounts`,
    cannotAddMore: "Maximum reached",
    softDeleteOnly:
      "We never hard-delete: deactivate to retain history.",
  },
  placeholders: {
    name: "e.g. EverRubber Co., Ltd.",
    taxId: "e.g. 0105561234567",
    address: "Registered address (optional)",
    bankAccountNo: "e.g. 123-4-56789-0",
    bankAccountName: "Name on the bankbook",
    selectBank: "— Select bank —",
    selectBranch: "— Select branch —",
    branchAll: "All branches (company-wide)",
    search: "Search name / tax id / account #",
  },
  actions: {
    create: "+ New receiver",
    edit: "Edit",
    submitCreate: "Save",
    submitUpdate: "Save changes",
    saving: "Saving…",
    activate: "Activate",
    deactivate: "Deactivate",
    setDefault: "Set as default",
    setPrimary: "Set as primary",
    addBankAccount: "+ Add account",
    removeBankAccount: "Remove",
    showInactive: "Show inactive",
    hideInactive: "Hide inactive",
    back: "← Back",
    search: "Search",
    clear: "Clear",
    prev: "← Prev",
    next: "Next →",
    goToSettings: "Go to settings",
  },
  errors: {
    invalidJson: "Invalid request body",
    validation: "Invalid input",
    notFound: "Receiving entity not found",
    permissionDenied: "You do not have permission for this action",
    branchInvalid: "Invalid branch id",
    branchNotInScope: "You are not allowed to operate in this branch",
    typeInvalid: "Invalid receiver type",
    nameRequired: "Please enter a receiver name",
    nameTooLong: "Receiver name exceeds 200 characters",
    taxIdInvalid: "Tax ID must contain only digits and dashes",
    taxIdTooLong: "Tax ID exceeds 30 characters",
    addressTooLong: "Address exceeds 500 characters",
    bankInvalid: "Please pick a bank from the list",
    bankAccountNoRequired: "Please enter the account number",
    bankAccountNoTooLong: "Account number exceeds 50 characters",
    bankAccountNameRequired: "Please enter the account name",
    bankAccountNameTooLong: "Account name exceeds 200 characters",
    tooManyBankAccounts: `Up to ${MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY} bank accounts per entity`,
    noPrimaryAccount: "At least one primary account is required",
    multiplePrimaryAccounts: "Only one bank account can be marked primary",
    duplicateBankAccountInList: "Duplicate bank account in this list",
    bankAccountConflict: (display) =>
      `Account ${display} already exists for this entity`,
    primaryReassignRequired:
      "Pick a new primary account before deactivating the current primary",
    defaultReassignRequired:
      "Set another receiver as default before deactivating the current default",
    nothingToUpdate: "Nothing to update",
    inactiveCannotBeDefault: "Inactive entities cannot be the default",
    inactiveCannotBePrimary: "Inactive accounts cannot be the primary",
  },
  badges: {
    default: "Default",
    inactive: "Inactive",
    primary: "Primary",
    companyWide: "All branches",
  },
  empty: {
    list: "No receiving entities yet — add one with the button above.",
    listForSearch: (q) => `No receiving entities matching "${q}"`,
    noEntitiesForSales:
      "No receiving accounts configured yet — add one before opening a new sale.",
  },
  type: {
    COMPANY: "Company / legal entity",
    PERSONAL: "Personal",
  },
  misc: {
    paginationInfo: (from, to, total) =>
      `Showing ${from}–${to} of ${total}`,
    accountCountWithMax: (current) =>
      `${current} / ${MAX_BANK_ACCOUNTS_PER_RECEIVING_ENTITY} accounts`,
    branchAll: "All branches",
    listSubtitleSuperAdmin: "Super Admin sees receivers from every branch",
    listSubtitleScoped: (count) =>
      `Showing receivers in your ${count} branches plus company-wide entries`,
  },
};

const DICTS: Readonly<Record<ReceivingAccountLocale, ReceivingAccountDict>> = {
  th: TH,
  en: EN,
};

export function receivingAccountT(
  locale: ReceivingAccountLocale = DEFAULT_RECEIVING_ACCOUNT_LOCALE,
): ReceivingAccountDict {
  return DICTS[locale];
}
