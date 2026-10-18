<template>
  <div class="bootstrap-capabilities">
    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">
        Persistence
      </span>

      <h3>
        Database connectivity, schemas, and models
      </h3>

      <p>
        Connects the configured database provider and constructs the schema
        and model from inline configuration or referenced modules. Model
        operations use the active execution context and operation options
        to select database resources.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">
        Observability
      </span>

      <h3>
        Logging and file destination preparation
      </h3>

      <p>
        Initializes logging and prepares configured file destinations,
        creating missing directories and files before file transports start.
        Log output follows the selected transports, level, and formatting
        options.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">
        Caching
      </span>

      <h3>
        Redis connectivity and cache helpers
      </h3>

      <p>
        Connects to Redis when caching is enabled and a Redis URI is
        supplied. The runtime exposes caching and tenant cache invalidation
        helpers so application operations can reuse the configured Redis
        infrastructure.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">
        Tenancy
      </span>

      <h3>
        Static registration and dynamic tenant discovery
      </h3>

      <p>
        Registers static tenants and installs the configured
        <code>TenantConfigResolver</code> when multi-tenancy is enabled.
        Lazy registration defers tenant connections until needed.
        Adapters or explicit <code>AmbitenContext</code> boundaries
        establish the tenant identity for each execution.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">
        GraphQL
      </span>

      <h3>
        Optional GraphQL service initialization
      </h3>

      <p>
        Initializes the GraphQL service and generates its schema when
        enabled. The application integrates its GraphQL server and adapter
        with the runtime and establishes the execution context used by
        resolver operations.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">
        Lifecycle
      </span>

      <h3>
        Connection hooks and runtime shutdown
      </h3>

      <p>
        Exposes connection hooks and prepares the garbage collection runner
        when enabled. Runtime shutdown disconnects Redis, closes the
        configured database provider, and invokes logger cleanup.
        The application coordinates server shutdown, tenant client cleanup,
        and any background tasks.
      </p>
    </div>
  </div>
</template>