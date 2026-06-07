<template>
  <div class="bootstrap-lifecycle-flow" aria-label="Ambiten runtime lifecycle flow">
    <div class="bootstrap-lifecycle-step bootstrap-lifecycle-step-factory">
      <span class="bootstrap-lifecycle-eyebrow">Entry</span>
      <strong>AmbitenBootstrapFactory.create()</strong>
    </div>

    <span class="bootstrap-lifecycle-arrow" aria-hidden="true">→</span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">Config</span>
      <strong>Load configuration</strong>
    </div>

    <span class="bootstrap-lifecycle-arrow" aria-hidden="true">→</span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">Observability</span>
      <strong>Initialize logger</strong>
    </div>

    <span class="bootstrap-lifecycle-arrow" aria-hidden="true">→</span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">Persistence</span>
      <strong>Initialize MongoDB provider</strong>
    </div>

    <span class="bootstrap-lifecycle-arrow" aria-hidden="true">→</span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">Caching</span>
      <strong>Initialize Redis if enabled</strong>
    </div>

    <span class="bootstrap-lifecycle-arrow" aria-hidden="true">→</span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">Runtime</span>
      <strong>Initialize schema and model runtime</strong>
    </div>

    <span class="bootstrap-lifecycle-arrow" aria-hidden="true">→</span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">Tenancy</span>
      <strong>Register multi-tenant infrastructure</strong>
    </div>

    <span class="bootstrap-lifecycle-arrow" aria-hidden="true">→</span>

    <div class="bootstrap-lifecycle-step">
      <span class="bootstrap-lifecycle-eyebrow">Lifecycle</span>
      <strong>Initialize garbage collection if enabled</strong>
    </div>

    <span class="bootstrap-lifecycle-arrow" aria-hidden="true">→</span>

    <div class="bootstrap-lifecycle-step bootstrap-lifecycle-step-ready">
      <span class="bootstrap-lifecycle-eyebrow">Ready</span>
      <strong>Runtime ready</strong>
    </div>
  </div>
</template>
