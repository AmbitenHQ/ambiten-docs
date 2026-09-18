import { AmbitenClient } from "@ambiten/core";

const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.DB_NAME ?? "ambiten_tutorial";
export const client = new AmbitenClient({ uri, options: { dbName } });
