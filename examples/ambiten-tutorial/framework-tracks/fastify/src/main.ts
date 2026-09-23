import "dotenv/config";
import { buildApp } from "./app";

export function readPort(value = process.env.PORT): number {
  const port = value === undefined ? 3000 : Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT must be an integer from 0 to 65535.");
  }
  return port;
}

async function main() {
  const app = buildApp(true);
  try {
    const address = await app.listen({ port: readPort(), host: "127.0.0.1" });
    console.log(`Fastify ready at ${address}`);
    let stopping = false;
    const shutdown = async () => {
      if (stopping) return;
      stopping = true;
      try { await app.close(); }
      catch (error) { console.error("Shutdown failed:", error); process.exitCode = 1; }
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    try { await app.close(); }
    finally { throw error; }
  }
}

if (require.main === module) {
  void main().catch(error => {
    console.error("Fastify startup failed:", error);
    process.exitCode = 1;
  });
}
