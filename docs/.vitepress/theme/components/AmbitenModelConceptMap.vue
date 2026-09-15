<template>
  <div class="ambiten-model-concept-map">
    <div class="ambiten-model-concept-grid">

      <a
        class="ambiten-model-concept-card"
        href="/models/context-binding"
      >
        <span class="ambiten-model-concept-label">
          Context Binding
        </span>

        <strong class="ambiten-model-concept-title">
          Execution state becomes effective model context.
        </strong>

        <p class="ambiten-model-concept-body">
          Explains how tenant identity, request metadata, transaction sessions,
          runtime overrides, and model defaults participate in effective context
          resolution during an operation.
        </p>

        <em class="ambiten-model-concept-link">
          Explore context binding
        </em>
      </a>

      <a
        class="ambiten-model-concept-card"
        href="/models/defining-models"
      >
        <span class="ambiten-model-concept-label">
          Defining Models
        </span>

        <strong class="ambiten-model-concept-title">
          Static model structure with dynamic execution behavior.
        </strong>

        <p class="ambiten-model-concept-body">
          Covers schema association, typing, collection configuration,
          middleware, model defaults, and the structural definition that is
          registered before runtime operations begin.
        </p>

        <em class="ambiten-model-concept-link">
          Explore model definition
        </em>
      </a>

      <a
        class="ambiten-model-concept-card"
        href="/core/middleware"
      >
        <span class="ambiten-model-concept-label">
          Middleware
        </span>

        <strong class="ambiten-model-concept-title">
          Deterministic policies around model execution.
        </strong>

        <p class="ambiten-model-concept-body">
          Shows how validation, normalization, policy enforcement, auditing,
          instrumentation, and result shaping participate in the model
          operation lifecycle.
        </p>

        <em class="ambiten-model-concept-link">
          Explore middleware lifecycle
        </em>
      </a>

      <a
        class="ambiten-model-concept-card"
        href="/multi-tenancy/multi-tenant-manager"
      >
        <span class="ambiten-model-concept-label">
          MultiTenantManager
        </span>

        <strong class="ambiten-model-concept-title">
          Tenant infrastructure resolution and lifecycle.
        </strong>

        <p class="ambiten-model-concept-body">
          Explains how tenant configuration, dynamic discovery, lazy client
          activation, runtime registration, and tenant database resources are
          resolved from the active tenant identity.
        </p>

        <em class="ambiten-model-concept-link">
          Explore tenant infrastructure
        </em>
      </a>

      <a
        class="ambiten-model-concept-card"
        href="/reference/api/ambiten-client"
      >
        <span class="ambiten-model-concept-label">
          AmbitenClient
        </span>

        <strong class="ambiten-model-concept-title">
          The bridge from resolved runtime infrastructure to MongoDB.
        </strong>

        <p class="ambiten-model-concept-body">
          Explains how Ambiten uses the resolved client, database, collection,
          session, and operation options to execute against the MongoDB driver
          without hiding MongoDB semantics.
        </p>

        <em class="ambiten-model-concept-link">
          Explore MongoDB client access
        </em>
      </a>

    </div>
  </div>
</template>