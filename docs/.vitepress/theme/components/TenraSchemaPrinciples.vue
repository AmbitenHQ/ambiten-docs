<template>
  <div class="tenra-schema-principles">
    <div class="tenra-schema-principles-card">
      <span class="tenra-schema-principles-eyebrow">Design Principles</span>

      <div class="tenra-schema-principles-grid">
        <div class="tenra-schema-principle">
          <strong>Behavior aligned to the data boundary</strong>
          <p>
            Validation, normalization, lifecycle rules, and persistence-oriented
            policies belong close to the schema rather than scattered across services.
          </p>
        </div>

        <div class="tenra-schema-principle">
          <strong>Runtime-aware execution</strong>
          <p>
            Schema middleware executes inside the same runtime boundary as model
            operations, transactions, and tenant-aware execution.
          </p>
        </div>

        <div class="tenra-schema-principle">
          <strong>Centralized policy enforcement</strong>
          <p>
            Cross-cutting concerns should be defined once and applied consistently
            across all persistence operations.
          </p>
        </div>

        <div class="tenra-schema-principle">
          <strong>Deterministic behavior</strong>
          <p>
            Schema-defined execution should behave consistently regardless of
            runtime, request source, or infrastructure environment.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>