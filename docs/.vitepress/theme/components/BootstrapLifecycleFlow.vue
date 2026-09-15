<template>
  <div
    class="bootstrap-lifecycle-flow"
    aria-label="Ambiten bootstrap lifecycle flow"
  >
    <div
      class="bootstrap-lifecycle-step bootstrap-lifecycle-step-factory"
    >
      <span class="bootstrap-lifecycle-eyebrow">
        Entry
      </span>

      <strong>
        AmbitenBootstrapFactory.create()
      </strong>
    </div>

    <span
      class="bootstrap-lifecycle-arrow"
      aria-hidden="true"
    >
      →
    </span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">
        Configuration
      </span>

      <strong>
        Resolve runtime configuration
      </strong>
    </div>

    <span
      class="bootstrap-lifecycle-arrow"
      aria-hidden="true"
    >
      →
    </span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">
        Observability
      </span>

      <strong>
        Initialize logging and instrumentation
      </strong>
    </div>

    <span
      class="bootstrap-lifecycle-arrow"
      aria-hidden="true"
    >
      →
    </span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">
        Persistence
      </span>

      <strong>
        Prepare MongoDB and provider infrastructure
      </strong>
    </div>

    <span
      class="bootstrap-lifecycle-arrow"
      aria-hidden="true"
    >
      →
    </span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">
        Caching
      </span>

      <strong>
        Prepare Redis and cache infrastructure
      </strong>
    </div>

    <span
      class="bootstrap-lifecycle-arrow"
      aria-hidden="true"
    >
      →
    </span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">
        Models
      </span>

      <strong>
        Register schemas and model definitions
      </strong>
    </div>

    <span
      class="bootstrap-lifecycle-arrow"
      aria-hidden="true"
    >
      →
    </span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">
        Tenancy
      </span>

      <strong>
        Configure MultiTenantManager
      </strong>
    </div>

    <span
      class="bootstrap-lifecycle-arrow"
      aria-hidden="true"
    >
      →
    </span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">
        Capabilities
      </span>

      <strong>
        Initialize optional runtime services
      </strong>
    </div>

    <span
      class="bootstrap-lifecycle-arrow"
      aria-hidden="true"
    >
      →
    </span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">
        Lifecycle
      </span>

      <strong>
        Start managed lifecycle services
      </strong>
    </div>

    <span
      class="bootstrap-lifecycle-arrow"
      aria-hidden="true"
    >
      →
    </span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">
        Runtime
      </span>

      <strong>
        Assemble AmbitenRuntime
      </strong>
    </div>

    <span
      class="bootstrap-lifecycle-arrow"
      aria-hidden="true"
    >
      →
    </span>

    <div
      class="bootstrap-lifecycle-step bootstrap-lifecycle-step-ready"
    >
      <span class="bootstrap-lifecycle-eyebrow">
        Ready
      </span>

      <strong>
        Runtime ready for execution
      </strong>
    </div>
  </div>
</template>