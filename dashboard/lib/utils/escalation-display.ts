/** Shared escalation proposal chips — keep dashboard wording consistent */

export function escalationTone(status: string): "green" | "amber" | "red" {
  switch (status) {
    case "executed":
      return "green";
    case "pending":
    case "approved":
    case "awaiting_proposal":
      return "amber";
    default:
      return "red";
  }
}

export function escalationLabel(status: string): string {
  switch (status) {
    case "awaiting_proposal":
      return "AWAITING PROPOSAL";
    case "pending":
      return "PENDING APPROVAL";
    case "approved":
      return "APPROVED";
    case "executed":
      return "EXECUTED";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELLED";
    default:
      return status.toUpperCase();
  }
}
