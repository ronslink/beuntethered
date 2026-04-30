export type FeeBreakdown = {
  grossAmountCents: number;
  platformFeeCents: number;
  clientTotalCents: number;
  facilitatorPayoutCents: number;
  feeRate: number;
};

export function getPlatformFeeRate({ isByoc }: { isByoc: boolean }) {
  return isByoc ? 0.05 : 0.08;
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
