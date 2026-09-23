import { createServer } from "node:http";
import { createSchema, createYoga } from "graphql-yoga";
import { createYogaAdapter } from "@ambiten/adapter-graphql";
import { MultiTenantManager } from "@ambiten/core";
import { typeDefs } from "./shared/type-defs.js";
import { resolvers } from "./shared/resolvers.js";
import { initializeRuntime } from "./shared/runtime.js";

await initializeRuntime();

const ambiten =
  createYogaAdapter({
    tenancy: {
      header: "x-tenant-id",
      validate:
        async (
          tenantId: string
        ) => {
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
    }
  });

const yoga =
  createYoga({
    schema:
      createSchema({
        typeDefs,
        resolvers
      }),

    plugins: [
      ambiten
    ]
  });

const server = createServer(yoga);

server.listen(4001, () => {
  console.log("Yoga ready at http://localhost:4001/graphql");
}
);