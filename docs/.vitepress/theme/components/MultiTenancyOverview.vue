<template>
  <div class="multi-tenancy-overview">
    <div class="multi-tenancy-hero-card">
      <div class="multi-tenancy-hero-copy">
        <span class="multi-tenancy-eyebrow">Tenant Runtime</span>
        <h3>Resolve tenant scope once. Enforce it across the entire execution chain.</h3>
        <p>
          Tenra treats tenant identity as a runtime boundary. Once resolved, execution remains scoped to that tenant across models, middleware, transactions, and observability without requiring additional infrastructure coordination.
        </p>
      </div>

      <div class="multi-tenancy-signal-strip">
        <span>Request-scoped</span>
        <span>Context-bound</span>
        <span>Provider-resolved</span>
        <span>Isolation enforced</span>
      </div>
    </div>

    <div class="multi-tenancy-pillars">
      <div class="multi-tenancy-pillar">
        <strong>Boundary Resolution</strong>
        <p>
          Tenant identity is extracted at the system boundary and bound into
          <code>TenraContext</code>, establishing the execution scope.
        </p>
      </div>

      <div class="multi-tenancy-pillar">
        <strong>Infrastructure Isolation</strong>
        <p>
          The provider resolves the correct database or partition strategy,
          ensuring strict tenant separation at the infrastructure level.
        </p>
      </div>

      <div class="multi-tenancy-pillar">
        <strong>Execution Continuity</strong>
        <p>
          Transactions, middleware, logging, and model execution all inherit
          the same tenant boundary without manual propagation.
        </p>
      </div>
    </div>

    <div class="multi-tenancy-flow">
      <div class="multi-tenancy-flow-step">
        <span>Ingress</span>
        <strong>Tenant-aware execution begins</strong>
      </div>

      <div class="multi-tenancy-flow-arrow">→</div>

      <div class="multi-tenancy-flow-step">
        <span>Context Binding</span>
        <strong>Execution scope bound to TenraContext</strong>
      </div>

      <div class="multi-tenancy-flow-arrow">→</div>

      <div class="multi-tenancy-flow-step">
        <span>Provider Resolution</span>
        <strong>Infrastructure resolved from active tenant boundary</strong>
      </div>

      <div class="multi-tenancy-flow-arrow">→</div>

      <div class="multi-tenancy-flow-step">
        <span>Execution</span>
        <strong>Execution remains isolated throughout runtime</strong>
      </div>
    </div>
  </div>
</template>
