export type EmailPreferenceKind =
  | "PAYMENT_UPDATE"
  | "NEW_PROPOSAL"
  | "SAVED_SEARCH_ALERT"
  | "MILESTONE_REVIEW"
  | "ESSENTIAL_WORKFLOW";

export type EmailPreferenceFlags = {
  notify_payment_updates?: boolean | null;
  notify_new_proposals?: boolean | null;
  notify_milestone_reviews?: boolean | null;
};

export function shouldSendEmailForPreference(
  kind: EmailPreferenceKind,
  prefs: EmailPreferenceFlags | null | undefined
) {
  if (kind === "ESSENTIAL_WORKFLOW") return true;
  if (kind === "PAYMENT_UPDATE") return prefs?.notify_payment_updates !== false;
  if (kind === "SAVED_SEARCH_ALERT") return true;
  if (kind === "NEW_PROPOSAL") return prefs?.notify_new_proposals === true;
  if (kind === "MILESTONE_REVIEW") return prefs?.notify_milestone_reviews !== false;
  return false;
}
