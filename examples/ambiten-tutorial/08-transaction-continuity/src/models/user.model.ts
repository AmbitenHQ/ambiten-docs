import { AmbitenModel, AmbitenSchema } from "@ambiten/core";
import { client } from "../core/db.js";

export interface User {
	name: string;
	email: string;
	createdAt: Date;
}

export const userSchema = new AmbitenSchema<User>({
	name: String,
	email: String,
	createdAt: Date
});

export const UserModel = new AmbitenModel<User>({
	collectionName: "users",
	schema: userSchema,
	provider: client
});
