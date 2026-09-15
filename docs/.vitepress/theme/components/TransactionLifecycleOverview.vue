<template>
  <div class="transaction-overview">
    <div class="transaction-hero-card">
      <div class="transaction-hero-copy">
        <span class="transaction-eyebrow">
          Transaction Model
        </span>

        <h3>
          Atomic execution coordinated through AmbitenContext
        </h3>

        <p>
          A transaction boundary binds a MongoDB session into
          <code>AmbitenContext</code>, allowing participating model operations
          to inherit the same transaction state through their effective
          <code>ModelContext</code> without manual session propagation.
        </p>
      </div>

      <div class="transaction-signal-strip">
        <span>Session Created</span>
        <span>Context Bound</span>
        <span>ModelContext Inherits</span>
        <span>Commit or Rollback</span>
      </div>
    </div>

    <div class="transaction-pillars">
      <div class="transaction-pillar">
        <span class="transaction-eyebrow">
          Atomicity
        </span>

        <strong>
          Participating MongoDB writes complete inside one transaction boundary
        </strong>

        <p>
          When the transaction callback succeeds, the enclosing boundary can
          commit. When it fails, the boundary aborts the transaction so
          participating writes do not persist as a partial unit.
        </p>
      </div>

      <div class="transaction-pillar">
        <span class="transaction-eyebrow">
          Propagation
        </span>

        <strong>
          Session state flows from context into model execution
        </strong>

        <p>
          The active session is stored in <code>AmbitenContext</code> and
          projected by <code>AmbitenModel</code> into the effective
          <code>ModelContext</code> used by participating operations.
        </p>
      </div>

      <div class="transaction-pillar">
        <span class="transaction-eyebrow">
          Isolation
        </span>

        <strong>
          Transaction state remains execution-scoped
        </strong>

        <p>
          Each transaction belongs to its active execution boundary, preventing
          session state from leaking into unrelated requests, jobs, workers, or
          concurrent tenant executions.
        </p>
      </div>
    </div>

    <div class="transaction-flow">
      <div class="transaction-flow-step">
        <span>
          Boundary
        </span>

        <strong>
          withTransaction()
        </strong>
      </div>

      <div
        class="transaction-flow-arrow"
        aria-hidden="true"
      >
        →
      </div>

      <div class="transaction-flow-step">
        <span>
          Session
        </span>

        <strong>
          MongoDB session established
        </strong>
      </div>

      <div
        class="transaction-flow-arrow"
        aria-hidden="true"
      >
        →
      </div>

      <div class="transaction-flow-step">
        <span>
          Context
        </span>

        <strong>
          Session bound to AmbitenContext
        </strong>
      </div>

      <div
        class="transaction-flow-arrow"
        aria-hidden="true"
      >
        →
      </div>

      <div class="transaction-flow-step">
        <span>
          Binding
        </span>

        <strong>
          ModelContext inherits active session
        </strong>
      </div>

      <div
        class="transaction-flow-arrow"
        aria-hidden="true"
      >
        →
      </div>

      <div class="transaction-flow-step">
        <span>
          Execution
        </span>

        <strong>
          Participating operations reuse session
        </strong>
      </div>

      <div
        class="transaction-flow-arrow"
        aria-hidden="true"
      >
        →
      </div>

      <div class="transaction-flow-step">
        <span>
          Outcome
        </span>

        <strong>
          Boundary commits or rolls back
        </strong>
      </div>
    </div>
  </div>
</template>