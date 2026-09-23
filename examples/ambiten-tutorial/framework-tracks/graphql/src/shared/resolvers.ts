import { AmbitenContext } from "@ambiten/core";
import { UserModel } from "./user.model.js";

export const resolvers = {
  Query: {
    users: async () => {
      return UserModel.find({});
    },

    runtime: () => {
      const ctx =
        AmbitenContext.get();

      return {
        tenantId:
          ctx.tenantId,

        requestId:
          ctx.requestId
      };
    }
  },

  Mutation: {
    createUser: async (
      _parent: unknown,
      args: {
        input: {
          name: string;
          email: string;
        };
      }
    ) => {
      return UserModel.create(
        args.input
      );
    }
  }
};