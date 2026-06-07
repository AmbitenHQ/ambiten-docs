<template>
  <div class="bootstrap-capabilities">
    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">Persistence</span>
      <h3>Database providers and runtime infrastructure</h3>
      <p>
        Initializes MongoDB connectivity, provider resolution, and runtime-aware
        database access so models and transactions execute against a stable
        persistence boundary.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">Observability</span>
      <h3>Logging and instrumentation services</h3>
      <p>
        Attaches the configured logging and instrumentation layers so runtime
        operations share a consistent operational surface across execution flows.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">Caching</span>
      <h3>Redis and cache-aware runtime features</h3>
      <p>
        Prepares Redis integrations and cache infrastructure before requests,
        workers, or GraphQL operations begin executing.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">Tenancy</span>
      <h3>Tenant registration and infrastructure preparation</h3>
      <p>
        Registers tenant-aware infrastructure during startup while leaving
        request-bound tenant resolution to adapters and execution context.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">GraphQL</span>
      <h3>Schema and resolver capability assembly</h3>
      <p>
        Prepares GraphQL integration layers before execution begins so resolver
        flows participate cleanly in the Ambiten runtime model.
      </p>
    </div>

    <div class="bootstrap-capability-card">
      <span class="bootstrap-capability-eyebrow">Lifecycle</span>
      <h3>Garbage collection and TTL orchestration</h3>
      <p>
        Configures cleanup infrastructure and lifecycle runners so expiration
        and retention behavior become part of the managed runtime.
      </p>
    </div>
  </div>
</template>