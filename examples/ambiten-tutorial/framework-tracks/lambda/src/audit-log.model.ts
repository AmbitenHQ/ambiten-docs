import {
  AmbitenModel,
  AmbitenSchema,
  type SchemaDefinition
} from "@ambiten/core";
import { client } from "./runtime";

export interface AuditLog {
  action: string;
  userEmail: string;
  createdAt: Date;
}

const schema = new AmbitenSchema<AuditLog>({
  action: { type: String, required: true },
  userEmail: { type: String, required: true },
  createdAt: { type: Date, required: true }
} as unknown as SchemaDefinition<AuditLog>);

export const AuditLogModel = new AmbitenModel<AuditLog>({
  collectionName: "audit_logs",
  schema,
  provider: client
});
