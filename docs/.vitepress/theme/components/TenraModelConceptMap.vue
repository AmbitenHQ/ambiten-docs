<template>
  <div class="tenra-model-concept-map">
    <div class="tenra-model-concept-grid">

      <a class="tenra-model-concept-card" href="/models/context-binding">
        <span class="tenra-model-concept-label">Context Binding</span>

        <strong class="tenra-model-concept-title">
          Runtime state propagation during model execution.
        </strong>

        <p class="tenra-model-concept-body">
          Explains how tenant scope, sessions, request metadata, and execution
          state become available inside model operations automatically.
        </p>

        <em class="tenra-model-concept-link">Explore runtime binding</em>
      </a>

      <a class="tenra-model-concept-card" href="/models/defining-models">
        <span class="tenra-model-concept-label">Defining Models</span>

        <strong class="tenra-model-concept-title">
          Static model structure with dynamic runtime behavior.
        </strong>

        <p class="tenra-model-concept-body">
          Covers schema configuration, typing, providers, and how models are
          declared within the Tenra runtime architecture.
        </p>

        <em class="tenra-model-concept-link">Explore model definition</em>
      </a>

      <a class="tenra-model-concept-card" href="/core/middleware">
        <span class="tenra-model-concept-label">Middleware</span>

        <strong class="tenra-model-concept-title">
          Runtime policies surrounding persistence execution.
        </strong>

        <p class="tenra-model-concept-body">
          Shows how validation, auditing, access control, observability, and
          execution shaping operate consistently around model behavior.
        </p>

        <em class="tenra-model-concept-link">Explore middleware lifecycle</em>
      </a>

      <a class="tenra-model-concept-card" href="/api/tenra-client">
        <span class="tenra-model-concept-label">TenraClient</span>

        <strong class="tenra-model-concept-title">
          Infrastructure resolution inside the execution boundary.
        </strong>

        <p class="tenra-model-concept-body">
          Explains how databases, sessions, tenant routing, and MongoDB
          infrastructure are resolved dynamically at runtime.
        </p>

        <em class="tenra-model-concept-link">Explore infrastructure resolution</em>
      </a>

    </div>
  </div>
</template>