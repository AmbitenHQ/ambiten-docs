import { AmbitenClient } from "@ambiten/core";

export const client = new AmbitenClient({
	uri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017",
	options: {
		dbName: process.env.DB_NAME ?? "ambiten_tutorial"
	}
});
