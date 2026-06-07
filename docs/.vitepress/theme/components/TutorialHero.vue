<template>
  <section class="tutorial-hero">
    <div class="tutorial-hero-card">
      <div class="tutorial-hero-copy">
        <span class="tutorial-eyebrow">Flagship Tutorial</span>
        <h1>Build a Document-to-PDF SaaS with Ambiten</h1>
        <p>
          Build a tenant-aware SaaS workflow with tier-based access, runtime context,
          transaction-safe records, middleware policy, and structured instrumentation.
        </p>
      </div>

      <div class="tutorial-signal-strip">
        <span>Tenant-Aware</span>
        <span>Tier Policy</span>
        <span>Transactions</span>
        <span>Instrumentation</span>
      </div>
    </div>

    <div class="tutorial-pillars">
      <div class="tutorial-pillar">
        <span>Runtime</span>
        <strong>One execution boundary</strong>
        <p>
          Tenant identity, request metadata, and transaction scope move through
          AmbitenContext without manual propagation.
        </p>
      </div>

      <div class="tutorial-pillar">
        <span>Product Logic</span>
        <strong>Free, Premium, Ultimate</strong>
        <p>
          Access tiers are enforced through focused policy logic while persistence
          remains runtime-aware and clean.
        </p>
      </div>

      <div class="tutorial-pillar">
        <span>Operations</span>
        <strong>Observable by design</strong>
        <p>
          Conversion workflows emit structured telemetry through Ambiten’s
          instrumentation boundary.
        </p>
      </div>
    </div>
  </section>
</template>