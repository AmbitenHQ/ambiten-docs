import { UserModel, userSchema } from "../models/user.model.js";


let configured = false;

export function configureUserLifecycle() {
	if (configured) return;
	configured = true;

	UserModel.setSoftDeleteConfig({
		deletedAtField: "deletedAt",
		isDeletedField: "isDeleted"
	});

	UserModel.beforeSave(
		async ctx => {
			if (!ctx.doc) return;
			if (ctx.doc.email) ctx.doc.email = ctx.doc.email.trim().toLowerCase();

			ctx.doc.createdAt ??= new Date();
			ctx.doc.isDeleted ??= false;
		});

	userSchema.pre("create",
		async ctx => {
			if (!ctx.tenantId)
				throw new Error("Tenant context is required.");
		});

	UserModel.beforeFind(
		async ctx => {
			if (ctx.onlyDeleted) {
				ctx.filter = {
					...(ctx.filter ?? {}),
					isDeleted: true
				};
				return;
			}

			if (!ctx.withDeleted)
				ctx.filter = {
					...(ctx.filter ?? {}),
					isDeleted: { $ne: true }
				};
		});

	UserModel.beforeFindOne(
		async ctx => {
			if (ctx.onlyDeleted) {
				ctx.filter = {
					...(ctx.filter ?? {}),
					isDeleted: true
				};

				return;
			}

			if (!ctx.withDeleted)
				ctx.filter = {
					...(ctx.filter ?? {}),
					isDeleted: { $ne: true }
				};

		});

	UserModel.beforeDeleteOne(
		async ctx => {
			if (ctx.hardDelete) return;

			ctx.filter = {
				...(ctx.filter ?? {}
				),
				isDeleted: { $ne: true }
			};

			ctx.meta = {
				...(ctx.meta ?? {}),
				softDelete: true
			};

			ctx.update = {
				$set: {
					isDeleted: true,
					deletedAt: new Date()
				}
			};
		});
}
