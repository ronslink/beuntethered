export function getProfileViewWindowStart(now = new Date()) {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 7);
  return start;
}

export function getProfileViewDeduplicationStart(now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export function shouldRecordProfileView({
  facilitatorId,
  viewerId,
  viewerRole,
}: {
  facilitatorId: string;
  viewerId?: string | null;
  viewerRole?: string | null;
}) {
  return Boolean(viewerId && viewerId !== facilitatorId && viewerRole === "CLIENT");
}
