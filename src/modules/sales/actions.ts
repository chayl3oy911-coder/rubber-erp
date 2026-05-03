"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requirePermission } from "@/shared/auth/dal";

import type {
  SalesActionState,
  SalesFieldKey,
  SalesLineFormValue,
} from "./action-state";
import {
  createSalesSchema,
  replaceSalesLinesSchema,
  transitionStatusSchema,
  updateSalesFieldsSchema,
} from "./schemas";
import {
  SalesAutoGenError,
  SalesBranchNotInScopeError,
  SalesCancelReasonRequiredError,
  SalesDuplicateLotError,
  SalesInsufficientStockError,
  SalesLinesEmptyError,
  SalesLinesLockedError,
  SalesNotFoundError,
  SalesStatusFieldsLockedError,
  SalesStatusTransitionError,
  SalesStockLotBranchMismatchError,
  SalesStockLotInactiveError,
  SalesStockLotNotActiveError,
  SalesStockLotNotFoundError,
  createSalesOrder,
  replaceSalesOrderLines,
  transitionSalesStatus,
  updateSalesOrderFields,
  type SalesAuditMeta,
} from "./service";
import { type SaleType, type SalesOrderStatus } from "./types";

async function buildAuditMeta(): Promise<SalesAuditMeta> {
  const h = await headers();
  return {
    ipAddress:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null,
    userAgent: h.get("user-agent") ?? null,
    source: "action",
  };
}

