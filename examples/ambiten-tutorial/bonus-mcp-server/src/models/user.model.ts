import { AmbitenModel, AmbitenSchema, type SchemaDefinition } from "@ambiten/core";
import { client } from "../core/db.js";

export interface User {
	name: string;
	email: string;
	createdAt?: Date;
	isDeleted?: boolean;
	deletedAt?: Date | null;
}

// Core 1.2.4's declaration incorrectly requires every document key on each
// field's options. Keep its runtime { type, required } shape at this boundary.
export const userSchema = new AmbitenSchema<User>({
	name: { type: String, required: true },
	email: { type: String, required: true },
	createdAt: { type: Date },
	isDeleted: { type: Boolean },
	deletedAt: { type: Date }
} as unknown as SchemaDefinition<User>);

export const UserModel = new AmbitenModel<User>({
	collectionName: "users",
	schema: userSchema,
	provider: client
});
