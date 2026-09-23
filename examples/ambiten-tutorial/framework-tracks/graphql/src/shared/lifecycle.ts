import { closeRuntime } from "./runtime.js";

export function readPort(value: string | undefined, fallback: number): number {
  const port = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("Port must be an integer from 0 to 65535.");
  }
  return port;
}

export async function launch(
  start: () => Promise<{ url: string; stop: () => Promise<void> }>,
  name: string
): Promise<void> {
  try {
    const server = await start();
    console.log(`${name} ready at ${server.url}`);
    let stopping = false;
    const shutdown = async () => {
      if (stopping) return;
      stopping = true;
      try { await server.stop(); }
      catch (error) { console.error("Server shutdown failed:", error); process.exitCode = 1; }
      finally {
        try { await closeRuntime(); }
        catch (error) { console.error("Runtime cleanup failed:", error); process.exitCode = 1; }
      }
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    console.error(`${name} startup failed:`, error);
    process.exitCode = 1;
    try { await closeRuntime(); }
    catch (cleanupError) { console.error("Runtime cleanup failed:", cleanupError); }
  }
}
