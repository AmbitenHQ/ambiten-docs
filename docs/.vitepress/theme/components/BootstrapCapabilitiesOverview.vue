<template>
  <div class="bootstrap-capabilities">
    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">
        Persistence
      </span>

      <h3>
        MongoDB infrastructure and model registration
      </h3>

      <p>
        Prepares MongoDB connectivity, providers, schemas, and model
        infrastructure for the application process. Model registration remains
        structural at startup, while database, collection, tenant, and session
        resolution occur when operations execute.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">
        Observability
      </span>

      <h3>
        Logging and runtime instrumentation
      </h3>

      <p>
        Initializes the configured logging and instrumentation infrastructure
        so later execution boundaries can enrich runtime operations with
        request, tenant, model, and operation metadata consistently.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">
        Caching
      </span>

      <h3>
        Redis and cache infrastructure
      </h3>

      <p>
        Prepares Redis-backed and runtime cache capabilities at process startup
        so requests, workers, models, and other execution flows can reuse
        managed cache infrastructure without creating it per operation.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">
        Tenancy
      </span>

      <h3>
        MultiTenantManager and tenant infrastructure
      </h3>

      <p>
        Configures tenant runtime infrastructure, including registered tenants,
        lazy client activation, and dynamic tenant discovery where configured.
        Request-bound tenant identity remains the responsibility of adapters,
        resolvers, or explicit execution context.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">
        GraphQL
      </span>

      <h3>
        Optional GraphQL runtime capability
      </h3>

      <p>
        Assembles GraphQL-related runtime capabilities when configured while
        leaving operation-scoped execution to the GraphQL adapter and its
        context factory. Bootstrap prepares infrastructure; the adapter
        establishes resolver execution scope.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">
        Lifecycle
      </span>

      <h3>
        Runtime services and controlled shutdown
      </h3>

      <p>
        Starts and manages process-level lifecycle features such as garbage
        collection, TTL-oriented cleanup, connection hooks, and runtime-owned
        resources, then provides a coordinated shutdown boundary when the
        application terminates.
      </p>
    </div>
  </div>
</template>