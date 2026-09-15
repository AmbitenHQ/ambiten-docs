<template>
  <div class="multi-tenancy-overview">
    <div class="multi-tenancy-hero-card">
      <div class="multi-tenancy-hero-copy">
        <span class="multi-tenancy-eyebrow">
          Tenant Runtime
        </span>

        <h3>
          Resolve tenant identity at the execution boundary.
          Resolve tenant infrastructure when operations need it.
        </h3>

        <p>
          Ambiten separates tenant identity from tenant infrastructure.
          A resolver determines which tenant belongs to the current
          execution, <code>AmbitenContext</code> carries that identity,
          and <code>MultiTenantManager</code> resolves the configuration,
          client, database, and runtime resources required downstream.
        </p>
      </div>

      <div class="multi-tenancy-signal-strip">
        <span>Execution-scoped</span>
        <span>Context-bound identity</span>
        <span>Manager-resolved resources</span>
        <span>Dynamic-tenant ready</span>
      </div>
    </div>

    <div class="multi-tenancy-pillars">
      <div class="multi-tenancy-pillar">
        <strong>Tenant Identity</strong>

        <p>
          A <code>TenantResolver</code> determines who the execution
          belongs to and binds the resolved <code>tenantId</code> into
          <code>AmbitenContext</code>.
        </p>
      </div>

      <div class="multi-tenancy-pillar">
        <strong>Tenant Infrastructure</strong>

        <p>
          <code>MultiTenantManager</code> owns tenant configuration,
          dynamic discovery, lazy client activation, and resolution of
          the database resources required by the active tenant.
        </p>
      </div>

      <div class="multi-tenancy-pillar">
        <strong>Execution Continuity</strong>

        <p>
          Models, middleware, transactions, logging, and instrumentation
          consume the active tenant-aware execution state without requiring
          tenant infrastructure to be propagated manually through
          application code.
        </p>
      </div>
    </div>

    <div class="multi-tenancy-flow">
      <div class="multi-tenancy-flow-step">
        <span>Ingress</span>

        <strong>
          Request, operation, or job enters execution
        </strong>
      </div>

      <div
        class="multi-tenancy-flow-arrow"
        aria-hidden="true"
      >
        →
      </div>

      <div class="multi-tenancy-flow-step">
        <span>Tenant Resolution</span>

        <strong>
          TenantResolver identifies the tenantId
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
          tenantId becomes part of AmbitenContext
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
          MultiTenantManager resolves tenant configuration and resources
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
          Models operate against the resolved tenant infrastructure
        </strong>
      </div>
    </div>
  </div>
</template>