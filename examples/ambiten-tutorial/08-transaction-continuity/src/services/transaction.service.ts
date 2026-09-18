import { AmbitenContext } from "@ambiten/core";
import { AuditLogModel } from "../models/audit-log.model.js";
import { UserModel } from "../models/user.model.js";


export async function createUserWithAudit( input: {
		name: string;
		email: string;
		simulateFailure?: boolean
	}) {
	return UserModel.runInTransaction(
		async () => {
			const ctx = AmbitenContext.get();
			const user = await UserModel.create({
				name: input.name,
				email: input.email,
				createdAt: new Date()
			});
			
			if (input.simulateFailure)
				throw new Error("Intentional transaction failure.");
			
			const audit = await AuditLogModel.create({
				action: "USER_CREATED",
				userEmail: input.email,
				createdAt: new Date()
			});
			
			return {
				transaction: {
					tenantId: ctx.tenantId,
					sessionActive: Boolean(ctx.session)
				},
				user,
				audit
			};
		});
}
