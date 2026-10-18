<template>
  <div class="advanced-usage-overview">
    <div class="advanced-usage-hero-card">
      <div class="advanced-usage-hero-copy">
        <span class="advanced-usage-eyebrow">
          Production Patterns
        </span>

        <h3>
          Coordinate requests, jobs, and infrastructure with clear
          execution boundaries
        </h3>

        <p>
          Advanced Ambiten applications coordinate tenant routing,
          transaction sessions, worker context, and observability.
          Separate shared infrastructure from execution state, and
          define how resources are initialized, reused, and closed.
        </p>
      </div>

      <div class="advanced-usage-signal-strip">
        <span>Transaction Boundaries</span>
        <span>Tenant Isolation</span>
        <span>Worker Context</span>
        <span>Observability</span>
        <span>Connection Reuse</span>
        <span>Resource Lifecycle</span>
      </div>
    </div>

    <div class="advanced-usage-pillars">
      <div class="advanced-usage-pillar">
        <span class="advanced-usage-eyebrow">
          Architecture
        </span>

        <strong>
          Define tenant scope and transaction ownership
        </strong>

        <p>
          Resolve tenant identity and authorize access before database
          work. Keep transaction sessions with their owning client,
          and account for the state inherited by nested execution
          contexts.
        </p>
      </div>

      <div class="advanced-usage-pillar">
        <span class="advanced-usage-eyebrow">
          Operations
        </span>

        <strong>
          Establish context for each independent job
        </strong>

        <p>
          Carry validated tenant and correlation identifiers through
          queues, then establish <code>AmbitenContext</code> in the
          consumer. Each job controls the lifetime of its work and
          any transaction it starts.
        </p>
      </div>

      <div class="advanced-usage-pillar">
        <span class="advanced-usage-eyebrow">
          Readiness
        </span>

        <strong>
          Measure execution and coordinate shutdown
        </strong>

        <p>
          Correlate logs and query telemetry with execution identity.
          Track tenant connection usage, drain active work, and
          coordinate server, worker, tenant client, and runtime cleanup.
        </p>
      </div>
    </div>
  </div>
</template>