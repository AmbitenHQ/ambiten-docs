import { AmbitenContext } from "@ambiten/core";

export function getExecutionInfo() {
	const ctx = AmbitenContext.get();
	
	return {
		requestId: ctx.requestId,
		dbName: ctx.dbName,
		collectionName: ctx.collectionName
	};
}
