import { makeExecutableSchema } from "@graphql-tools/schema";
import { defaultFieldResolver, isObjectType } from "graphql";
import { typeDefs } from "./type-defs.js";
import { resolvers } from "./resolvers.js";


export type ApplicationContext = {
  applicationName: string;
  runInAmbiten: <T>(work: () => T) => T;
};


export const schema = makeExecutableSchema({ typeDefs, resolvers });

// Local compatibility bridge for @ambiten/adapter-graphql 1.0.2.
// A returned context object alone does not extend AsyncLocalStorage's scope.
for (const type of Object.values(schema.getTypeMap())) {
  if (!isObjectType(type) || type.name.startsWith("__")) continue;
  for (const field of Object.values(type.getFields())) {
    const resolve = field.resolve ?? defaultFieldResolver;
    field.resolve = (parent, args, context: ApplicationContext, info) => {
      if (typeof context.runInAmbiten !== "function") {
        throw new Error("Missing Ambiten resolver execution boundary.");
      }
      return context.runInAmbiten(() => resolve(parent, args, context, info));
    };
  }
}
