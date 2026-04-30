export type ReleaseAttestationView = {
  testedPreview: boolean;
  reviewedEvidence: boolean;
  acceptsPaymentRelease: boolean;
  auditStatus?: string;
  acceptedAt?: string;
  failedAuditOverrideReason?: string;
};

export function getReleaseAttestation(metadata: unknown): ReleaseAttestationView | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const attestation = (metadata as Record<string, unknown>).approval_attestation;
  if (!attestation || typeof attestation !== "object" || Array.isArray(attestation)) return null;
  const value = attestation as Record<string, unknown>;

  return {
    testedPreview: value.testedPreview === true,
    reviewedEvidence: value.reviewedEvidence === true,
    acceptsPaymentRelease: value.acceptsPaymentRelease === true,
    auditStatus: typeof value.auditStatus === "string" ? value.auditStatus : undefined,
    acceptedAt: typeof value.acceptedAt === "string" ? value.acceptedAt : undefined,
    failedAuditOverrideReason:
      typeof value.failedAuditOverrideReason === "string" ? value.failedAuditOverrideReason : undefined,
  };
}

export function formatReleaseAttestationValue(value: string | boolean | undefined) {
  if (typeof value === "string") return value.toLowerCase();
  return value ? "Confirmed" : "Not recorded";
}
