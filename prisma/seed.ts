/**
 * Rubber ERP — foundation seed.
 *
 * Idempotent: every entity is upserted by its unique code so this script can
 * be re-run safely. The `update` body of each upsert refreshes user-facing
 * text (name/description/module) and re-asserts system flags but NEVER
 * touches `isActive`, so admins can deactivate a row in the UI without the
 * next seed run silently re-enabling it.
 *
 * Out of scope: AppUser. Real users are provisioned via Supabase Auth in a
 * later phase.
 *
 * Run with `npm run db:seed` (or `npx prisma db seed`).
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type Branch,
  type Permission,
  type Prisma,
  type Role,
} from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

// ─── Seed Data ───────────────────────────────────────────────────────────────

const HQ_BRANCH = {
  code: "HQ",
  name: "สำนักงานใหญ่",
} as const;

type RoleSeed = Readonly<{
  code: string;
  name: string;
  description: string;
}>;

const ROLES: ReadonlyArray<RoleSeed> = [
  {
    code: "super_admin",
    name: "Super Admin",
    description: "ผู้ดูแลระบบสูงสุด เห็นและจัดการได้ทุกสาขา",
  },
  {
    code: "hq_admin",
    name: "ผู้ดูแลสำนักงานใหญ่",
    description: "จัดการข้อมูลกลางและดูภาพรวมทุกสาขา",
  },
  {
    code: "branch_manager",
    name: "ผู้จัดการสาขา",
    description: "อนุมัติงานและดูรายงานในสาขาที่รับผิดชอบ",
  },
  {
    code: "purchase_staff",
    name: "พนักงานรับซื้อ",
    description: "สร้างใบรับซื้อและบันทึกการชั่งน้ำหนัก",
  },
  {
    code: "qc_staff",
    name: "พนักงาน QC",
    description: "ตรวจคุณภาพยาง: DRC ความชื้น และเกรด",
  },
  {
    code: "cashier",
    name: "แคชเชียร์",
    description: "จ่ายเงินให้เกษตรกรและดูแลเงินสดสาขา",
  },
  {
    code: "warehouse_staff",
    name: "พนักงานคลัง",
    description: "ดูแล Stock Lot และการเคลื่อนไหวสต็อก",
  },
  {
    code: "production_staff",
    name: "พนักงานผลิต/เครป",
    description: "ดำเนินการเครปยางและสร้าง Lot ใหม่",
  },
  {
    code: "sales_staff",
    name: "พนักงานขาย",
    description: "ขายสินค้าให้โรงงานและตัด Stock Lot",
  },
  {
    code: "viewer",
    name: "ผู้ดูข้อมูล (read-only)",
    description: "ดูข้อมูลในระบบเท่านั้น ไม่สามารถแก้ไข",
  },
];

type PermissionSeed = Readonly<{
  code: string;
  name: string;
  module: string;
  description: string;
}>;

const PERMISSIONS: ReadonlyArray<PermissionSeed> = [
  {
    code: "branch.create",
    module: "branch",
    name: "สร้างสาขา",
    description: "เพิ่มสาขาใหม่ในระบบ",
  },
  {
    code: "branch.read",
    module: "branch",
    name: "ดูข้อมูลสาขา",
    description: "ดูข้อมูลสาขาในระบบ",
  },
  {
    code: "branch.update",
    module: "branch",
    name: "แก้ไขข้อมูลสาขา",
    description: "แก้ไขข้อมูลสาขาในระบบ",
  },
  {
    code: "branch.delete",
    module: "branch",
    name: "ปิดใช้งานสาขา",
    description: "ปิดใช้งานสาขาแบบ soft delete",
  },
  {
    code: "customer.create",
    module: "customer",
    name: "เพิ่มลูกค้า",
    description: "เพิ่มลูกค้าเข้าในระบบ",
  },
  {
    code: "customer.read",
    module: "customer",
    name: "ดูข้อมูลลูกค้า",
    description: "ดูข้อมูลลูกค้า",
  },
  {
    code: "customer.update",
    module: "customer",
    name: "แก้ไขข้อมูลลูกค้า",
    description: "แก้ไขข้อมูลลูกค้าและบัญชีธนาคาร",
  },
  {
    code: "customer.delete",
    module: "customer",
    name: "ปิดใช้งานลูกค้า",
    description: "ปิดใช้งานลูกค้าแบบ soft delete",
  },
  {
    code: "purchase.read",
    module: "purchase",
    name: "ดูใบรับซื้อ",
    description: "ดูข้อมูลใบรับซื้อยาง",
  },
  {
    code: "purchase.create",
    module: "purchase",
    name: "สร้างใบรับซื้อ",
    description: "สร้างใบรับซื้อยางใหม่ (สถานะเริ่มต้น DRAFT)",
  },
  {
    code: "purchase.update",
    module: "purchase",
    name: "แก้ไขใบรับซื้อ",
    description:
      "แก้ไขใบรับซื้อในสถานะที่อนุญาต และเลื่อนสถานะ DRAFT/WAITING_QC/WAITING_APPROVAL",
  },
  {
    code: "purchase.approve",
    module: "purchase",
    name: "อนุมัติใบรับซื้อ",
    description: "อนุมัติใบรับซื้อ (WAITING_APPROVAL → APPROVED)",
  },
  {
    code: "purchase.cancel",
    module: "purchase",
    name: "ยกเลิกใบรับซื้อ",
    description: "ยกเลิกใบรับซื้อ (สถานะที่ยังไม่ CANCELLED)",
  },
  {
    code: "stock.read",
    module: "stock",
    name: "ดู Stock",
    description: "ดูข้อมูล Stock Lot และการเคลื่อนไหวสต็อก",
  },
  {
    code: "stock.create",
    module: "stock",
    name: "สร้าง Stock Lot",
    description: "รับเข้า Stock จากใบรับซื้อที่อนุมัติแล้ว",
  },
  {
    code: "stock.adjust",
    module: "stock",
    name: "ปรับ Stock",
    description: "ปรับเข้า/ปรับออก Stock พร้อมระบุเหตุผล",
  },
  {
    code: "stock.audit",
    module: "stock",
    name: "ตรวจสอบ Stock",
    description: "ดูประวัติ movement และ audit log ของ Stock อย่างละเอียด",
  },
  {
    code: "user.manage",
    module: "user",
    name: "จัดการผู้ใช้",
    description: "สร้าง/แก้ไข/ปิดผู้ใช้ พร้อมมอบ role และสาขา",
  },
  {
    code: "role.manage",
    module: "rbac",
    name: "จัดการ role และสิทธิ์",
    description: "จัดการ Role และผูก Permission",
  },
  {
    code: "report.view",
    module: "reports",
    name: "ดูรายงาน",
    description: "ดูรายงานทั้งหมดของระบบ",
  },
];

const SUPER_ADMIN_CODE = "super_admin";

/**
 * Role → permission grants for non-super-admin roles.
 *
 * `super_admin` is auto-linked to every permission elsewhere; this map only
 * covers other roles and the entries here represent the *baseline* — the
 * minimum set every role must have. Seed runs are additive: re-running this
 * script will re-create any missing links, but it will NEVER remove links
 * that were added manually through an admin UI.
 *
 * To revoke a baseline grant, remove it from this map AND clear the existing
 * row in `RolePermission` (the seed will not undo links on its own).
 *
 * Currently scoped to the purchase module only — branch.* / customer.* / etc.
 * will be added when their respective ownership policies are settled.
 */
