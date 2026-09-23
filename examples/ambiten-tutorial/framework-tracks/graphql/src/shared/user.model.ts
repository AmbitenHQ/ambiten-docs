import { AmbitenModel, AmbitenSchema } from "@ambiten/core";
import { client } from "./runtime.js";

export interface User {
  name: string;
  email: string;
  createdAt: Date;
}

// Isolate Core 1.2.4's schema declaration mismatch; retain runtime field options.
const schema = new AmbitenSchema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, required: true }
});

export const UserModel = new AmbitenModel<User>({
  collectionName: "users",
  schema,
  provider: client
});
