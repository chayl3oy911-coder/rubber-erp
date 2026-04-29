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
    code: "farmer.create",
    module: "farmer",
    name: "เพิ่มเกษตรกร",
    description: "เพิ่มเกษตรกรเข้าในระบบ",
  },
  {
    code: "farmer.read",
    module: "farmer",
    name: "ดูข้อมูลเกษตรกร",
    description: "ดูข้อมูลเกษตรกร",
  },
  {
    code: "farmer.update",
    module: "farmer",
    name: "แก้ไขข้อมูลเกษตรกร",
    description: "แก้ไขข้อมูลเกษตรกร",
  },
  {
    code: "farmer.delete",
    module: "farmer",
    name: "ปิดใช้งานเกษตรกร",
    description: "ปิดใช้งานเกษตรกรแบบ soft delete",
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

async function linkSuperAdminPermissions(
  tx: Prisma.TransactionClient,
  superAdminRoleId: string,
  permissionIds: ReadonlyArray<string>,
): Promise<number> {
  for (const permissionId of permissionIds) {
    await tx.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRoleId,
          permissionId,
        },
      },
      create: { roleId: superAdminRoleId, permissionId },
      update: {},
    });
  }
  return permissionIds.length;
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

      const linked = await linkSuperAdminPermissions(
        tx,
        superAdmin.id,
        permissions.map((p) => p.id),
      );

      return {
        branchCode: branch.code,
        branchName: branch.name,
        roleCodes: roles.map((r) => r.code),
        permissionCodes: permissions.map((p) => p.code),
        linked,
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
    `   ✓ ${SUPER_ADMIN_CODE} → ${summary.linked} permissions linked`,
  );
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
