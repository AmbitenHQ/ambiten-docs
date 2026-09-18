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
				requestId: beforeAwait.requestId
			},
			afterAwait: {
				requestId: afterAwait.requestId
			},
			helper: getExecutionInfo()
		},
		
		users
	};
};
