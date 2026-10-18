<template>
  <div class="multi-tenancy-overview">
    <div class="multi-tenancy-hero-card">
      <div class="multi-tenancy-hero-copy">
        <span class="multi-tenancy-eyebrow">
          Tenant Runtime
        </span>

        <h3>
          Resolve tenant identity at the execution boundary.
          Select tenant database resources when operations need them.
        </h3>

        <p>
          Ambiten separates tenant identity from tenant infrastructure.
          <code>AmbitenContext</code> carries the tenant identity through
          the current execution, <code>MultiTenantManager</code> manages
          tenant configuration and MongoDB clients, and a configured
          tenant-aware provider selects the database for model operations.
        </p>
      </div>

      <div class="multi-tenancy-signal-strip">
        <span>Execution-scoped identity</span>
        <span>Static and dynamic tenants</span>
        <span>Lazy tenant connections</span>
        <span>Tenant-aware model routing</span>
      </div>
    </div>

    <div class="multi-tenancy-pillars">
      <div class="multi-tenancy-pillar">
        <strong>Tenant Identity</strong>

        <p>
          For requests, a <code>TenantResolver</code> identifies the
          tenant and the framework adapter establishes its
          <code>AmbitenContext</code>. Background jobs can provide a
          tenant identity explicitly through
          <code>AmbitenContext.run()</code>.
        </p>
      </div>

      <div class="multi-tenancy-pillar">
        <strong>Tenant Infrastructure</strong>

        <p>
          <code>MultiTenantManager</code> checks its local registry and
          can discover unknown tenants through a configured
          <code>TenantConfigResolver</code> function. It creates and
          reuses tenant MongoDB clients, connecting lazy tenants when
          database access is needed.
        </p>
      </div>

      <div class="multi-tenancy-pillar">
        <strong>Tenant-Aware Data Access</strong>

        <p>
          A tenant-aware <code>AmbitenClient</code> provider selects
          the tenant database for model operations.
          <code>AmbitenContext</code> keeps tenant identity and other
          execution state available across asynchronous calls,
          without requiring application code to pass tenant
          configuration through every function.
        </p>
      </div>
    </div>

    <div class="multi-tenancy-flow">
      <div class="multi-tenancy-flow-step">
        <span>Ingress</span>

        <strong>
          A request or background job enters the application
        </strong>
      </div>

      <div
        class="multi-tenancy-flow-arrow"
        aria-hidden="true"
      >
        →
      </div>

      <div class="multi-tenancy-flow-step">
        <span>Tenant Identity</span>

        <strong>
          A request resolver supplies tenantId, or a job provides it
          explicitly
        </strong>
      </div>

      <div
        class="multi-tenancy-flow-arrow"
        aria-hidden="true"
      >
        →
      </div>

      <div class="multi-tenancy-flow-step">
        <span>Context Binding</span>

        <strong>
          The adapter or AmbitenContext.run() establishes the
          execution context
        </strong>
      </div>

      <div
        class="multi-tenancy-flow-arrow"
        aria-hidden="true"
      >
        →
      </div>

      <div class="multi-tenancy-flow-step">
        <span>Infrastructure Resolution</span>

        <strong>
          When database access is needed, MultiTenantManager resolves
          tenant configuration and obtains a tenant client
        </strong>
      </div>

      <div
        class="multi-tenancy-flow-arrow"
        aria-hidden="true"
      >
        →
      </div>

      <div class="multi-tenancy-flow-step">
        <span>Tenant-Aware Execution</span>

        <strong>
          The provider selects the tenant database and the model
          operation executes
        </strong>
      </div>
    </div>
  </div>
</template>