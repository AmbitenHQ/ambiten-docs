<template>
  <div class="ambiten-model-principles">
    <div class="ambiten-model-principles-card">

      <span class="ambiten-model-principles-eyebrow">
        Runtime Design Principles
      </span>

      <div class="ambiten-model-principles-grid">

        <div class="ambiten-model-principle">
          <strong>
            Runtime-aware execution
          </strong>

          <p>
            Model operations consume the active execution context and resolve
            effective tenant identity, request metadata, transaction state, and
            supported runtime overrides without requiring those values to be
            manually propagated through application code.
          </p>
        </div>

        <div class="ambiten-model-principle">
          <strong>
            Separation of execution and infrastructure
          </strong>

          <p>
            Models coordinate operation behavior while providers and
            <code>MultiTenantManager</code> resolve the client, database,
            collection, session, and tenant infrastructure required for the
            active execution.
          </p>
        </div>

        <div class="ambiten-model-principle">
          <strong>
            Deterministic resolution
          </strong>

          <p>
            Given the same effective context, model configuration, middleware
            registration, and runtime rules, an operation follows the same
            resolution path and execution lifecycle.
          </p>
        </div>

        <div class="ambiten-model-principle">
          <strong>
            Static structure, dynamic execution
          </strong>

          <p>
            Model definitions remain stable while execution context and
            resolved infrastructure can vary per request, tenant, transaction
            scope, worker, or other runtime boundary.
          </p>
        </div>

      </div>
    </div>
  </div>
</template>