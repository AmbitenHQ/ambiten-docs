import { AmbitenModel, AmbitenSchema, type SchemaDefinition } from "@ambiten/core";
import { client } from "./runtime";

export interface User {
  name: string;
  email: string;
  createdAt: Date;
}

// Keep the tested runtime field options; isolate Core 1.2.4's schema declaration mismatch.
export const userSchema = new AmbitenSchema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, required: true }
} as unknown as SchemaDefinition<User>);

export const UserModel = new AmbitenModel<User>({
  collectionName: "users",
  schema: userSchema,
  provider: client
});
