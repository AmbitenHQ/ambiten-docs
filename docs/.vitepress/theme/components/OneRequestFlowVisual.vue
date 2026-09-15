<template>
  <div
    class="one-request-flow-visual"
    aria-label="One request flow"
  >
    <div class="one-request-flow-card">
      <span class="one-request-flow-step">
        Stage 1
      </span>

      <strong>
        HTTP Request
      </strong>

      <p>
        The request enters the framework with tenant identity,
        request metadata, and application input.
      </p>
    </div>

    <div
      class="one-request-flow-connector"
      aria-hidden="true"
    ></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">
        Stage 2
      </span>

      <strong>
        Adapter
      </strong>

      <p>
        The framework request enters Ambiten through the appropriate
        adapter integration boundary.
      </p>
    </div>

    <div
      class="one-request-flow-connector"
      aria-hidden="true"
    ></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">
        Stage 3
      </span>

      <strong>
        Adapter Runtime
      </strong>

      <p>
        Tenant identity, request metadata, validation, and configured
        execution options are resolved before application logic begins.
      </p>
    </div>

    <div
      class="one-request-flow-connector"
      aria-hidden="true"
    ></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">
        Stage 4
      </span>

      <strong>
        AmbitenContext
      </strong>

      <p>
        Execution-scoped state is bound to the active asynchronous
        flow and remains isolated from unrelated executions.
      </p>
    </div>

    <div
      class="one-request-flow-connector"
      aria-hidden="true"
    ></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">
        Stage 5
      </span>

      <strong>
        Route / Resolver / Handler
      </strong>

      <p>
        Application logic invokes model operations without manually
        forwarding tenant, request, database, or transaction state.
      </p>
    </div>

    <div
      class="one-request-flow-connector"
      aria-hidden="true"
    ></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">
        Stage 6
      </span>

      <strong>
        AmbitenModel
      </strong>

      <p>
        The model receives the operation, applies its model definition,
        and resolves the effective operation context.
      </p>
    </div>

    <div
      class="one-request-flow-connector"
      aria-hidden="true"
    ></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">
        Stage 7
      </span>

      <strong>
        Effective ModelContext
      </strong>

      <p>
        Explicit operation context, active
        <code>AmbitenContext</code>, and model defaults are merged into
        the persistence-facing operation state.
      </p>
    </div>

    <div
      class="one-request-flow-connector"
      aria-hidden="true"
    ></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">
        Stage 8
      </span>

      <strong>
        Schema + Middleware
      </strong>

      <p>
        Validation, persistence policy, middleware, lifecycle behavior,
        and operation-specific rules execute using the effective
        <code>ModelContext</code>.
      </p>
    </div>

    <div
      class="one-request-flow-connector"
      aria-hidden="true"
    ></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">
        Stage 9
      </span>

      <strong>
        Infrastructure Resolution
      </strong>

      <p>
        Providers, <code>MultiTenantManager</code>, and runtime
        infrastructure resolve the required database, MongoDB client,
        tenant resources, and active session while the model retains
        collection ownership.
      </p>
    </div>

    <div
      class="one-request-flow-connector"
      aria-hidden="true"
    ></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">
        Stage 10
      </span>

      <strong>
        AmbitenClient
      </strong>

      <p>
        The provider implementation supplies MongoDB database, client,
        and session capability for the resolved operation scope.
      </p>
    </div>

    <div
      class="one-request-flow-connector"
      aria-hidden="true"
    ></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">
        Stage 11
      </span>

      <strong>
        MongoDB
      </strong>

      <p>
        The persistence operation executes against the resolved database,
        model collection, MongoDB client, and active transaction session
        when one exists.
      </p>
    </div>

    <div
      class="one-request-flow-connector"
      aria-hidden="true"
    ></div>

    <div class="one-request-flow-card">
      <span class="one-request-flow-step">
        Stage 12
      </span>

      <strong>
        Result + Completion
      </strong>

      <p>
        Post-operation middleware and instrumentation complete, an active
        transaction boundary commits or rolls back as appropriate, and
        the result returns through the framework response.
      </p>
    </div>
  </div>
</template>