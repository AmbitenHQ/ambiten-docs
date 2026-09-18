function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolvePort(): number {
  const raw = process.env.PORT ?? "3000";
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${raw}. Expected an integer from 1 to 65535.`);
  }
  return port;
}

export const env = Object.freeze({
  mongoUri: requireEnv("MONGO_URI"),
  dbName: requireEnv("DB_NAME"),
  port: resolvePort()
});
