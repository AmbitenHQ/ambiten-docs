<template>
  <div class="provider-contract-principles">
    <div class="provider-contract-principles-card">
      <span class="provider-contract-principles-eyebrow">Design Principles</span>
      <div class="provider-contract-principles-grid">
        <div class="provider-contract-principle">
          <strong>Separation of concerns</strong>
          <p>Infrastructure resolution is isolated from model execution.</p>
        </div>
        <div class="provider-contract-principle">
          <strong>Context-driven behavior</strong>
          <p>All resolution is based on ModelContext, not global state.</p>
        </div>
        <div class="provider-contract-principle">
          <strong>Flexibility</strong>
          <p>The same model can operate across different environments and tenants without modification.</p>
        </div>
        <div class="provider-contract-principle">
          <strong>Stability</strong>
          <p>Model definitions remain static while infrastructure resolution remains dynamic.</p>
        </div>
      </div>
    </div>
  </div>
</template>
