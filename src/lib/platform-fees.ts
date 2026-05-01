export type FeeBreakdown = {
  grossAmountCents: number;
  platformFeeCents: number;
  clientTotalCents: number;
  facilitatorPayoutCents: number;
  feeRate: number;
};

export const MARKETPLACE_CLIENT_FEE_RATE = 0.08;
export const BYOC_CLIENT_FEE_RATE = 0.05;
export const FACILITATOR_PLATFORM_FEE_RATE = 0;

export function formatFeeRate(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

export function getFacilitatorFeeLabel() {
  return formatFeeRate(FACILITATOR_PLATFORM_FEE_RATE);
}

export function getPlatformFeeRate({ isByoc }: { isByoc: boolean }) {
  return isByoc ? BYOC_CLIENT_FEE_RATE : MARKETPLACE_CLIENT_FEE_RATE;
}

export function calculateMilestoneFees({
  amount,
  isByoc,
}: {
  amount: number;
  isByoc: boolean;
}): FeeBreakdown {
  const grossAmountCents = Math.round(amount * 100);
  const feeRate = getPlatformFeeRate({ isByoc });
  const platformFeeCents = Math.round(grossAmountCents * feeRate);
  return {
    grossAmountCents,
    platformFeeCents,
    clientTotalCents: grossAmountCents + platformFeeCents,
    facilitatorPayoutCents: grossAmountCents,
    feeRate,
  };
}

export function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
