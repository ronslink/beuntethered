import { NextResponse } from "next/server";
export {
  getPendingCheckoutBlock,
  getPaymentRecordClientId,
  validateFacilitatorPayoutReadiness,
  validateMilestoneFundingReadiness,
} from "./payment-route-rules.ts";

export type PaymentRouteErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_PAYMENT_REQUEST"
  | "MILESTONE_NOT_FOUND"
  | "PAYMENT_ACCESS_DENIED"
  | "CHECKOUT_ALREADY_STARTED"
  | "MILESTONE_NOT_FUNDABLE"
  | "MILESTONE_UNASSIGNED"
  | "FACILITATOR_PAYOUT_NOT_READY"
  | "FACILITATOR_PAYOUT_NOT_VERIFIED"
  | "FACILITATOR_IDENTITY_NOT_VERIFIED"
  | "APPROVAL_ATTESTATION_REQUIRED"
  | "MILESTONE_NOT_RELEASABLE"
  | "PAYMENT_CONFIGURATION_MISSING"
  | "PAYMENT_OPERATION_FAILED";

export function paymentError({
  error,
  code,
  status,
}: {
  error: string;
  code: PaymentRouteErrorCode | string;
  status: number;
}) {
  return NextResponse.json({ error, code }, { status });
}
