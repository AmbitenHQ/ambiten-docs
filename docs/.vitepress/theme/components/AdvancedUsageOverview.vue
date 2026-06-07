<template>
  <div class="advanced-usage-overview">
    <div class="advanced-usage-hero-card">
      <div class="advanced-usage-hero-copy">
        <span class="advanced-usage-eyebrow">Production Patterns</span>
        <h3>Operational guidance for moving from working code to durable runtime systems</h3>
        <p>
          Advanced Ambiten usage is not about hidden APIs. It is about composing the runtime
          deliberately under real workload pressure: tenant strategy, transaction scope,
          worker execution, observability, and infrastructure discipline.
        </p>
      </div>

      <div class="advanced-usage-signal-strip">
        <span>Transaction Scope</span>
        <span>Tenant Strategy</span>
        <span>Worker Context</span>
        <span>Observability</span>
        <span>Performance</span>
        <span>Production Readiness</span>
      </div>
    </div>

    <div class="advanced-usage-pillars">
      <div class="advanced-usage-pillar">
        <span class="advanced-usage-eyebrow">Architecture</span>
        <strong>Define runtime boundaries deliberately</strong>
        <p>
          Tenant isolation, transaction scope, and context propagation determine whether
          execution remains predictable as the system scales.
        </p>
      </div>

      <div class="advanced-usage-pillar">
        <span class="advanced-usage-eyebrow">Operations</span>
        <strong>Background work must establish its own execution scope</strong>
        <p>
          Jobs, queues, and scheduled tasks should create tenant and request context
          explicitly instead of assuming request-bound state still exists.
        </p>
      </div>

      <div class="advanced-usage-pillar">
        <span class="advanced-usage-eyebrow">Readiness</span>
        <strong>Operational visibility matters as much as correctness</strong>
        <p>
          A production-grade Ambiten system must be measurable, traceable, and tunable
          under load—not merely functionally correct.
        </p>
      </div>
    </div>
  </div>
</template>