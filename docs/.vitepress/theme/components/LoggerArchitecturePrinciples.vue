<template>
  <div class="logger-principles-grid" aria-label="Logger architecture principles">
    <article class="logger-principle-card">
      <span class="logger-principle-label">Principle 1</span>
      <strong>Execution Continuity</strong>
      <p>Logs retain execution meaning across requests, tenants, background tasks, and asynchronous boundaries.</p>
    </article>
    <article class="logger-principle-card">
      <span class="logger-principle-label">Principle 2</span>
      <strong>Transport Independence</strong>
      <p>Application logging remains stable while delivery infrastructure evolves independently over time.</p>
    </article>
    <article class="logger-principle-card">
      <span class="logger-principle-label">Principle 3</span>
      <strong>Operational Resilience</strong>
      <p>Failures in downstream logging infrastructure are isolated so observability does not destabilize runtime execution.</p>
    </article>
  </div>
</template>
