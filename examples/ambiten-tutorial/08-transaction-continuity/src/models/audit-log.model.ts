import { AmbitenModel, AmbitenSchema } from "@ambiten/core";
import { client } from "../core/db.js";


export interface AuditLog {
	action: string;
	userEmail: string;
	createdAt: Date;
}

const auditSchema = new AmbitenSchema<AuditLog>({
		action: String,
		userEmail: String,
		createdAt: Date
	})

export const AuditLogModel = new AmbitenModel<AuditLog>({
	collectionName: "audit_logs",
	schema: auditSchema,
	provider: client
});
