<template>
  <div class="architecture-diagram">
    <!-- Ingress -->
    <div class="architecture-band architecture-band-app">
      <span class="architecture-band-label">Ingress Layer</span>
      <div class="architecture-band-grid">
        <div class="architecture-node">Express</div>
        <div class="architecture-node">Fastify</div>
        <div class="architecture-node">NestJS</div>
        <div class="architecture-node">GraphQL</div>
        <div class="architecture-node">AWS Lambda</div>
      </div>
    </div>

    <div class="architecture-connector"><span></span></div>

    <!-- Adapter -->
    <div class="architecture-band architecture-band-adapter">
      <span class="architecture-band-label">Adapter Layer</span>
      <div class="architecture-band-grid single">
        <div class="architecture-node architecture-node-featured">
          Normalize request or event into Ambiten runtime execution
        </div>
      </div>
    </div>

    <div class="architecture-connector"><span></span></div>

    <!-- Context -->
    <div class="architecture-band architecture-band-context">
      <span class="architecture-band-label">AmbitenContext</span>
      <div class="architecture-band-grid three-up">
        <div class="architecture-node">Tenant Scope</div>
        <div class="architecture-node">Request Metadata</div>
        <div class="architecture-node">Session / Transaction</div>
      </div>
    </div>

    <div class="architecture-connector"><span></span></div>

    <!-- Runtime -->
    <div class="architecture-band architecture-band-core">
      <span class="architecture-band-label">Ambiten Runtime</span>
      <div class="architecture-band-grid two-up">
        <div class="architecture-node">AmbitenModel</div>
        <div class="architecture-node">Schema + Middleware</div>
        <div class="architecture-node">Policy Enforcement</div>
        <div class="architecture-node">Transaction Propagation</div>
      </div>
    </div>

    <div class="architecture-connector"><span></span></div>

    <!-- Provider -->
    <div class="architecture-band architecture-band-provider">
      <span class="architecture-band-label">Provider Layer</span>
      <div class="architecture-band-grid two-up">
        <div class="architecture-node">DbProvider</div>
        <div class="architecture-node">Tenant Resolution</div>
      </div>
    </div>

    <div class="architecture-connector"><span></span></div>

    <!-- Client -->
    <div class="architecture-band architecture-band-client">
      <span class="architecture-band-label">Client Layer</span>
      <div class="architecture-band-grid single">
        <div class="architecture-node architecture-node-featured">
          AmbitenClient (driver bridge, connection, session management)
        </div>
      </div>
    </div>

    <div class="architecture-connector"><span></span></div>

    <!-- Infrastructure -->
    <div class="architecture-band architecture-band-db">
      <span class="architecture-band-label">Infrastructure Layer</span>
      <div class="architecture-band-grid single">
        <div class="architecture-node architecture-node-featured">
          MongoDB Driver, Databases, Collections, Cluster Topology
        </div>
      </div>
    </div>
  </div>
</template>