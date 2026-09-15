<template>
  <div
    class="architecture-diagram"
    aria-label="Ambiten architecture diagram"
  >
    <!-- Runtime Foundation -->
    <div class="architecture-band architecture-band-core">
      <span class="architecture-band-label">
        Runtime Foundation
      </span>

      <div class="architecture-band-grid three-up">
        <div class="architecture-node">
          AmbitenBootstrapFactory
        </div>

        <div class="architecture-node">
          AmbitenRuntime
        </div>

        <div class="architecture-node">
          Long-Lived Runtime Infrastructure
        </div>
      </div>
    </div>

    <div
      class="architecture-connector"
      aria-hidden="true"
    >
      <span></span>
    </div>

    <!-- Ingress -->
    <div class="architecture-band architecture-band-app">
      <span class="architecture-band-label">
        Execution Ingress
      </span>

      <div class="architecture-band-grid">
        <div class="architecture-node">
          Express
        </div>

        <div class="architecture-node">
          Fastify
        </div>

        <div class="architecture-node">
          NestJS
        </div>

        <div class="architecture-node">
          GraphQL
        </div>

        <div class="architecture-node">
          AWS Lambda
        </div>

        <div class="architecture-node">
          Jobs / Workers
        </div>
      </div>
    </div>

    <div
      class="architecture-connector"
      aria-hidden="true"
    >
      <span></span>
    </div>

    <!-- Execution Boundary -->
    <div class="architecture-band architecture-band-adapter">
      <span class="architecture-band-label">
        Execution Boundary
      </span>

      <div class="architecture-band-grid three-up">
        <div class="architecture-node">
          Framework Adapter
        </div>

        <div class="architecture-node">
          Adapter Runtime
        </div>

        <div class="architecture-node">
          Explicit AmbitenContext.run()
        </div>
      </div>
    </div>

    <div
      class="architecture-connector"
      aria-hidden="true"
    >
      <span></span>
    </div>

    <!-- Context -->
    <div class="architecture-band architecture-band-context">
      <span class="architecture-band-label">
        AmbitenContext
      </span>

      <div class="architecture-band-grid two-up">
        <div class="architecture-node">
          Tenant Identity
        </div>

        <div class="architecture-node">
          Request Metadata
        </div>

        <div class="architecture-node">
          Transaction Session
        </div>

        <div class="architecture-node">
          Runtime Metadata
        </div>
      </div>
    </div>

    <div
      class="architecture-connector"
      aria-hidden="true"
    >
      <span></span>
    </div>

    <!-- Application and Model -->
    <div class="architecture-band architecture-band-core">
      <span class="architecture-band-label">
        Application & Model Layer
      </span>

      <div class="architecture-band-grid two-up">
        <div class="architecture-node">
          Controllers / Services / Resolvers
        </div>

        <div class="architecture-node">
          AmbitenModel
        </div>

        <div class="architecture-node">
          Schema + Middleware
        </div>

        <div class="architecture-node">
          Effective Context Resolution
        </div>
      </div>
    </div>

    <div
      class="architecture-connector"
      aria-hidden="true"
    >
      <span></span>
    </div>

    <!-- Infrastructure Resolution -->
    <div class="architecture-band architecture-band-provider">
      <span class="architecture-band-label">
        Infrastructure Resolution
      </span>

      <div class="architecture-band-grid two-up">
        <div class="architecture-node">
          Provider Resolution
        </div>

        <div class="architecture-node">
          MultiTenantManager
        </div>

        <div class="architecture-node">
          TenantConfigResolver
        </div>

        <div class="architecture-node">
          Client / Database / Collection / Session
        </div>
      </div>
    </div>

    <div
      class="architecture-connector"
      aria-hidden="true"
    >
      <span></span>
    </div>

    <!-- Client -->
    <div class="architecture-band architecture-band-client">
      <span class="architecture-band-label">
        Client Layer
      </span>

      <div class="architecture-band-grid single">
        <div
          class="architecture-node architecture-node-featured"
        >
          AmbitenClient
          — MongoDB driver bridge and managed client access
        </div>
      </div>
    </div>

    <div
      class="architecture-connector"
      aria-hidden="true"
    >
      <span></span>
    </div>

    <!-- Persistence -->
    <div class="architecture-band architecture-band-db">
      <span class="architecture-band-label">
        Persistence Layer
      </span>

      <div class="architecture-band-grid single">
        <div
          class="architecture-node architecture-node-featured"
        >
          MongoDB Driver, Databases, Collections,
          Sessions, and Cluster Topology
        </div>
      </div>
    </div>
  </div>
</template>