import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/shared/lib/prisma";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

import { InactiveAccountError, MissingAppUserError } from "./errors";
import type { AuthBranch, AuthRole, AuthenticatedUser } from "./types";

export const currentUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: sbUser },
    } = await supabase.auth.getUser();

    if (!sbUser) {
      return null;
    }

    const appUser = await prisma.appUser.findUnique({
      where: { supabaseUserId: sbUser.id },
      include: {
        userRoles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        userBranches: {
          where: { isActive: true },
          include: { branch: true },
        },
      },
    });

    if (!appUser) {
      throw new MissingAppUserError(sbUser.id, sbUser.email ?? null);
    }

    if (!appUser.isActive) {
      throw new InactiveAccountError();
    }

    const permissions = new Set<string>();
    const roles: AuthRole[] = [];
    for (const ur of appUser.userRoles) {
      if (!ur.role.isActive) continue;
      roles.push({ code: ur.role.code, name: ur.role.name });
      for (const rp of ur.role.rolePermissions) {
        permissions.add(rp.permission.code);
      }
    }

    const branches: AuthBranch[] = appUser.userBranches
      .filter((ub) => ub.branch.isActive)
      .map((ub) => ({
        id: ub.branch.id,
        code: ub.branch.code,
        name: ub.branch.name,
      }));

    return {
      id: appUser.id,
      supabaseUserId: appUser.supabaseUserId,
      email: appUser.email,
      displayName: appUser.displayName,
      isSuperAdmin: appUser.isSuperAdmin,
      isActive: appUser.isActive,
      roles,
      permissions,
      branches,
      branchIds: branches.map((b) => b.id),
    };
  }
);

export async function requireAuth(): Promise<AuthenticatedUser> {
  const me = await currentUser();
  if (!me) {
    redirect("/login");
  }
  return me;
}

export function hasPermission(
  user: AuthenticatedUser,
  code: string
): boolean {
  return user.isSuperAdmin || user.permissions.has(code);
}

export async function requirePermission(
  code: string
): Promise<AuthenticatedUser> {
  const me = await requireAuth();
  if (!hasPermission(me, code)) {
    redirect("/forbidden");
  }
  return me;
}

type BranchScopedWhere<T> = T & {
  branchId: { in: ReadonlyArray<string> };
};

export function branchScope<T extends Record<string, unknown>>(
  user: AuthenticatedUser,
  baseWhere?: T
): T | BranchScopedWhere<T> {
  if (user.isSuperAdmin) {
    return baseWhere ?? ({} as T);
  }
  return {
    ...(baseWhere ?? ({} as T)),
    branchId: { in: user.branchIds },
  };
}
