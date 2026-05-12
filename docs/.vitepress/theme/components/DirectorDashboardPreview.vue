<template>
  <section class="director-dashboard-preview" aria-label="Director observability dashboard preview">
    <div class="director-dashboard-shell">
      <header class="director-dashboard-topbar">
        <div>
          <span class="director-eyebrow">Director</span>
          <h3>Runtime observability by tenant</h3>
        </div>
        <div class="director-dashboard-window-controls" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </header>

      <div class="director-dashboard-kpis">
        <article>
          <span>p95 latency</span>
          <strong>184ms</strong>
          <small>+12ms from yesterday</small>
        </article>
        <article>
          <span>unscoped queries</span>
          <strong>7</strong>
          <small>tenantId missing</small>
        </article>
        <article>
          <span>rollback rate</span>
          <strong>2.8%</strong>
          <small>3 tenants elevated</small>
        </article>
      </div>

      <div class="director-dashboard-main">
        <article class="director-heatmap-card">
          <div class="director-card-head">
            <span class="director-eyebrow">Tenant Heatmap</span>
            <strong>Database latency cost</strong>
          </div>
          <div class="director-heatmap-grid" aria-label="Tenant latency heatmap">
            <span class="level-1"></span>
            <span class="level-2"></span>
            <span class="level-3"></span>
            <span class="level-2"></span>
            <span class="level-4"></span>
            <span class="level-3"></span>
            <span class="level-1"></span>
            <span class="level-5"></span>
            <span class="level-2"></span>
            <span class="level-4"></span>
            <span class="level-1"></span>
            <span class="level-3"></span>
            <span class="level-2"></span>
            <span class="level-5"></span>
            <span class="level-4"></span>
            <span class="level-1"></span>
            <span class="level-3"></span>
            <span class="level-2"></span>
          </div>
          <div class="director-tenant-list">
            <div>
              <span>acme-enterprise</span>
              <strong>412ms p95</strong>
            </div>
            <div>
              <span>northwind</span>
              <strong>287ms p95</strong>
            </div>
            <div>
              <span>atlas-labs</span>
              <strong>231ms p95</strong>
            </div>
          </div>
        </article>

        <article class="director-alert-card">
          <div class="director-card-head">
            <span class="director-eyebrow">Leak Detection</span>
            <strong>Queries without tenant scope</strong>
          </div>
          <div class="director-alert-row is-critical">
            <span>findMany</span>
            <strong>users</strong>
            <small>missing tenantId</small>
          </div>
          <div class="director-alert-row">
            <span>aggregate</span>
            <strong>invoices</strong>
            <small>system scope pending review</small>
          </div>
          <div class="director-alert-row">
            <span>updateOne</span>
            <strong>settings</strong>
            <small>admin path</small>
          </div>
        </article>
      </div>

      <div class="director-rollback-card">
        <div class="director-card-head">
          <span class="director-eyebrow">Transaction Integrity</span>
          <strong>Rollback rate by tenant</strong>
        </div>
        <div class="director-bars">
          <div style="--bar-value: 72%">
            <span>acme-enterprise</span>
            <b></b>
            <strong>5.4%</strong>
          </div>
          <div style="--bar-value: 46%">
            <span>northwind</span>
            <b></b>
            <strong>3.1%</strong>
          </div>
          <div style="--bar-value: 24%">
            <span>atlas-labs</span>
            <b></b>
            <strong>1.6%</strong>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
