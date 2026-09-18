import { Router } from "express";
import { AmbitenContext } from "@ambiten/core";
import { listUsers } from "../services/user.service.js";
import { UserModel } from "../models/user.model.js";

export const usersRouter = Router();

usersRouter.get("/", async (_req, res, next) => {
	try {
		const ctx = AmbitenContext.get();
		const result = await listUsers();

		return res.json({
			routeContext: {
				requestId: ctx.requestId,
				dbName: ctx.dbName,
				collectionName: ctx.collectionName
			},
			...result
		});
	} catch (error) {
		next?.(error);
	}
});

usersRouter.post("/", async (req, res, next) => {
	try {
		const { name, email } = req.body;

		if (typeof name !== "string" || typeof email !== "string")
			return res.status(400).json({
				error: "name and email are required."
			});

		return res.status(201).json(
			await UserModel.create({
				name, email, createdAt: new Date()
			})
		);

	} catch (error) {
		next?.(error);
	}
});
