<template>
  <div class="one-request-flow-visual" aria-label="One request flow">
    <div class="one-request-flow-card">
      <span class="one-request-flow-step">Stage 1</span>
      <strong>HTTP Request</strong>
      <p>The request enters the framework with tenant and request metadata.</p>
    </div>
    <div class="one-request-flow-connector" aria-hidden="true"></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">Stage 2</span>
      <strong>Adapter</strong>
      <p>The framework request is normalized into Tenra’s runtime shape.</p>
    </div>
    <div class="one-request-flow-connector" aria-hidden="true"></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">Stage 3</span>
      <strong>Adapter Runtime</strong>
      <p>Tenant identity, request metadata, and runtime options are resolved.</p>
    </div>
    <div class="one-request-flow-connector" aria-hidden="true"></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">Stage 4</span>
      <strong>TenraContext</strong>
      <p>A scoped execution boundary is created for the current async flow.</p>
    </div>
    <div class="one-request-flow-connector" aria-hidden="true"></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">Stage 5</span>
      <strong>Route / Resolver / Handler</strong>
      <p>Application logic calls models without manual infrastructure plumbing.</p>
    </div>
    <div class="one-request-flow-connector" aria-hidden="true"></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">Stage 6</span>
      <strong>TenraModel</strong>
      <p>The model receives the operation and binds it to the active runtime scope.</p>
    </div>
    <div class="one-request-flow-connector" aria-hidden="true"></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">Stage 7</span>
      <strong>Schema + Middleware</strong>
      <p>Validation, lifecycle hooks, and runtime policies execute around the operation.</p>
    </div>
    <div class="one-request-flow-connector" aria-hidden="true"></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">Stage 8</span>
      <strong>Infrastructure Resolution</strong>
      <p>The database, client, and session are resolved from the model context.</p>
    </div>
    <div class="one-request-flow-connector" aria-hidden="true"></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">Stage 9</span>
      <strong>TenraClient</strong>
      <p>The provider implementation bridges execution into the MongoDB driver.</p>
    </div>
    <div class="one-request-flow-connector" aria-hidden="true"></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">Stage 10</span>
      <strong>MongoDB</strong>
      <p>The database operation executes against the resolved tenant and collection scope.</p>
    </div>
    <div class="one-request-flow-connector" aria-hidden="true"></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">Stage 11</span>
      <strong>Result</strong>
      <p>Post-hooks, instrumentation, and response handling complete the request.</p>
    </div>
  </div>
</template>
