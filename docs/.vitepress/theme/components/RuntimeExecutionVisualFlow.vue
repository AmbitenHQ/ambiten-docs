<template>
  <div class="runtime-visual-flow" aria-label="Runtime execution visual flow">
    <div class="runtime-visual-card">
      <span class="runtime-visual-step">Stage 1</span>
      <strong>Ingress</strong>
      <p>A request or event enters the host runtime.</p>
    </div>
    <div class="runtime-visual-connector" aria-hidden="true"></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">Stage 2</span>
      <strong>Adapter</strong>
      <p>Input is normalized and tenant or request metadata is resolved.</p>
    </div>
    <div class="runtime-visual-connector" aria-hidden="true"></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">Stage 3</span>
      <strong>TenraContext</strong>
      <p>The execution scope is created and ambient state becomes available.</p>
    </div>
    <div class="runtime-visual-connector" aria-hidden="true"></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">Stage 4</span>
      <strong>Application Logic</strong>
      <p>Handlers, controllers, or resolvers call into the model layer.</p>
    </div>
    <div class="runtime-visual-connector" aria-hidden="true"></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">Stage 5</span>
      <strong>TenraModel</strong>
      <p>Validation, middleware, and operation coordination are applied.</p>
    </div>
    <div class="runtime-visual-connector" aria-hidden="true"></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">Stage 6</span>
      <strong>Provider</strong>
      <p>Infrastructure is resolved for the active tenant, database, and session.</p>
    </div>
    <div class="runtime-visual-connector" aria-hidden="true"></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">Stage 7</span>
      <strong>TenraClient</strong>
      <p>The runtime bridges the operation to the MongoDB driver.</p>
    </div>
    <div class="runtime-visual-connector" aria-hidden="true"></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">Stage 8</span>
      <strong>MongoDB</strong>
      <p>The persistence operation is executed against the resolved infrastructure.</p>
    </div>
    <div class="runtime-visual-connector" aria-hidden="true"></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">Stage 9</span>
      <strong>Response</strong>
      <p>Results return upstream and the request scope is allowed to complete.</p>
    </div>
  </div>
</template>
