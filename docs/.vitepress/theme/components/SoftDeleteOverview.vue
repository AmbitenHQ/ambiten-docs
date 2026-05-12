<template>
  <div class="soft-delete-overview">
    <div class="soft-delete-hero-card">
      <div class="soft-delete-hero-copy">
        <span class="soft-delete-eyebrow">Runtime Deletion Policy</span>
        <h3>Turn deletion into a controlled lifecycle transition.</h3>
        <p>
          Soft delete removes records from normal application visibility without
          physically erasing them, giving teams a safer operating model for recovery,
          auditing, retention, and deliberate purge workflows.
        </p>
      </div>

      <div class="soft-delete-signal-strip">
        <span>Mark Deleted</span>
        <span>Hide By Default</span>
        <span>Restore Explicitly</span>
        <span>Purge Deliberately</span>
      </div>
    </div>

    <div class="soft-delete-pillars">
      <div class="soft-delete-pillar">
        <span class="soft-delete-eyebrow">Safety</span>
        <strong>Deletion remains recoverable by default</strong>
        <p>
          Records remain available for restoration, investigation, or audit instead
          of being removed irreversibly on the first delete call.
        </p>
      </div>

      <div class="soft-delete-pillar">
        <span class="soft-delete-eyebrow">Lifecycle State</span>
        <strong>Deleted records enter an explicit runtime state</strong>
        <p>
          Middleware turns delete intent into a visible state transition that reads,
          aggregates, and lifecycle tooling can respect consistently.
        </p>
      </div>

      <div class="soft-delete-pillar">
        <span class="soft-delete-eyebrow">Governance</span>
        <strong>Retention and purge behavior stay intentional</strong>
        <p>
          Teams can separate reversible removal from permanent erasure, creating
          a more predictable operational model for data lifecycle control.
        </p>
      </div>
    </div>

    <div class="soft-delete-flow">
      <div class="soft-delete-flow-step">
        <span>Delete Intent</span>
        <strong>Delete operation enters runtime</strong>
      </div>
      <div class="soft-delete-flow-arrow" aria-hidden="true">→</div>

      <div class="soft-delete-flow-step">
        <span>Policy Layer</span>
        <strong>Middleware converts delete into update</strong>
      </div>
      <div class="soft-delete-flow-arrow" aria-hidden="true">→</div>

      <div class="soft-delete-flow-step">
        <span>State Marker</span>
        <strong>Deleted-state fields are written</strong>
      </div>
      <div class="soft-delete-flow-arrow" aria-hidden="true">→</div>

      <div class="soft-delete-flow-step">
        <span>Query Safety</span>
        <strong>Reads and aggregates hide deleted records by default</strong>
      </div>
      <div class="soft-delete-flow-arrow" aria-hidden="true">→</div>

      <div class="soft-delete-flow-step">
        <span>Lifecycle Control</span>
        <strong>Records can be restored or purged deliberately</strong>
      </div>
    </div>
  </div>
</template>