import express, {
	type Express,
	type NextFunction,
	type Request,
	type Response
} from "express";
import { MultiTenantManager } from "@ambiten/core";
import { createExpressAdapter } from "@ambiten/adapter-express";
import { client } from "./core/db.js";
import { closeTutorialTenants, registerTutorialTenants } from "./core/tenancy.js";
import { tenantRouter } from "./routes/tenant.routes.js";
import { usersRouter } from "./routes/users.routes.js";


const port = Number(process.env.PORT ?? 3000);

async function main() {
	registerTutorialTenants();
	await client.connect();
	
	const app: Express = express();
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	
	app.get("/health", (_req, res) => res.json({ status: "ok" }));
	
	await createExpressAdapter().install(app, {
		tenancy: {
			header: "x-tenant-id",
			validate: async tenantId =>
				MultiTenantManager.hasTenant(tenantId)
		}
	});
	
	app.use("/tenant", tenantRouter);
	app.use("/users", usersRouter);
	
	app.use((
		error: unknown,
		_req: Request,
		res: Response,
		_next: NextFunction
	) => {
		console.error(error);
		res.status(500).json({
			error: error instanceof Error
				? error.message
				: "Unknown error"
		});
	});
	
	const server = app.listen(port, () =>
		console.log(`Ambiten API running on http://localhost:${port}`)
	);
	
	const shutdown = () => server.close(
		async () => {
			await closeTutorialTenants();
			await client.close(); process.exit(0);
		});
	
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}

main().catch(async error => {
	console.error("Application failed:", error);
	await closeTutorialTenants();
	await client.close(); process.exitCode = 1;
});