function emptyToUndefined(v: FormDataEntryValue | null): string | undefined {
  if (v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

// ─── Lines payload (JSON in hidden form field `linesJson`) ──────────────────
//
// The form encodes the dynamic line repeater as a single JSON array — it
// keeps the Server Action contract trivial (no array indexing) and lets us
// echo the full `values.lines` back on validation errors.

type RawLine = SalesLineFormValue;

function parseLinesJson(raw: FormDataEntryValue | null): RawLine[] {
  if (raw === null) return [];
  const text = String(raw).trim();
  if (text === "") return [];
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
      .map<RawLine>((x) => ({
        stockLotId: typeof x.stockLotId === "string" ? x.stockLotId : "",
        lotNo: typeof x.lotNo === "string" ? x.lotNo : "",
        rubberType: typeof x.rubberType === "string" ? x.rubberType : "",
        effectiveCostPerKg:
          typeof x.effectiveCostPerKg === "string"
            ? x.effectiveCostPerKg
            : typeof x.effectiveCostPerKg === "number"
              ? String(x.effectiveCostPerKg)
              : "",
        remainingWeight:
          typeof x.remainingWeight === "string"
            ? x.remainingWeight
            : typeof x.remainingWeight === "number"
              ? String(x.remainingWeight)
              : "",
        grossWeight:
          typeof x.grossWeight === "string"
            ? x.grossWeight
            : typeof x.grossWeight === "number"
              ? String(x.grossWeight)
              : "",
      }));
  } catch {
    return [];
  }
}

function collectCreateForm(formData: FormData) {
  return {
    branchId: emptyToUndefined(formData.get("branchId")),
    buyerName: emptyToUndefined(formData.get("buyerName")),
    saleType: emptyToUndefined(formData.get("saleType")),
    drcPercent: emptyToUndefined(formData.get("drcPercent")),
    pricePerKg: emptyToUndefined(formData.get("pricePerKg")),
    withholdingTaxPercent: emptyToUndefined(
      formData.get("withholdingTaxPercent"),
    ),
    expectedReceiveDate: emptyToUndefined(formData.get("expectedReceiveDate")),
    note: emptyToUndefined(formData.get("note")),
    lines: parseLinesJson(formData.get("linesJson")),
  };
}

function collectUpdateHeaderForm(formData: FormData) {
  return {
    buyerName: emptyToUndefined(formData.get("buyerName")),
    saleType: emptyToUndefined(formData.get("saleType")),
    drcPercent: emptyToUndefined(formData.get("drcPercent")),
    pricePerKg: emptyToUndefined(formData.get("pricePerKg")),
    withholdingTaxPercent: emptyToUndefined(
      formData.get("withholdingTaxPercent"),
    ),
    expectedReceiveDate: emptyToUndefined(formData.get("expectedReceiveDate")),
    note: emptyToUndefined(formData.get("note")),
  };
}

// Map a Zod issue path to a (fieldKey OR lineIndex). Lines come back with
// path = ["lines", <number>, "<key>"]; everything else is header-level.
function applyZodIssue(
  issue: { path: ReadonlyArray<PropertyKey>; message: string },
  fieldErrors: Partial<Record<SalesFieldKey, string>>,
  lineErrors: Record<number, string>,
): string | undefined {
  if (issue.path.length === 0) return issue.message;

  const head = issue.path[0];
  const headStr =
    typeof head === "string" || typeof head === "number"
      ? String(head)
      : undefined;
  if (!headStr) return issue.message;

  if (headStr === "lines") {
    const idx = issue.path[1];
    if (typeof idx === "number") {
      if (lineErrors[idx] === undefined) lineErrors[idx] = issue.message;
    } else {
      if (!fieldErrors.lines) fieldErrors.lines = issue.message;
    }
    return undefined;
  }

  const key = headStr as SalesFieldKey;
  if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  return undefined;
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createSalesAction(
  _prev: SalesActionState,
  formData: FormData,
): Promise<SalesActionState> {
  const me = await requirePermission("sales.create");

  const raw = collectCreateForm(formData);

  const parsed = createSalesSchema.safeParse({
    branchId: raw.branchId ?? "",
    buyerName: raw.buyerName ?? "",
    saleType: raw.saleType ?? "",
    drcPercent: raw.drcPercent ?? "",
    pricePerKg: raw.pricePerKg ?? "",
    withholdingTaxPercent: raw.withholdingTaxPercent,
    expectedReceiveDate: raw.expectedReceiveDate,
    note: raw.note,
    lines: raw.lines.map((l) => ({
      stockLotId: l.stockLotId,
      grossWeight: l.grossWeight,
    })),
  });

  if (!parsed.success) {
    const fieldErrors: SalesActionState["fieldErrors"] = {};
    const lineErrors: Record<number, string> = {};
    let topLevelError: string | undefined;
    for (const issue of parsed.error.issues) {
      const top = applyZodIssue(issue, fieldErrors, lineErrors);
      if (top && !topLevelError) topLevelError = top;
    }
    return {
      fieldErrors,
      lineErrors,
      error: topLevelError,
      values: {
        ...raw,
        saleType: raw.saleType as SaleType | undefined,
      },
    };
  }

  let createdId: string | null = null;
  try {
    const created = await createSalesOrder(
      me,
      parsed.data,
      await buildAuditMeta(),
    );
    createdId = created.id;
  } catch (error) {
    if (error instanceof SalesBranchNotInScopeError) {
      return {
        fieldErrors: { branchId: error.message },
        values: { ...raw, saleType: raw.saleType as SaleType | undefined },
      };
    }
    if (error instanceof SalesLinesEmptyError) {
      return {
        fieldErrors: { lines: error.message },
        values: { ...raw, saleType: raw.saleType as SaleType | undefined },
      };
    }
    if (
      error instanceof SalesStockLotNotFoundError ||
      error instanceof SalesStockLotBranchMismatchError ||
      error instanceof SalesStockLotInactiveError ||
      error instanceof SalesStockLotNotActiveError ||
      error instanceof SalesInsufficientStockError ||
      error instanceof SalesDuplicateLotError
    ) {
      const lineErrors: Record<number, string> = {};
      const targetLotId = (error as { stockLotId?: string }).stockLotId;
      if (targetLotId) {
        const idx = raw.lines.findIndex((l) => l.stockLotId === targetLotId);
        if (idx >= 0) lineErrors[idx] = error.message;
      }
      return {
        fieldErrors: Object.keys(lineErrors).length === 0
          ? { lines: error.message }
          : undefined,
        lineErrors,
        error: error.message,
        values: { ...raw, saleType: raw.saleType as SaleType | undefined },
      };
    }
    if (error instanceof SalesAutoGenError) {
      return {
        error: error.message,
        values: { ...raw, saleType: raw.saleType as SaleType | undefined },
      };
    }
    throw error;
  }

  redirect(`/sales/${createdId}`);
}

// ─── Update header (no lines) ───────────────────────────────────────────────

export async function updateSalesAction(
  salesOrderId: string,
  _prev: SalesActionState,
  formData: FormData,
): Promise<SalesActionState> {
  const me = await requirePermission("sales.create");

  const raw = collectUpdateHeaderForm(formData);

  const parsed = updateSalesFieldsSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: SalesActionState["fieldErrors"] = {};
    const lineErrors: Record<number, string> = {};
    let topLevelError: string | undefined;
    for (const issue of parsed.error.issues) {
      const top = applyZodIssue(issue, fieldErrors, lineErrors);
      if (top && !topLevelError) topLevelError = top;
    }
    return {
      fieldErrors,
      error: topLevelError,
      values: { ...raw, saleType: raw.saleType as SaleType | undefined },
    };
  }

  try {
    await updateSalesOrderFields(
      me,
      salesOrderId,
      parsed.data,
      await buildAuditMeta(),
    );
  } catch (error) {
    if (error instanceof SalesNotFoundError) {
      redirect("/sales");
    }
    if (error instanceof SalesStatusFieldsLockedError) {
      return {
        fieldErrors: { [error.field as SalesFieldKey]: error.message },
        values: { ...raw, saleType: raw.saleType as SaleType | undefined },
      };
    }
    throw error;
  }

  redirect(`/sales/${salesOrderId}`);
}

// ─── Replace lines (DRAFT only) ─────────────────────────────────────────────
//
// Bound by the page with `salesOrderId`. Form posts a single `linesJson`
// field. Status check + line validation lives in the service.

export async function replaceSalesLinesAction(
  salesOrderId: string,
  _prev: SalesActionState,
  formData: FormData,
): Promise<SalesActionState> {
  const me = await requirePermission("sales.create");

  const lines = parseLinesJson(formData.get("linesJson"));

  const parsed = replaceSalesLinesSchema.safeParse({
    lines: lines.map((l) => ({
      stockLotId: l.stockLotId,
      grossWeight: l.grossWeight,
    })),
  });

  if (!parsed.success) {
    const fieldErrors: SalesActionState["fieldErrors"] = {};
    const lineErrors: Record<number, string> = {};
    let topLevelError: string | undefined;
    for (const issue of parsed.error.issues) {
      const top = applyZodIssue(issue, fieldErrors, lineErrors);
      if (top && !topLevelError) topLevelError = top;
    }
    return {
      fieldErrors,
      lineErrors,
      error: topLevelError,
      values: { lines },
    };
  }

  try {
    await replaceSalesOrderLines(
      me,
      salesOrderId,
      parsed.data,
      await buildAuditMeta(),
    );
  } catch (error) {
    if (error instanceof SalesNotFoundError) {
      redirect("/sales");
    }
    if (error instanceof SalesLinesLockedError) {
      return { error: error.message, values: { lines } };
    }
    if (error instanceof SalesLinesEmptyError) {
      return {
        fieldErrors: { lines: error.message },
        values: { lines },
      };
    }
    if (
      error instanceof SalesStockLotNotFoundError ||
      error instanceof SalesStockLotBranchMismatchError ||
      error instanceof SalesStockLotInactiveError ||
      error instanceof SalesStockLotNotActiveError ||
      error instanceof SalesInsufficientStockError ||
      error instanceof SalesDuplicateLotError
    ) {
      const lineErrors: Record<number, string> = {};
      const targetLotId = (error as { stockLotId?: string }).stockLotId;
      if (targetLotId) {
        const idx = lines.findIndex((l) => l.stockLotId === targetLotId);
        if (idx >= 0) lineErrors[idx] = error.message;
      }
      return {
        lineErrors,
        error: error.message,
        values: { lines },
      };
    }
    throw error;
  }

  redirect(`/sales/${salesOrderId}`);
}

// ─── Status transition (confirm / cancel) ───────────────────────────────────

export async function transitionSalesStatusAction(
  salesOrderId: string,
  to: SalesOrderStatus,
  formData: FormData,
): Promise<void> {
  const permission =
    to === "CONFIRMED"
      ? "sales.confirm"
      : to === "CANCELLED"
        ? "sales.cancel"
        : "sales.create";
  const me = await requirePermission(permission);

  const cancelReason = emptyToUndefined(formData.get("cancelReason"));

  const parsed = transitionStatusSchema.safeParse({ status: to, cancelReason });
  if (!parsed.success) {
    redirect(`/sales/${salesOrderId}`);
  }

  try {
    await transitionSalesStatus(
      me,
      salesOrderId,
      to,
      cancelReason,
      await buildAuditMeta(),
    );
  } catch (error) {
    if (error instanceof SalesNotFoundError) {
      redirect("/sales");
    }
    if (
      error instanceof SalesStatusTransitionError ||
      error instanceof SalesCancelReasonRequiredError ||
      error instanceof SalesInsufficientStockError ||
      error instanceof SalesStockLotNotActiveError ||
      error instanceof SalesStockLotInactiveError ||
      error instanceof SalesLinesEmptyError
    ) {
      redirect(
        `/sales/${salesOrderId}?error=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }

  redirect(`/sales/${salesOrderId}`);
}

