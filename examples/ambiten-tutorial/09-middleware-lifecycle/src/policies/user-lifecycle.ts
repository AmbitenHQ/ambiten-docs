import { UserModel, userSchema } from "../models/user.model.js";
import { ModelContext } from '@ambiten/core';

let configured = false;

export function configureUserLifecycle() {
	if (configured) return;
	configured = true;

	UserModel.setSoftDeleteConfig({
		deletedAtField: "deletedAt",
		isDeletedField: "isDeleted"
	});

	UserModel.beforeSave(async (ctx: ModelContext) => {
		if (!ctx.doc) return;
		if (ctx.doc.email) ctx.doc.email = ctx.doc.email.trim().toLowerCase();

		ctx.doc.createdAt ??= new Date();
		ctx.doc.isDeleted ??= false;
	});

	userSchema.pre("create",
		async (ctx: ModelContext) => {
			if (!ctx.tenantId)
				throw new Error("Tenant context is required.");
		});

	UserModel.beforeFind(
		async (ctx: ModelContext) => {
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
		async (ctx: ModelContext) => {
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
		async (ctx: ModelContext) => {
			/*
			 * hardDelete means:
			 * do not convert this operation
			 * into a soft delete.
			 */
			if (ctx.hardDelete) {
				return;
			}

			/*
			 * Do not soft-delete something
			 * that is already deleted.
			 */
			const filter =
				ctx.filter ?? {};

			ctx.filter = {
				...filter,
				isDeleted: {
					$ne: true
				}
			};

			/*
			 * Tell AmbitenModel.deleteOne()
			 * to take its soft-delete branch.
			 */
			ctx.meta = {
				...(ctx.meta ?? {}),
				softDelete: true
			};

			/*
			 * deleteOne() requires the middleware
			 * to provide the soft-delete update.
			 */
			ctx.update = {
				$set: {
					isDeleted: true,
					deletedAt: new Date()
				}
			};
		}
	);

	// UserModel.beforeDeleteOne(
	// 	async (ctx: ModelContext) => {
	// 		if (ctx.hardDelete) return;

	// 		ctx.filter = {
	// 			...(ctx.filter ?? {}
	// 			),
	// 			isDeleted: { $ne: true }
	// 		};

	// 		ctx.meta = {
	// 			...(ctx.meta ?? {}),
	// 			softDelete: true
	// 		};

	// 		ctx.update = {
	// 			$set: {
	// 				isDeleted: true,
	// 				deletedAt: new Date()
	// 			}
	// 		};
	// 	});
}
