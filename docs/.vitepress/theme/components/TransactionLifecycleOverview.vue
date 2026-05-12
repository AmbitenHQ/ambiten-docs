<template>
  <div class="transaction-overview">
    <div class="transaction-hero-card">
      <div class="transaction-hero-copy">
        <span class="transaction-eyebrow">Transaction Model</span>
        <h3>Atomic execution coordinated through TenraContext</h3>
        <p>
          Transactions are managed inside the runtime boundary so nested model
          operations can participate in one consistent MongoDB session without
          manual session propagation.
        </p>
      </div>

      <div class="transaction-signal-strip">
        <span>Session Created</span>
        <span>Context Bound</span>
        <span>Session Reused</span>
        <span>Commit or Rollback</span>
      </div>
    </div>

    <div class="transaction-pillars">
      <div class="transaction-pillar">
        <span class="transaction-eyebrow">Atomicity</span>
        <strong>Dependent writes complete together or roll back together</strong>
        <p>
          A failed operation causes the active transaction boundary to roll back
          instead of leaving partial persistence state behind.
        </p>
      </div>

      <div class="transaction-pillar">
        <span class="transaction-eyebrow">Propagation</span>
        <strong>Sessions remain bound to the active runtime scope</strong>
        <p>
          Once a transaction starts, downstream model calls resolve and reuse the
          same session automatically through <code>TenraContext</code>.
        </p>
      </div>

      <div class="transaction-pillar">
        <span class="transaction-eyebrow">Isolation</span>
        <strong>Request and tenant boundaries remain intact</strong>
        <p>
          Transaction state stays scoped to the current execution boundary,
          preventing session leakage across requests, jobs, or tenants.
        </p>
      </div>
    </div>

    <div class="transaction-flow">
      <div class="transaction-flow-step">
        <span>Start</span>
        <strong>withTransaction()</strong>
      </div>
      <div class="transaction-flow-arrow" aria-hidden="true">→</div>
      <div class="transaction-flow-step">
        <span>Session</span>
        <strong>MongoDB session initialized</strong>
      </div>
      <div class="transaction-flow-arrow" aria-hidden="true">→</div>
      <div class="transaction-flow-step">
        <span>Scope</span>
        <strong>Session bound to TenraContext</strong>
      </div>
      <div class="transaction-flow-arrow" aria-hidden="true">→</div>
      <div class="transaction-flow-step">
        <span>Execution</span>
        <strong>Model operations reuse session</strong>
      </div>
      <div class="transaction-flow-arrow" aria-hidden="true">→</div>
      <div class="transaction-flow-step">
        <span>Outcome</span>
        <strong>Commit on success, rollback on failure</strong>
      </div>
    </div>
  </div>
</template>