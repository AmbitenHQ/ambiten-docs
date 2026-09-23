import { AmbitenModel, AmbitenSchema } from "@ambiten/core";
import { client } from "./runtime.js";

export interface AuditLog {
  action: string;
  userId: string;
  createdAt: Date;
}

const schema = new AmbitenSchema<AuditLog>({
  action: { type: String, required: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, required: true }
});

export const AuditLogModel = new AmbitenModel<AuditLog>({
  collectionName: "audit_logs",
  schema,
  provider: client
});
