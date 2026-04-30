export type NavIconName =
  | "dashboard"
  | "branches"
  | "purchase"
  | "stock"
  | "production"
  | "sales"
  | "reports"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "dashboard" },
  { href: "/branches", label: "สาขา", icon: "branches" },
  { href: "/purchases", label: "ใบรับซื้อ", icon: "purchase" },
  { href: "/stock", label: "สต็อก", icon: "stock" },
  { href: "/production", label: "การผลิต", icon: "production" },
  { href: "/sales", label: "ขายโรงงาน", icon: "sales" },
  { href: "/reports", label: "รายงาน", icon: "reports" },
  { href: "/settings", label: "ตั้งค่า", icon: "settings" },
];
