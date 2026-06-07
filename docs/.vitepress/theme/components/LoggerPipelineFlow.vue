<template>
  <div class="logger-pipeline-flow" aria-label="Ambiten Logger pipeline">
    <div class="logger-pipeline-step">
      <span class="logger-pipeline-label">Stage 1</span>
      <strong>Application Runtime</strong>
      <p>Application code emits logging events from handlers, services, workers, or infrastructure boundaries.</p>
    </div>
    <div class="logger-pipeline-connector" aria-hidden="true"></div>

    <div class="logger-pipeline-step">
      <span class="logger-pipeline-label">Stage 2</span>
      <strong>Context Resolution</strong>
      <p>Active runtime metadata such as tenant, request, database, and execution state is resolved.</p>
    </div>
    <div class="logger-pipeline-connector" aria-hidden="true"></div>

    <div class="logger-pipeline-step">
      <span class="logger-pipeline-label">Stage 3</span>
      <strong>Structured Log Entry</strong>
      <p>The logger normalizes the event into a transport-ready, structured runtime payload.</p>
    </div>
    <div class="logger-pipeline-connector" aria-hidden="true"></div>

    <div class="logger-pipeline-step">
      <span class="logger-pipeline-label">Stage 4</span>
      <strong>Enrichment & Policies</strong>
      <p>Metadata enrichment, filtering, classification, and runtime policy shaping are applied.</p>
    </div>
    <div class="logger-pipeline-connector" aria-hidden="true"></div>

    <div class="logger-pipeline-step">
      <span class="logger-pipeline-label">Stage 5</span>
      <strong>Buffer / Batch / Resilience</strong>
      <p>Entries may be buffered, batched, retried, or protected by resilience controls before delivery.</p>
    </div>
    <div class="logger-pipeline-connector" aria-hidden="true"></div>

    <div class="logger-pipeline-step">
      <span class="logger-pipeline-label">Stage 6</span>
      <strong>Transport Layer</strong>
      <p>Logs are delivered to console, files, HTTP, Loki, Elasticsearch, or other destinations.</p>
    </div>
  </div>
</template>
