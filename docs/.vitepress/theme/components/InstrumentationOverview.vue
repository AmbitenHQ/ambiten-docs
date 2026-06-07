<template>
  <div class="instrumentation-overview">
    <div class="instrumentation-hero-card">
      <div class="instrumentation-hero-copy">
        <span class="instrumentation-eyebrow">Runtime Observability</span>
        <h3>Full-lifecycle telemetry across execution boundaries</h3>
        <p>
          Ambiten instruments the complete execution lifecycle, from adapter ingress
          and middleware execution to provider resolution, transaction scope,
          persistence, and telemetry emission.
        </p>
      </div>

      <div class="instrumentation-signal-strip">
        <span>Operation</span>
        <span>Tenant</span>
        <span>Request ID</span>
        <span>DB / Shard</span>
        <span>Collection</span>
        <span>Duration</span>
        <span>Budget Used</span>
        <span>Outcome</span>
      </div>
    </div>

    <div class="instrumentation-pillars">
      <div class="instrumentation-pillar">
        <span class="instrumentation-eyebrow">Context Correlation</span>
        <strong>Telemetry enriched by runtime identity</strong>
        <p>
          Signals automatically inherit tenant identity, request metadata,
          database scope, and transaction state from the active execution boundary.
        </p>
      </div>

      <div class="instrumentation-pillar">
        <span class="instrumentation-eyebrow">Wall-Clock Measurement</span>
        <strong>Measure the total execution cost</strong>
        <p>
          Instrumentation captures middleware overhead, cache negotiation,
          provider resolution, persistence, and post-processing rather than
          only the database query itself.
        </p>
      </div>

      <div class="instrumentation-pillar">
        <span class="instrumentation-eyebrow">Runtime Guardrails</span>
        <strong>Expose execution pressure early</strong>
        <p>
          Query counts, execution budgets, and request-level telemetry help
          surface N+1 behavior, tenant hotspots, and runaway execution chains
          before they become operational failures.
        </p>
      </div>
    </div>

    <div class="instrumentation-flow">
      <div class="instrumentation-flow-step">
        <span>Ingress</span>
        <strong>Adapter Boundary</strong>
      </div>
      <div class="instrumentation-flow-arrow" aria-hidden="true">→</div>

      <div class="instrumentation-flow-step">
        <span>Execution Scope</span>
        <strong>AmbitenContext</strong>
      </div>
      <div class="instrumentation-flow-arrow" aria-hidden="true">→</div>

      <div class="instrumentation-flow-step">
        <span>Measured Runtime</span>
        <strong>measureQuery()</strong>
      </div>
      <div class="instrumentation-flow-arrow" aria-hidden="true">→</div>

      <div class="instrumentation-flow-step">
        <span>Persistence</span>
        <strong>MongoDB</strong>
      </div>
      <div class="instrumentation-flow-arrow" aria-hidden="true">→</div>

      <div class="instrumentation-flow-step">
        <span>Export</span>
        <strong>Logs · Metrics · Traces</strong>
      </div>
    </div>
  </div>
</template>