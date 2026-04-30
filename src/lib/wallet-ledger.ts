export type WalletLedgerPaymentRecord = {
  kind: string;
  status: string;
  platform_fee_cents: number;
  facilitator_payout_cents: number;
  created_at: Date;
};

export function getLatestLedgerPaymentRecord<T extends WalletLedgerPaymentRecord>(
  records: T[] | undefined,
  kind?: string
): T | null {
  const filtered = kind ? (records ?? []).filter((record) => record.kind === kind) : records ?? [];
  return [...filtered].sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] ?? null;
}

export function isSucceededFundingRecord(record: WalletLedgerPaymentRecord) {
  return record.kind === "MILESTONE_FUNDING" && record.status === "SUCCEEDED";
}

export function isSucceededReleaseRecord(record: WalletLedgerPaymentRecord) {
  return record.kind === "ESCROW_RELEASE" && record.status === "SUCCEEDED";
}

export function sumSucceededClientFundingFeesCents(records: WalletLedgerPaymentRecord[]) {
  return records
    .filter(isSucceededFundingRecord)
    .reduce((sum, record) => sum + record.platform_fee_cents, 0);
}

export function sumSucceededFacilitatorPayoutCents(records: WalletLedgerPaymentRecord[]) {
  return records
    .filter(isSucceededReleaseRecord)
    .reduce((sum, record) => sum + record.facilitator_payout_cents, 0);
}
