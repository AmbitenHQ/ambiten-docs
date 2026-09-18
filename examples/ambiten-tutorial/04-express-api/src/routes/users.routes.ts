import { Router } from "express";
import { UserModel } from "../models/user.model.js";


export const usersRouter = Router();

usersRouter.post("/", async (req, res, next) => {
	try {
		const { name, email } = req.body;

		if (typeof name !== "string" || typeof email !== "string")
			return res.status(400).json({ error: "name and email are required." });

		return res.status(201).json(
			await UserModel.create({
				name,
				email,
				createdAt: new Date()
			}));
	} catch (error) {
		next?.(error);
	}
});

usersRouter.get("/", async (_req, res, next) => {
	try {
		return res.json(await UserModel.find({}));
	} catch (error) {
		next?.(error);
	}
});

usersRouter.get("/:email", async (req, res, next) => {
	try {
		const user = await UserModel.findOne({
			email: req.params.email
		});

		console.log(user)
		return user
			? res.json(user)
			: res.status(404).json({ error: "User not found." });
		
	} catch (error) {
		next?.(error);
	}
});

usersRouter.patch("/:email", async (req, res, next) => {
	try {
		const { name } = req.body; if (typeof name !== "string")
			return res.status(400)
				.json({
					error: "name is required."
				});
		
		await UserModel.updateOne({
			email: req.params.email
		}, {
			$set: {
				name
			}
		});
		
		const user = await UserModel.findOne({
			email: req.params.email
		});
		
		return user
			? res.json(user)
			: res.status(404).json({ error: "User not found." });
		
	} catch (error) {
		next?.(error);
	}
});

usersRouter.delete("/:email", async (req, res, next) => {
	try {
		const user =
			await UserModel.findOne({
			 email: req.params.email
			});
		
		if (!user) return

		res.status(404).json({
			error: "User not found."
		});

		await UserModel.deleteOne({
			email: req.params.email
		});
		
		return res.status(204).end();

	} catch (error) {
		next?.(error);
	}
});
