"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addOrganizationMember,
  removeOrganizationMember,
  updateOrganizationProfile,
} from "@/app/actions/organizations";

type OrganizationSettingsClientProps = {
  initial: {
    id: string | null;
    name: string;
    type: string;
    website: string;
    billingEmail: string;
  };
  members: {
    id: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    createdAt: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }[];
  currentUserId: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
};

export default function OrganizationSettingsClient({
  initial,
  members: initialMembers,
  currentUserId,
  verificationStatus,
}: OrganizationSettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [memberPending, startMemberTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [type, setType] = useState(initial.type || "SMB");
  const [website, setWebsite] = useState(initial.website);
  const [billingEmail, setBillingEmail] = useState(initial.billingEmail);
  const [members, setMembers] = useState(initialMembers);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [memberStatus, setMemberStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  const normalizeWebsite = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleSave = () => {
    setStatus(null);
    const trimmedName = name.trim();
    const normalizedWebsite = normalizeWebsite(website);
    const trimmedBillingEmail = billingEmail.trim();

    if (trimmedName.length < 2) {
      setStatus({ kind: "error", message: "Enter a workspace name with at least 2 characters." });
      return;
    }

    if (trimmedBillingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedBillingEmail)) {
      setStatus({ kind: "error", message: "Enter a valid billing email address." });
      return;
    }

    startTransition(async () => {
      const result = await updateOrganizationProfile({
        organizationId: initial.id || undefined,
        name: trimmedName,
        type: type.trim(),
        website: normalizedWebsite,
        billingEmail: trimmedBillingEmail,
      });

      if (!result.success) {
        setStatus({ kind: "error", message: result.error || "Could not save workspace identity." });
        return;
      }

      setName(trimmedName);
      setWebsite(normalizedWebsite);
      setBillingEmail(trimmedBillingEmail);
      const businessVerificationStatus = "businessVerificationStatus" in result ? result.businessVerificationStatus : undefined;
      setStatus({
        kind: "success",
        message: businessVerificationStatus === "PENDING"
          ? "Workspace identity saved. Business evidence queued for manual review."
          : "Workspace identity saved.",
      });
      router.refresh();
    });
  };

  const handleAddMember = () => {
    setMemberStatus(null);
    if (!initial.id) {
      setMemberStatus({ kind: "error", message: "Save workspace identity before adding teammates." });
      return;
    }

    startMemberTransition(async () => {
      const result = await addOrganizationMember({
        organizationId: initial.id,
        email: memberEmail,
        role: memberRole,
      });

      if (!result.success) {
        setMemberStatus({ kind: "error", message: result.error || "Could not add teammate." });
        return;
      }

      setMemberEmail("");
      setMemberRole("MEMBER");
      setMemberStatus({ kind: "success", message: "Teammate added." });
      router.refresh();
    });
  };

  const handleRemoveMember = (memberId: string) => {
    setMemberStatus(null);
    if (!initial.id) return;

    const previousMembers = members;
    setMembers(current => current.filter(member => member.id !== memberId));

    startMemberTransition(async () => {
      const result = await removeOrganizationMember({
        organizationId: initial.id,
        memberId,
      });

      if (!result.success) {
        setMembers(previousMembers);
        setMemberStatus({ kind: "error", message: result.error || "Could not remove teammate." });
        router.refresh();
        return;
      }

      setMemberStatus({ kind: "success", message: "Teammate removed." });
      router.refresh();
    });
  };

  const canRemove = (role: "OWNER" | "ADMIN" | "MEMBER", userId: string) => (
    role !== "OWNER" && userId !== currentUserId
  );

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">
            Workspace Name
          </label>
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Acme Software"
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">
            Organization Type
          </label>
          <select
            value={type}
            onChange={event => setType(event.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none cursor-pointer"
          >
            {["SMB", "Startup", "Agency", "Enterprise", "Non-Profit", "Other"].map(option => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">
            Website
          </label>
          <input
            value={website}
            onChange={event => setWebsite(event.target.value)}
            placeholder="https://acme.com"
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1.5">
            Billing Email
          </label>
          <input
            value={billingEmail}
            onChange={event => setBillingEmail(event.target.value)}
            placeholder="ap@acme.com"
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">domain_verification</span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-on-surface">Business Verification</p>
          <p className="text-xs font-medium text-on-surface-variant">
            {verificationStatus === "VERIFIED"
              ? "Verified workspace details are visible in buyer trust records."
              : "Saving workspace details creates a pending business verification record."}
          </p>
        </div>
        <span className={`ml-auto rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
          verificationStatus === "VERIFIED"
            ? "border-[#059669]/30 bg-[#059669]/10 text-[#059669]"
            : "border-outline-variant/30 bg-surface text-on-surface-variant"
        }`}>
          {verificationStatus.toLowerCase()}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isPending ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[15px]">refresh</span>
              Saving...
            </>
          ) : (
            "Save Workspace"
          )}
        </button>
        {status && (
          <p className={`text-xs font-bold ${status.kind === "success" ? "text-[#059669]" : "text-error"}`}>
            {status.message}
          </p>
        )}
      </div>

      <div className="border-t border-outline-variant/20 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-on-surface">Workspace Members</p>
            <p className="text-xs font-medium text-on-surface-variant mt-1">
              Add registered client teammates who can help review projects, bids, and billing evidence.
            </p>
          </div>
          <span className="rounded-md border border-outline-variant/30 bg-surface-container-low px-2 py-1 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
            {members.length} member{members.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2 mb-4">
          <input
            value={memberEmail}
            onChange={event => setMemberEmail(event.target.value)}
            placeholder="teammate@company.com"
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary outline-none transition-colors"
          />
          <select
            value={memberRole}
            onChange={event => setMemberRole(event.target.value as "ADMIN" | "MEMBER")}
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:border-primary outline-none cursor-pointer"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            type="button"
            onClick={handleAddMember}
            disabled={memberPending || !memberEmail.trim()}
            className="rounded-lg border border-primary/30 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-outline-variant/20">
          {members.length === 0 ? (
            <div className="bg-surface-container-low p-4 text-sm font-medium text-on-surface-variant">
              Save the workspace to create the owner membership record.
            </div>
          ) : (
            members.map(member => (
              <div key={member.id} className="flex flex-wrap items-center gap-3 border-b border-outline-variant/10 bg-surface-container-low px-4 py-3 last:border-b-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant/20 bg-surface text-xs font-black uppercase text-on-surface-variant">
                  {(member.user.name || member.user.email || "?").slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-on-surface">{member.user.name || "Unnamed teammate"}</p>
                  <p className="truncate text-xs font-medium text-on-surface-variant">{member.user.email}</p>
                </div>
                <span className="rounded-md border border-outline-variant/30 bg-surface px-2 py-1 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                  {member.role.toLowerCase()}
                </span>
                {canRemove(member.role, member.user.id) && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={memberPending}
                    className="rounded-md p-2 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
                    title="Remove teammate"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_remove</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {memberStatus && (
          <p className={`mt-3 text-xs font-bold ${memberStatus.kind === "success" ? "text-[#059669]" : "text-error"}`}>
            {memberStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}
