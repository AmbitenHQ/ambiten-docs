<template>
  <div class="ambiten-schema-principles">
    <div class="ambiten-schema-principles-card">
      <span class="ambiten-schema-principles-eyebrow">
        Design Principles
      </span>

      <div class="ambiten-schema-principles-grid">

        <div class="ambiten-schema-principle">
          <strong>
            Behavior aligned to the data boundary
          </strong>

          <p>
            Validation, normalization, lifecycle configuration, middleware,
            and persistence-oriented policies remain close to the schema
            instead of being duplicated across application services.
          </p>
        </div>

        <div class="ambiten-schema-principle">
          <strong>
            Runtime-aware through ModelContext
          </strong>

          <p>
            Schema and middleware behavior participate in the effective
            <code>ModelContext</code> resolved by <code>AmbitenModel</code>,
            allowing tenant identity, transaction sessions, operation controls,
            and other execution state to influence persistence behavior.
          </p>
        </div>

        <div class="ambiten-schema-principle">
          <strong>
            Centralized persistence policy
          </strong>

          <p>
            Cross-cutting persistence concerns can be defined once at the
            schema boundary and applied consistently to model operations that
            use that schema.
          </p>
        </div>

        <div class="ambiten-schema-principle">
          <strong>
            Static definition, deterministic execution
          </strong>

          <p>
            Schema definitions remain stable while execution-specific state
            changes per request, tenant, transaction, or runtime boundary,
            preserving predictable behavior for equivalent operation contexts.
          </p>
        </div>

      </div>
    </div>
  </div>
</template>