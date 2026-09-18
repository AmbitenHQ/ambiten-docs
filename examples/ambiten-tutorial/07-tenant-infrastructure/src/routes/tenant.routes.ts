import { Router } from "express";
import { AmbitenContext, MultiTenantManager } from "@ambiten/core";
import { client } from "../core/db.js";

export const tenantRouter = Router();

tenantRouter.get("/infrastructure", async (_req, res, next) => {
	try {
		const tenantId = AmbitenContext.get().tenantId;
		if (!tenantId)
			return res.status(400).json({
				error: "Tenant context is required."
			});
		
		const configuredTenant = MultiTenantManager.getTenant(tenantId);
		if (!configuredTenant)
			return res.status(404).json({
				error: "Tenant is not registered."
			});
		
		const db = await client.db({ tenantId });
		const resolvedTenant = MultiTenantManager.getTenant(tenantId);
		
		return res.json({
			tenantId,
			configuredDbName: configuredTenant.dbName,
			resolvedDbName: db.databaseName,
			connected: Boolean(resolvedTenant?.client)
		});
	} catch (error) {
		next?.(error);
	}
});
