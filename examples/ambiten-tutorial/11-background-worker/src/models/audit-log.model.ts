import { AmbitenModel, AmbitenSchema, type SchemaDefinition } from "@ambiten/core";
import { client } from "../core/db.js";

export interface AuditLog {
  action: string;
  userEmail: string;
  createdAt: Date;
}

// Isolate the same Core 1.2.4 declaration mismatch as the user schema.
export const auditLogSchema = new AmbitenSchema<AuditLog>({
  action: { type: String, required: true },
  userEmail: { type: String, required: true },
  createdAt: { type: Date, required: true }
} as unknown as SchemaDefinition<AuditLog>);

export const AuditLogModel = new AmbitenModel<AuditLog>({
  collectionName: "audit_logs",
  schema: auditLogSchema,
  provider: client
});
