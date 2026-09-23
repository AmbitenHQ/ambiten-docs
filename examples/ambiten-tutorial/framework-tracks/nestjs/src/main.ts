import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const host = process.env.HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? 3000);

  if (!host.trim() || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Set HOST to a non-empty address and PORT to an integer from 1 to 65535.");
  }

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  try {
    await app.listen(port, host);
    console.log(`NestJS framework track listening at ${await app.getUrl()}`);
  } catch (error) {
    await app.close();
    throw error;
  }
}

bootstrap().catch((error: unknown) => {
  console.error("Unable to start the NestJS framework track:", error);
  process.exitCode = 1;
});
