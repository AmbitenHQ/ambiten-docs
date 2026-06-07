<template>
  <section class="ambiten-logger-home">
    <div class="ambiten-logger-home-copy">
      <span class="ambiten-alt-kicker">Runtime observability</span>
      <h2>Execution-aware logging for context-driven systems.</h2>
      <p class="ambiten-logger-home-lead">
        Ambiten Logger is not a console wrapper. It is a runtime-aware observability layer
        designed to preserve execution context across requests, transactions, adapters,
        workers, and distributed application flows.
      </p>
    </div>

    <div class="ambiten-logger-home-flow">
      <span>Request</span>
      <span>AmbitenContext</span>
      <span>Transaction</span>
      <span>Instrumentation</span>
      <span>Logger</span>
      <span>Transports</span>
    </div>

    <div class="ambiten-logger-home-grid">
      <article class="ambiten-logger-home-card">
        <h3>Context-aware by design</h3>
        <p>
          Logs can automatically inherit request IDs, tenant identity, database targets,
          collection names, and runtime metadata from the active Ambiten context.
        </p>
      </article>

      <article class="ambiten-logger-home-card">
        <h3>Structured runtime telemetry</h3>
        <p>
          Every log is treated as structured execution data, making it easier to search,
          correlate, route, and analyze across production observability systems.
        </p>
      </article>

      <article class="ambiten-logger-home-card">
        <h3>Resilient transport pipeline</h3>
        <p>
          Console, rolling files, async batching, HTTP, Elasticsearch, and Loki transports
          can be composed with retry and circuit breaker protection.
        </p>
      </article>
    </div>

    <div class="ambiten-alt-actions ambiten-logger-home-actions">
      <a class="ambiten-alt-action primary" href="/logger/introduction">Explore Ambiten Logger</a>
      <a class="ambiten-alt-action secondary" href="/logger/transports/overview">View transports</a>
    </div>
  </section>
</template>
