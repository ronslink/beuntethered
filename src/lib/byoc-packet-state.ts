export type BYOCFirstMilestoneState = {
  title: string;
  status: string;
  amountCents: number;
} | null;

export type BYOCPacketStateInput = {
  id: string;
  status: string;
  inviteToken: string | null;
  clientId?: string | null;
  clientEmail?: string | null;
  firstMilestone?: BYOCFirstMilestoneState;
};

export type BYOCPacketState = {
  label: string;
  detail: string;
  icon: string;
  tone: string;
  href: string;
  action: string;
};

function formatStatus(value: string) {
  return value.replace(/_/g, " ").toLowerCase();
}

export function getBYOCPacketState(packet: BYOCPacketStateInput): BYOCPacketState {
  if (packet.clientId || !packet.inviteToken) {
    const firstMilestoneStatus = packet.firstMilestone?.status;

    if (packet.status === "ACTIVE" && firstMilestoneStatus === "PENDING") {
      return {
        label: "Awaiting funding",
        detail: "Buyer claimed packet",
        icon: "account_balance_wallet",
        tone: "border-secondary/25 bg-secondary/10 text-secondary",
        href: `/command-center/${packet.id}`,
        action: "Open Funding",
      };
    }

    if (packet.status === "ACTIVE" && firstMilestoneStatus === "FUNDED_IN_ESCROW") {
      return {
        label: "Delivery open",
        detail: "First milestone funded",
        icon: "rocket_launch",
        tone: "border-tertiary/25 bg-tertiary/10 text-tertiary",
        href: `/command-center/${packet.id}`,
        action: "Open Work",
      };
    }

    if (packet.status === "ACTIVE" && firstMilestoneStatus === "SUBMITTED_FOR_REVIEW") {
      return {
        label: "In review",
        detail: "Buyer review needed",
        icon: "rate_review",
        tone: "border-primary/25 bg-primary/10 text-primary",
        href: `/command-center/${packet.id}`,
        action: "Open Review",
      };
    }

    return {
      label: packet.status === "ACTIVE" ? "Claimed" : formatStatus(packet.status),
      detail: packet.status === "ACTIVE" ? "Buyer workspace active" : "Moved into governed work",
      icon: "task_alt",
      tone: "border-tertiary/25 bg-tertiary/10 text-tertiary",
      href: `/command-center/${packet.id}`,
      action: "Open Work",
    };
  }

  if (packet.clientEmail) {
    return {
      label: "Email locked",
      detail: "Waiting for invited buyer",
      icon: "lock_person",
      tone: "border-primary/25 bg-primary/10 text-primary",
      href: `/invite/${packet.inviteToken}`,
      action: "Open Invite",
    };
  }

  return {
    label: "Awaiting claim",
    detail: "Share the private invite link",
    icon: "outgoing_mail",
    tone: "border-secondary/25 bg-secondary/10 text-secondary",
    href: `/invite/${packet.inviteToken}`,
    action: "Open Invite",
  };
}
