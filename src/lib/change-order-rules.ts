import type { ChangeOrderStatus } from "@prisma/client";

export type ChangeOrderFundingReadiness =
  | { ok: true; addedCostCents: number }
  | {
      ok: false;
      code: "CHANGE_ORDER_NOT_FUNDABLE" | "INVALID_CHANGE_ORDER_AMOUNT";
      status: 409 | 400;
      error: string;
    };

export function getChangeOrderCostCents(addedCost: number | string | { toString(): string }) {
  const cents = Math.round(Number(addedCost) * 100);
  return Number.isFinite(cents) ? cents : 0;
}

export function canFundChangeOrderStatus(status: ChangeOrderStatus) {
  return status === "PROPOSED";
}

export function validateChangeOrderFundingReadiness(order: {
  status: ChangeOrderStatus;
  added_cost: number | string | { toString(): string };
}): ChangeOrderFundingReadiness {
  if (!canFundChangeOrderStatus(order.status)) {
    return {
      ok: false,
      code: "CHANGE_ORDER_NOT_FUNDABLE",
      status: 409,
      error: "Change order is not pending buyer approval.",
    };
  }

  const addedCostCents = getChangeOrderCostCents(order.added_cost);
  if (addedCostCents <= 0) {
    return {
      ok: false,
      code: "INVALID_CHANGE_ORDER_AMOUNT",
      status: 400,
      error: "Change order cost must be greater than zero.",
    };
  }

  return { ok: true, addedCostCents };
}

export function buildChangeOrderCheckoutMetadata({
  changeOrderId,
  projectId,
  addedCostCents,
}: {
  changeOrderId: string;
  projectId: string;
  addedCostCents: number;
}) {
  return {
    change_order_id: changeOrderId,
    project_id: projectId,
    change_order_amount_cents: String(addedCostCents),
  };
}
