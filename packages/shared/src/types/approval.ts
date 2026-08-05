import type { ApprovalStatus, ApprovalType } from "../constants.js";

export interface Approval {
  id: string;
  companyId: string;
  type: ApprovalType;
  requestedByAgentId: string | null;
  requestedByUserId: string | null;
  status: ApprovalStatus;
  payload: Record<string, unknown>;
  decisionNote: string | null;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Publication contract (JAC-4538): populated when type = "publish_full_artifact"
  artifactKind: "full_report" | "raw_transcript" | "private_payload" | null;
  artifactPointer: string | null;
  artifactSha256: string | null;
  redactionState: "unredacted" | "partially_redacted" | "fully_redacted";
}

export interface ApprovalComment {
  id: string;
  companyId: string;
  approvalId: string;
  authorAgentId: string | null;
  authorUserId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}
