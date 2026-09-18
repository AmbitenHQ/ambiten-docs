import { UserModel } from "../models/user.model.js";
import { AmbitenContext } from "@ambiten/core";
import { AuditLogModel } from "../models/audit-log.model.js";
import { getExecutionInfo } from "../utils/execution.js";

export async function listUsers() {
  const beforeAwait = AmbitenContext.get();
  await Promise.resolve();
  const afterAwait = AmbitenContext.get();
  const users = await UserModel.find({});

  return {
    execution: {
      beforeAwait: { tenantId: beforeAwait.tenantId, requestId: beforeAwait.requestId },
      afterAwait: { tenantId: afterAwait.tenantId, requestId: afterAwait.requestId },
      helper: getExecutionInfo()
    },
    users
  };
}

export interface CreateUserTransactionInput {
  name: string;
  email: string;
  simulateFailure?: boolean;
}

export async function createUserWithAudit(input: CreateUserTransactionInput) {
  return UserModel.runInTransaction(() => AmbitenContext.run({
    ...AmbitenContext.get(),
    // Core 1.2.4 binds the initiating model's collection to the transaction.
    // Let each model use its own collection while sharing tenant and session.
    collectionName: undefined
  }, async () => {
    const ctx = AmbitenContext.get();
    const user = await UserModel.create({ name: input.name, email: input.email });

    if (input.simulateFailure) {
      throw new Error("Intentional transaction failure.");
    }

    const audit = await AuditLogModel.create({
      action: "USER_CREATED",
      userEmail: user.email,
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
  }));
}

export const listDeletedUsers = () => UserModel.find(
	{},
	{ onlyDeleted: true }
);

export const listUsersIncludingDeleted = () => UserModel.find(
	{}, { withDeleted: true }
);

export const softDeleteUser = async (email: string) => {
	await UserModel.deleteOne({ email });
};

export const restoreUser = async (email: string) => {
	await UserModel.restoreOne(
		{
			email,
			isDeleted: true
		}
	);
};

export const purgeUser = async (email: string) => {
	await UserModel.deleteOne(
		{
			email,
			isDeleted: true
		},
		{ hardDelete: true }
	);
};
