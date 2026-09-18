import { Router } from "express";
import { UserModel } from "../models/user.model.js";
import {
	listDeletedUsers,
	listUsersIncludingDeleted,
	purgeUser,
	restoreUser,
	softDeleteUser
} from "../services/user.service.js";


export const usersRouter = Router();

usersRouter.delete(
	"/purge",
	async (req, res, next) => {
		try {
			const email =
				String(
					req.query.email ?? ""
				);

			if (!email) {
				return res
					.status(400)
					.json({
						error:
							"email query parameter is required."
					});
			}

			const user =
				await purgeUser(email);

			return res.json({
				message:
					"User permanently deleted.",
				user
			});
		} catch (error) {
			next?.(error);
		}
	}
);

/*
 * Ordinary delete = soft delete.
 */
usersRouter.delete(
	"/",
	async (req, res, next) => {
		try {
			const email =
				String(
					req.query.email ?? ""
				);

			if (!email) {
				return res
					.status(400)
					.json({
						error:
							"email query parameter is required."
					});
			}

			const user =
				await softDeleteUser(
					email
				);

			return res.json({
				message:
					"User soft-deleted.",
				user
			});
		} catch (error) {
			next?.(error);
		}
	}
);

usersRouter.post("/", async (req, res, next) => {
	try {
		const { name, email } = req.body;
		if (typeof name !== "string" || typeof email !== "string")
			return res.status(400).json({
				error: "name and email are required."
			});

		return res.status(201).json(
			await UserModel.create({ name, email })
		);

	} catch (error) {
		next?.(error);
	}
});

usersRouter.get("/deleted", async (_req, res, next) => {
	try {
		return res.json({
			users: await listDeletedUsers()
		});
	} catch (error) {
		next?.(error);
	}
});

usersRouter.get("/with-deleted", async (_req, res, next) => {
	try {
		return res.json({
			users: await listUsersIncludingDeleted()
		});
	} catch (error) {
		next?.(error);
	}
});

usersRouter.post(
	"/restore",
	async (
		req,
		res,
		next
	) => {
		try {
			const email =
				typeof req.query.email ===
					"string"
					? req.query.email
						.trim()
					: "";

			if (!email) {
				return res
					.status(400)
					.json({
						error:
							"email query parameter is required."
					});
			}

			const user =
				await restoreUser(
					email
				);

			return res
				.status(200)
				.json({
					status:
						"restored",

					user
				});
		} catch (error) {
			next?.(error);
		}
	}
);

// usersRouter.delete("/soft-delete/:email", async (req, res, next) => {
// 	try {
// 		await softDeleteUser(req.params.email);

// 		return res.json({
// 			status: "soft-deleted"
// 		});
// 	} catch (error) {
// 		next?.(error);
// 	}
// });

// usersRouter.delete("/purge/:email",
// 	async (req, res, next) => {
// 	try {
// 		await purgeUser(req.params.email);
// 		return res.json({ status: "purged" });
// 	} catch (error) {
// 		next?.(error);
// 	}
// 	});

usersRouter.get("/", async (_req, res, next) => {
	try {
		return res.json({
			users: await UserModel.find({})
		});
	} catch (error) {
		next?.(error);
	}
});
