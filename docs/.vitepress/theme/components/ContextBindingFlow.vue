<template>
  <div class="context-binding-flow">

    <!-- Ingress -->
    <div
      class="context-binding-flow-stage context-binding-flow-stage-ingress"
    >
      <div class="context-binding-flow-head">
        <span class="context-binding-flow-eyebrow">
          Ingress
        </span>

        <h3>
          Execution enters an Ambiten runtime boundary
        </h3>
      </div>

      <p>
        Execution may begin from an HTTP request, GraphQL operation,
        Lambda invocation, scheduled job, queue consumer, teaching
        example, script, or explicit application task.
      </p>
    </div>

    <div
      class="context-binding-flow-arrow"
      aria-hidden="true"
    >
      <span></span>
    </div>

    <!-- Scope Entry -->
    <div
      class="context-binding-flow-stage context-binding-flow-stage-adapter"
    >
      <div class="context-binding-flow-head">
        <span class="context-binding-flow-eyebrow">
          Scope Entry
        </span>

        <h3>
          Adapter or explicit runtime helper establishes context
        </h3>
      </div>

      <p>
        Ambiten establishes execution through a framework adapter,
        an explicit <code>AmbitenContext.run(...)</code> boundary,
        or another context-aware runtime helper.
      </p>

      <div class="context-binding-flow-chips">
        <span>Express</span>
        <span>Fastify</span>
        <span>NestJS</span>
        <span>GraphQL</span>
        <span>Lambda</span>
        <span>Manual / Script</span>
      </div>
    </div>

    <div
      class="context-binding-flow-arrow"
      aria-hidden="true"
    >
      <span></span>
    </div>

    <!-- Context -->
    <div
      class="context-binding-flow-stage context-binding-flow-stage-context"
    >
      <div class="context-binding-flow-head">
        <span class="context-binding-flow-eyebrow">
          Ambient State
        </span>

        <h3>
          AmbitenContext preserves active execution state
        </h3>
      </div>

      <div class="context-binding-flow-grid">
        <div class="context-binding-flow-token">
          tenantId
        </div>

        <div class="context-binding-flow-token">
          dbName
        </div>

        <div class="context-binding-flow-token">
          collectionName
        </div>

        <div class="context-binding-flow-token">
          session
        </div>

        <div class="context-binding-flow-token">
          requestId
        </div>

        <div class="context-binding-flow-token">
          logger metadata
        </div>
      </div>
    </div>

    <div
      class="context-binding-flow-arrow"
      aria-hidden="true"
    >
      <span></span>
    </div>

    <!-- Execution Surfaces -->
    <div
      class="context-binding-flow-stage context-binding-flow-stage-model"
    >
      <div class="context-binding-flow-head">
        <span class="context-binding-flow-eyebrow">
          Execution Binding
        </span>

        <h3>
          Runtime state is bound to the active execution surface
        </h3>
      </div>

      <p>
        <code>AmbitenModel</code> merges active
        <code>AmbitenContext</code> state into an effective
        <code>ModelContext</code>. Direct <code>AmbitenClient</code>
        workflows may instead use explicit <code>ModelContext</code>,
        scoped clients, or client helpers that read ambient context.
      </p>

      <div class="context-binding-flow-grid">
        <div class="context-binding-flow-token">
          AmbitenModel
        </div>

        <div class="context-binding-flow-token">
          ModelContext
        </div>

        <div class="context-binding-flow-token">
          AmbitenClient
        </div>
      </div>

      <pre><code>await UserModel.find({})</code></pre>
    </div>

    <div
      class="context-binding-flow-arrow"
      aria-hidden="true"
    >
      <span></span>
    </div>

    <!-- Infrastructure Resolution -->
    <div
      class="context-binding-flow-stage context-binding-flow-stage-client"
    >
      <div class="context-binding-flow-head">
        <span class="context-binding-flow-eyebrow">
          Runtime Resolution
        </span>

        <h3>
          Effective operation state resolves persistence infrastructure
        </h3>
      </div>

      <p>
        The model resolves its effective collection boundary while providers,
        <code>MultiTenantManager</code>, and <code>AmbitenClient</code>
        resolve the database, MongoDB client, tenant infrastructure,
        transaction session, and supported runtime overrides required by
        the operation.
      </p>
    </div>

    <div
      class="context-binding-flow-arrow"
      aria-hidden="true"
    >
      <span></span>
    </div>

    <!-- Persistence -->
    <div
      class="context-binding-flow-stage context-binding-flow-stage-db"
    >
      <div class="context-binding-flow-head">
        <span class="context-binding-flow-eyebrow">
          Persistence
        </span>

        <h3>
          MongoDB executes against the resolved operation scope
        </h3>
      </div>

      <p>
        Persistence executes through MongoDB using the resolved database,
        collection, client, and transaction session produced by the active
        Ambiten execution path.
      </p>
    </div>

  </div>
</template>