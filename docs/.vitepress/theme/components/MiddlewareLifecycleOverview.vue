<template>
  <div class="middleware-overview">
    <div class="middleware-hero-card">
      <div class="middleware-hero-copy">
        <span class="middleware-eyebrow">Runtime Middleware Layer</span>
        <h3>Policy-driven execution around every model operation</h3>
        <p>
          Middleware is Tenra’s execution governance layer. It allows validation,
          auditing, access shaping, normalization, and observability behavior to run
          consistently around persistence operations without leaking those concerns
          into application logic.
        </p>
      </div>

      <div class="middleware-signal-strip">
        <span>Pre Execution</span>
        <span>Context Aware</span>
        <span>Policy Enforcement</span>
        <span>Post Execution</span>
      </div>
    </div>

    <div class="middleware-pillars">
      <div class="middleware-pillar">
        <span class="middleware-eyebrow">Interception</span>
        <strong>Control execution before persistence</strong>
        <p>
          Pre hooks can validate input, reshape queries, attach tenant-aware filters,
          or stop invalid operations before they reach the database.
        </p>
      </div>

      <div class="middleware-pillar">
        <span class="middleware-eyebrow">Runtime Awareness</span>
        <strong>Execute inside TenraContext</strong>
        <p>
          Middleware resolves tenant identity, request metadata, active sessions, and
          operation state from the same runtime boundary as the model operation.
        </p>
      </div>

      <div class="middleware-pillar">
        <span class="middleware-eyebrow">Composition</span>
        <strong>Centralize reusable execution policies</strong>
        <p>
          Soft delete, auditing, logging, normalization, and access control can be
          defined once and applied consistently across model operations.
        </p>
      </div>
    </div>

    <div class="middleware-flow">
      <div class="middleware-flow-step">
        <span>Ingress</span>
        <strong>Model operation enters pipeline</strong>
      </div>
      <div class="middleware-flow-arrow" aria-hidden="true">→</div>
      <div class="middleware-flow-step">
        <span>Pre Layer</span>
        <strong>Pre hooks govern execution</strong>
      </div>
      <div class="middleware-flow-arrow" aria-hidden="true">→</div>
      <div class="middleware-flow-step">
        <span>Persistence</span>
        <strong>Database operation executes</strong>
      </div>
      <div class="middleware-flow-arrow" aria-hidden="true">→</div>
      <div class="middleware-flow-step">
        <span>Post Layer</span>
        <strong>Post hooks observe outcome</strong>
      </div>
      <div class="middleware-flow-arrow" aria-hidden="true">→</div>
      <div class="middleware-flow-step">
        <span>Egress</span>
        <strong>Result or error exits pipeline</strong>
      </div>
    </div>
  </div>
</template>