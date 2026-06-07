<template>
  <div class="context-binding-flow">
    <div class="context-binding-flow-stage context-binding-flow-stage-ingress">
      <div class="context-binding-flow-head">
        <span class="context-binding-flow-eyebrow">Ingress</span>
        <h3>Execution enters the runtime boundary</h3>
      </div>
      <p>
        Execution may begin from an HTTP request, GraphQL operation, Lambda invocation,
        scheduled job, queue consumer, or explicit background task.
      </p>
    </div>

    <div class="context-binding-flow-arrow" aria-hidden="true">
      <span></span>
    </div>

    <div class="context-binding-flow-stage context-binding-flow-stage-adapter">
      <div class="context-binding-flow-head">
        <span class="context-binding-flow-eyebrow">Scope Entry</span>
        <h3>Adapter or runtime helper establishes context</h3>
      </div>
      <p>
        Ambiten creates the execution boundary through an adapter-managed lifecycle
        or an explicit <code>AmbitenContext.run(...)</code> scope.
      </p>
      <div class="context-binding-flow-chips">
        <span>Express</span>
        <span>Fastify</span>
        <span>NestJS</span>
        <span>GraphQL</span>
        <span>Lambda</span>
      </div>
    </div>

    <div class="context-binding-flow-arrow" aria-hidden="true">
      <span></span>
    </div>

    <div class="context-binding-flow-stage context-binding-flow-stage-context">
      <div class="context-binding-flow-head">
        <span class="context-binding-flow-eyebrow">Ambient State</span>
        <h3>AmbitenContext preserves active execution state</h3>
      </div>
      <div class="context-binding-flow-grid">
        <div class="context-binding-flow-token">tenantId</div>
        <div class="context-binding-flow-token">dbName</div>
        <div class="context-binding-flow-token">collectionName</div>
        <div class="context-binding-flow-token">session</div>
        <div class="context-binding-flow-token">requestId</div>
        <div class="context-binding-flow-token">logger metadata</div>
      </div>
    </div>

    <div class="context-binding-flow-arrow" aria-hidden="true">
      <span></span>
    </div>

    <div class="context-binding-flow-stage context-binding-flow-stage-model">
      <div class="context-binding-flow-head">
        <span class="context-binding-flow-eyebrow">Model Execution</span>
        <h3>AmbitenModel consumes the bound runtime scope</h3>
      </div>
      <p>
        Model operations inherit tenant, database, session, request, middleware,
        and instrumentation behavior without manual infrastructure propagation.
      </p>
      <pre><code>await UserModel.find({})</code></pre>
    </div>

    <div class="context-binding-flow-arrow" aria-hidden="true">
      <span></span>
    </div>

    <div class="context-binding-flow-stage context-binding-flow-stage-client">
      <div class="context-binding-flow-head">
        <span class="context-binding-flow-eyebrow">Infrastructure Resolution</span>
        <h3>Provider resolves the active persistence target</h3>
      </div>
      <p>
        The provider resolves database access, tenant-aware infrastructure bindings,
        runtime overrides, and active transaction sessions for the operation.
      </p>
    </div>

    <div class="context-binding-flow-arrow" aria-hidden="true">
      <span></span>
    </div>

    <div class="context-binding-flow-stage context-binding-flow-stage-db">
      <div class="context-binding-flow-head">
        <span class="context-binding-flow-eyebrow">Persistence</span>
        <h3>MongoDB executes against the resolved scope</h3>
      </div>
      <p>
        Persistence occurs through the MongoDB driver with the intended tenant boundary,
        session participation, and execution metadata preserved.
      </p>
    </div>
  </div>
</template>