const ROLE_PERMISSION_MAP: Readonly<Record<string, ReadonlyArray<string>>> = {
  // Branch manager — owns everything that happens inside their branch,
  // including approval and cancellation. Stock: full access.
  branch_manager: [
    "purchase.read",
    "purchase.create",
    "purchase.update",
    "purchase.approve",
    "purchase.cancel",
    "stock.read",
    "stock.create",
    "stock.adjust",
    "stock.audit",
  ],

  // HQ admin — read-only across branches; transactional rights belong to the
  // branch_manager / super_admin level. Stock: read + audit only.
  hq_admin: ["purchase.read", "stock.read", "stock.audit"],

  // Purchase staff — opens tickets and edits drafts, but cannot self-approve
  // or cancel (separation of duties). Stock: can also create lots from their
  // approved tickets so the inbound flow doesn't bottleneck on warehouse.
  purchase_staff: [
    "purchase.read",
    "purchase.create",
    "purchase.update",
    "stock.read",
    "stock.create",
  ],

  // QC staff — reads and edits the QC-relevant fields (rubberType / note) on
  // WAITING_QC tickets, then forwards them to WAITING_APPROVAL.
  qc_staff: ["purchase.read", "purchase.update", "stock.read"],

  // Warehouse staff — Stock day-to-day operators: read, create lots from
  // approved purchases, and adjust (water loss, damage, etc.). They don't
  // need full audit because branch_manager handles deep audits.
  warehouse_staff: [
    "purchase.read",
    "stock.read",
    "stock.create",
    "stock.adjust",
  ],

  // Roles below need read access to trace where stock / payment / sales
  // records originated, but no transactional rights on purchase or stock.
  cashier: ["purchase.read", "stock.read"],
  production_staff: ["purchase.read", "stock.read"],
  sales_staff: ["purchase.read", "stock.read"],
  viewer: ["purchase.read", "stock.read"],
};

// ─── Seeders ─────────────────────────────────────────────────────────────────

async function seedBranch(tx: Prisma.TransactionClient): Promise<Branch> {
  return tx.branch.upsert({
    where: { code: HQ_BRANCH.code },
    create: {
      code: HQ_BRANCH.code,
      name: HQ_BRANCH.name,
      isActive: true,
    },
    update: {
      name: HQ_BRANCH.name,
    },
  });
}

