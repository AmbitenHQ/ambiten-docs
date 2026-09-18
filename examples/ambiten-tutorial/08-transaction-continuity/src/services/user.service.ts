import { AmbitenContext } from "@ambiten/core";
import { UserModel } from "../models/user.model.js";
import { getExecutionInfo } from "../utils/execution.js";


export async function listUsers() {
	const beforeAwait = AmbitenContext.get();
	await Promise.resolve();
	const afterAwait = AmbitenContext.get();
	
	const users = await UserModel.find({});
	
	return {
		execution: {
			beforeAwait: {
				tenantId: beforeAwait.tenantId,
				requestId: beforeAwait.requestId
			},
			afterAwait: {
				tenantId: afterAwait.tenantId,
				requestId: afterAwait.requestId
			},
			
			helper: getExecutionInfo()
		},
		
		users
	};
}
