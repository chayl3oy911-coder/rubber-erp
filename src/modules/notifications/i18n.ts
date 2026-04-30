import type { NotificationKey } from "./types";

export type NotificationsLocale = "th" | "en";
export const DEFAULT_NOTIFICATIONS_LOCALE: NotificationsLocale = "th";

type NotificationsDict = {
  bell: {
    ariaLabel: string;
    badgeAriaLabel: (n: number) => string;
  };
  dropdown: {
    title: string;
    empty: string;
    viewAll: string;
  };
  items: Record<NotificationKey, (count: number) => string>;
};

const TH: NotificationsDict = {
  bell: {
    ariaLabel: "การแจ้งเตือน",
    badgeAriaLabel: (n) => `มีรายการที่ต้องดำเนินการ ${n} รายการ`,
  },
  dropdown: {
    title: "รายการที่ต้องดำเนินการ",
    empty: "ยังไม่มีรายการที่ต้องดำเนินการ",
    viewAll: "ดูทั้งหมด",
  },
  items: {
    "purchase.waiting_approval": (n) => `ใบรับซื้อรออนุมัติ ${n} รายการ`,
    "purchase.awaiting_stock_in": (n) =>
      `ใบรับซื้อรอรับเข้า Stock ${n} รายการ`,
    "stock.recent_adjustments": (n) =>
      `การปรับ Stock ใน 24 ชม. ${n} รายการ`,
  },
};

const EN: NotificationsDict = {
  bell: {
    ariaLabel: "Notifications",
    badgeAriaLabel: (n) => `${n} item${n === 1 ? "" : "s"} need attention`,
  },
  dropdown: {
    title: "Things that need your attention",
    empty: "Nothing to act on right now",
    viewAll: "View all",
  },
  items: {
    "purchase.waiting_approval": (n) =>
      `${n} purchase ticket${n === 1 ? "" : "s"} awaiting approval`,
    "purchase.awaiting_stock_in": (n) =>
      `${n} approved ticket${n === 1 ? "" : "s"} awaiting stock-in`,
    "stock.recent_adjustments": (n) =>
      `${n} stock adjustment${n === 1 ? "" : "s"} in the last 24h`,
  },
};

const DICTIONARIES: Record<NotificationsLocale, NotificationsDict> = {
  th: TH,
  en: EN,
};

export function notificationsT(
  locale: NotificationsLocale = DEFAULT_NOTIFICATIONS_LOCALE,
): NotificationsDict {
  return DICTIONARIES[locale];
}
