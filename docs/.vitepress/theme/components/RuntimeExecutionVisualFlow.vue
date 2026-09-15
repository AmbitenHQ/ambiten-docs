<template>
  <div
    class="runtime-visual-flow"
    aria-label="Runtime execution visual flow"
  >
    <div class="runtime-visual-card">
      <span class="runtime-visual-step">
        Stage 1
      </span>

      <strong>Ingress</strong>

      <p>
        A request, operation, invocation, job, or event enters
        the host environment.
      </p>
    </div>

    <div
      class="runtime-visual-connector"
      aria-hidden="true"
    ></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">
        Stage 2
      </span>

      <strong>Execution Boundary</strong>

      <p>
        A framework adapter normalizes execution and resolves
        identity, or an explicit runtime boundary is established.
      </p>
    </div>

    <div
      class="runtime-visual-connector"
      aria-hidden="true"
    ></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">
        Stage 3
      </span>

      <strong>AmbitenContext</strong>

      <p>
        Execution-scoped state such as tenant identity,
        request metadata, and transaction state becomes active.
      </p>
    </div>

    <div
      class="runtime-visual-connector"
      aria-hidden="true"
    ></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">
        Stage 4
      </span>

      <strong>Application Logic</strong>

      <p>
        Handlers, controllers, resolvers, services, or workers
        execute inside the active runtime boundary.
      </p>
    </div>

    <div
      class="runtime-visual-connector"
      aria-hidden="true"
    ></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">
        Stage 5
      </span>

      <strong>AmbitenModel</strong>

      <p>
        Validation, middleware, effective context, and operation
        coordination are applied.
      </p>
    </div>

    <div
      class="runtime-visual-connector"
      aria-hidden="true"
    ></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">
        Stage 6
      </span>

      <strong>Infrastructure Resolution</strong>

      <p>
        Providers and MultiTenantManager resolve the client,
        tenant, database, collection, session, and runtime
        overrides required by the operation.
      </p>
    </div>

    <div
      class="runtime-visual-connector"
      aria-hidden="true"
    ></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">
        Stage 7
      </span>

      <strong>AmbitenClient</strong>

      <p>
        The finalized runtime operation is bridged to the
        MongoDB driver using the resolved infrastructure.
      </p>
    </div>

    <div
      class="runtime-visual-connector"
      aria-hidden="true"
    ></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">
        Stage 8
      </span>

      <strong>MongoDB</strong>

      <p>
        Persistence executes against the selected tenant,
        database, collection, and active transaction session.
      </p>
    </div>

    <div
      class="runtime-visual-connector"
      aria-hidden="true"
    ></div>

    <div class="runtime-visual-card">
      <span class="runtime-visual-step">
        Stage 9
      </span>

      <strong>Egress</strong>

      <p>
        Results return through post-processing and the enclosing
        transaction and execution boundary complete according
        to the outcome.
      </p>
    </div>
  </div>
</template>