<template>
  <div class="tenra-model-principles">
    <div class="tenra-model-principles-card">

      <span class="tenra-model-principles-eyebrow">
        Runtime Design Principles
      </span>

      <div class="tenra-model-principles-grid">

        <div class="tenra-model-principle">
          <strong>Runtime-aware execution</strong>

          <p>
            Model operations resolve tenant scope, transaction state, and
            execution metadata from the active runtime boundary automatically.
          </p>
        </div>

        <div class="tenra-model-principle">
          <strong>Separation of execution and infrastructure</strong>

          <p>
            Models coordinate persistence behavior while providers resolve
            databases, sessions, and tenant-aware infrastructure concerns.
          </p>
        </div>

        <div class="tenra-model-principle">
          <strong>Deterministic behavior</strong>

          <p>
            The same operation executed inside the same runtime boundary should
            resolve the same infrastructure, middleware chain, and execution flow.
          </p>
        </div>

        <div class="tenra-model-principle">
          <strong>Static structure, dynamic runtime</strong>

          <p>
            Model definitions remain stable while execution context changes per
            request, tenant, transaction scope, or deployment environment.
          </p>
        </div>

      </div>
    </div>
  </div>
</template>