async function seedRoles(tx: Prisma.TransactionClient): Promise<Role[]> {
  const roles: Role[] = [];
  for (const r of ROLES) {
    const role = await tx.role.upsert({
      where: { code: r.code },
      create: {
        code: r.code,
        name: r.name,
        description: r.description,
        isSystem: true,
        isActive: true,
      },
      update: {
        name: r.name,
        description: r.description,
        isSystem: true,
      },
    });
    roles.push(role);
  }
  return roles;
}

async function seedPermissions(
  tx: Prisma.TransactionClient,
): Promise<Permission[]> {
  const permissions: Permission[] = [];
  for (const p of PERMISSIONS) {
    const perm = await tx.permission.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        name: p.name,
        module: p.module,
        description: p.description,
      },
      update: {
        name: p.name,
        module: p.module,
        description: p.description,
      },
    });
    permissions.push(perm);
  }
  return permissions;
}

async function linkRolePermissions(
  tx: Prisma.TransactionClient,
  roleId: string,
  permissionIds: ReadonlyArray<string>,
): Promise<number> {
  for (const permissionId of permissionIds) {
    await tx.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      create: { roleId, permissionId },
      update: {},
    });
  }
  return permissionIds.length;
}

type RoleLinkResult = Readonly<{
  roleCode: string;
  linked: number;
  missingPermissions: ReadonlyArray<string>;
}>;

async function linkRolePermissionMap(
  tx: Prisma.TransactionClient,
  roles: ReadonlyArray<Role>,
  permissions: ReadonlyArray<Permission>,
  map: Readonly<Record<string, ReadonlyArray<string>>>,
): Promise<ReadonlyArray<RoleLinkResult>> {
  const rolesByCode = new Map(roles.map((r) => [r.code, r.id]));
  const permsByCode = new Map(permissions.map((p) => [p.code, p.id]));

  const results: RoleLinkResult[] = [];
  for (const [roleCode, permCodes] of Object.entries(map)) {
    const roleId = rolesByCode.get(roleCode);
    if (!roleId) {
      // Don't throw — surface as a warning so the seed remains forgiving if
      // someone removes a role from `ROLES` without cleaning up the map.
      console.warn(`⚠ Skipping unknown role in mapping: ${roleCode}`);
      continue;
    }
    const permIds: string[] = [];
    const missing: string[] = [];
    for (const code of permCodes) {
      const id = permsByCode.get(code);
      if (!id) {
        missing.push(code);
        continue;
      }
      permIds.push(id);
    }
    const linked = await linkRolePermissions(tx, roleId, permIds);
    results.push({ roleCode, linked, missingPermissions: missing });
  }
  return results;
}

// ─── Entrypoint ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("🌱 Seeding Rubber ERP foundation data…");

  const summary = await prisma.$transaction(
    async (tx) => {
      const branch = await seedBranch(tx);
      const roles = await seedRoles(tx);
      const permissions = await seedPermissions(tx);

      const superAdmin = roles.find((r) => r.code === SUPER_ADMIN_CODE);
      if (!superAdmin) {
        throw new Error(
          `Expected role "${SUPER_ADMIN_CODE}" to exist after upsert (seed aborted)`,
        );
      }

      const superAdminLinked = await linkRolePermissions(
        tx,
        superAdmin.id,
        permissions.map((p) => p.id),
      );

      const roleLinks = await linkRolePermissionMap(
        tx,
        roles,
        permissions,
        ROLE_PERMISSION_MAP,
      );

      return {
        branchCode: branch.code,
        branchName: branch.name,
        roleCodes: roles.map((r) => r.code),
        permissionCodes: permissions.map((p) => p.code),
        superAdminLinked,
        roleLinks,
      };
    },
    { timeout: 30_000, maxWait: 10_000 },
  );

  console.log(
    `   ✓ Branch       ${summary.branchCode}  ${summary.branchName}`,
  );
  console.log(
    `   ✓ Roles        ${summary.roleCodes.length} ensured`,
  );
  for (const code of summary.roleCodes) {
    console.log(`        · ${code}`);
  }
  console.log(
    `   ✓ Permissions  ${summary.permissionCodes.length} ensured`,
  );
  for (const code of summary.permissionCodes) {
    console.log(`        · ${code}`);
  }
  console.log(
    `   ✓ ${SUPER_ADMIN_CODE} → all ${summary.superAdminLinked} permissions linked`,
  );
  for (const link of summary.roleLinks) {
    console.log(
      `   ✓ ${link.roleCode} → ${link.linked} permissions linked`,
    );
    for (const missing of link.missingPermissions) {
      console.log(`        ⚠ missing permission code: ${missing}`);
    }
  }
  console.log("✓ Seed complete (idempotent)");
}

main()
  .catch((err: unknown) => {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
