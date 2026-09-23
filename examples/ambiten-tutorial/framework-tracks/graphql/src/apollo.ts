import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { createApolloAdapter } from "@ambiten/adapter-graphql";
import { MultiTenantManager } from "@ambiten/core";
import { typeDefs } from "./shared/type-defs.js";
import { resolvers } from "./shared/resolvers.js";
import { initializeRuntime } from "./shared/runtime.js";
import { randomUUID } from "node:crypto";


await initializeRuntime();

const server =
  new ApolloServer({
    typeDefs,
    resolvers
  });

const adapter = createApolloAdapter();

adapter.install(
  server,
  {
    tenancy: {
      header: "x-tenant-id",

      validate:
        async (tenantId: string) => {
          const tenant =
            await MultiTenantManager
              .resolveTenant(
                tenantId
              );

          if (!tenant) {
            throw new Error(
              `Tenant with ID "${tenantId}" not found.`
            );
          }

          return true;
        }
    },

    resolvers: {
      requestId:
        (request: any) =>
          request.get?.("x-request-id")?.trim() || randomUUID()
    }
  }
);

const { url } =
  await startStandaloneServer(
    server,
    {
      listen: {
        port: 4000
      }
    }
  );

console.log(`Apollo ready at ${url}`);