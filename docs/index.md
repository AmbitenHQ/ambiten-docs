---
layout: home
aside: false
---

<div class="vp-doc Ambiten-alt-home">
<HomepageSpiritOverlay />
<div class="ambiten-home-watermark" aria-hidden="true"></div>
<section class="ambiten-alt-hero">
  <article class="ambiten-alt-hero-copy">
    <span class="ambiten-alt-kicker">Ambiten Runtime</span>
    <h1>Context-aware MongoDB execution for multi-tenant systems.</h1>
    <p class="ambiten-alt-manifesto">
      Resolve context once. Execute safely everywhere.
    </p>
    <p class="ambiten-alt-positioning">
      Ambiten turns MongoDB data access into a runtime layer for tenant-aware,
      transaction-safe, observable applications.
    </p>
    <p class="ambiten-alt-lead">
      Ambiten is a framework-agnostic data runtime for teams building serious MongoDB systems.
      Tenant identity, request metadata, transaction scope, provider resolution, middleware, and observability move through the application automatically instead of being manually passed from one service to another.
    </p>
    <div class="ambiten-alt-actions">
      <a class="ambiten-alt-action primary" href="/getting-started/one-request-flow">See One Request Flow</a>
      <a class="ambiten-alt-action secondary" href="/getting-started/introduction">Start With Ambiten</a>
      <a class="ambiten-alt-action tertiary" href="/operations/director">Explore Director</a>
    </div>
    <div class="ambiten-alt-proof">
      <div>
        <strong>Context-native</strong>
        <span>Tenant, request, database, and session state follow execution automatically.</span>
      </div>
      <div>
        <strong>Runtime-safe</strong>
        <span>Models participate in context, middleware, transactions, and provider-based resolution.</span>
      </div>
      <div>
        <strong>Adapter-driven</strong>
        <span>The same runtime layer can serve Express, Fastify, NestJS, GraphQL, Lambda, and jobs.</span>
      </div>
    </div>
  </article>

  <aside class="ambiten-alt-hero-visual">
    <img class="ambiten-alt-spirit-hero" src="/ambiten_brand/ambiten-spirit-premium.svg" alt="" aria-hidden="true" />
    <div class="ambiten-alt-orbit">
      <div class="ambiten-alt-orbit-ring ambiten-alt-ring-b"></div>
      <div class="ambiten-alt-orbit-ring ambiten-alt-ring-a"></div>
      <div class="ambiten-alt-orbit-core">
        <img class="ambiten-orbit-mark ambiten-orbit-mark-light" src="/ambiten_brand/ambiten-mark-192x192.svg" alt="Ambiten" />
        <img class="ambiten-orbit-mark ambiten-orbit-mark-dark" src="/ambiten_brand/ambiten-mark-192x192.svg" alt="" aria-hidden="true" />
      </div>
      <span class="ambiten-alt-node ambiten-alt-node-a"><span>Context</span></span>
      <span class="ambiten-alt-node ambiten-alt-node-b"><span>Adapters</span></span>
      <span class="ambiten-alt-node ambiten-alt-node-c"><span>Transactions</span></span>
      <span class="ambiten-alt-node ambiten-alt-node-d"><span>Tenancy</span></span>
    </div>
  </aside>
</section>

<section class="ambiten-alt-runtime-band">
  <div class="ambiten-alt-runtime-copy">
    <span class="ambiten-alt-kicker">One Runtime Flow</span>
    <h2>A request enters once. Ambiten carries the execution state through the system.</h2>
    <p>
      In many MongoDB applications, the difficult part is not the database call itself.
      The difficult part is preserving the right execution state around that call:
      which tenant is active, which request triggered the operation, which database
      should be used, whether a transaction session exists, which middleware should run,
      and how the operation should be observed.
    </p>
    <p>
      Ambiten makes those concerns part of one runtime flow instead of leaving them as
      repeated plumbing across controllers, services, resolvers, jobs, and model calls.
    </p>
  </div>

  <div class="ambiten-alt-runtime-chain">
    <span>Request</span>
    <span>Adapter</span>
    <span>AmbitenContext</span>
    <span>AmbitenModel</span>
    <span>Provider</span>
    <span>MongoDB</span>
  </div>
</section>

<RuntimeAdapterGrid />

<section class="ambiten-director-home">
  <article class="ambiten-director-home-copy">
    <span class="ambiten-alt-kicker">Director Observability</span>
    <h2>Tenant-aware operations insight for the systems Ambiten powers.</h2>
    <p>
      Director is the first premium operations surface for Ambiten. It builds on the
      telemetry produced by <code>measureQuery</code> and turns runtime activity into
      operational insight: tenant heatmaps, unscoped query detection, rollback-rate
      analysis, latency patterns, and the early signals teams need before performance,
      cloud cost, or support load becomes painful.
    </p>
    <p>
      This is where Ambiten moves beyond model execution and becomes a foundation for
      operational governance. The same runtime that carries tenant and request context
      can also help teams understand how their data layer behaves in production.
    </p>
    <div class="ambiten-alt-actions">
      <a class="ambiten-alt-action primary" href="/operations/director">Open Director Docs</a>
      <a class="ambiten-alt-action secondary director-home-secondary" href="/core/instrumentation">View Instrumentation</a>
    </div>
  </article>
  <article class="ambiten-director-home-panel">
  <div class="ambiten-director-home-panel-head">
    <span>Runtime Signals</span>
    <strong>What Director is designed to surface</strong>
  </div>
  <div class="ambiten-director-signal-list">
    <div>
      <strong>Tenant pressure</strong>
      <span>Identify tenants creating unusual query volume, latency, or operational load.</span>
    </div>
    <div>
      <strong>Scope drift</strong>
      <span>Detect operations that execute without tenant, request, or policy context.</span>
    </div>
    <div>
      <strong>Transaction health</strong>
      <span>Observe rollback patterns, long-running sessions, and runtime failure signals.</span>
    </div>
  </div>
  <div class="ambiten-director-home-alerts">
    <span>tenant-aware telemetry</span>
    <span>query instrumentation</span>
    <span>runtime governance</span>
  </div>
</article>
</section>

<HomepageLoggerSection />

<section class="ambiten-alt-surface">
  <article class="ambiten-alt-surface-primary">
    <span class="ambiten-alt-kicker">Why Ambiten Exists</span>
    <h2>MongoDB applications become fragile when execution rules live everywhere.</h2>
    <p>
      Most teams can write CRUD operations. The harder problem appears as the application
      grows: tenant IDs are passed through too many layers, transactions depend on every
      nested call remembering the right session, policies are enforced inconsistently,
      and observability becomes incomplete because the model layer no longer knows enough
      about the request that triggered it.
    </p>
    <p>
      Ambiten addresses that problem by treating execution context as infrastructure.
      Models remain focused on data operations, while the runtime carries the state needed
      for isolation, consistency, instrumentation, and policy-aware execution.
    </p>
  </article>

  <article class="ambiten-alt-surface-code">
    <span class="ambiten-alt-kicker">Runtime Experience</span>
    <pre class="ambiten-alt-code-sample">
    <code>
    await AmbitenContext.withTransaction(async () =&gt; {
      const user = await UserModel.create({
        name: 'Amina',
        email: 'amina@team.io'
      });

      await AuditLogModel.create({
        action: 'USER_CREATED',
        userId: user._id
      });
    });
  </code>
  </pre>
    <p>
      The active tenant, transaction session, request metadata, middleware, and provider
      resolution are handled by the runtime. Application code stays focused on the
      workflow instead of repeating infrastructure concerns.
    </p>
  </article>
</section>

<section class="ambiten-alt-grid">
  <article class="ambiten-alt-card">
    <span class="ambiten-alt-kicker">Product Delivery</span>
    <h3>Keep feature code close to product intent.</h3>
    <p>
      Ambiten reduces the amount of infrastructure state that product teams need to carry
      through every workflow. The result is cleaner application code and fewer places
      where tenant or transaction handling can drift.
    </p>
  </article>

  <article class="ambiten-alt-card">
    <span class="ambiten-alt-kicker">Platform Discipline</span>
    <h3>Make isolation and consistency enforceable by design.</h3>
    <p>
      Multi-tenancy, transaction continuity, middleware, soft delete, auditing, and
      instrumentation become runtime capabilities rather than conventions every engineer
      must remember manually.
    </p>
  </article>

  <article class="ambiten-alt-card">
    <span class="ambiten-alt-kicker">Runtime Portability</span>
    <h3>Use one data layer across many execution environments.</h3>
    <p>
      Ambiten’s adapter model allows the same models and runtime contracts to work behind
      REST APIs, GraphQL resolvers, NestJS services, Lambda handlers, and background jobs.
    </p>
  </article>
</section>

<section class="ambiten-alt-comparison">
  <div class="ambiten-alt-comparison-head">
    <span class="ambiten-alt-kicker">Capability Surface</span>
    <h2>What Ambiten adds beyond ordinary ODM-style model execution.</h2>
    <p>
      Ambiten is not only concerned with how documents are created, read, updated, or deleted.
      Its value is in the execution environment around those operations: context propagation,
      provider resolution, lifecycle control, transaction continuity, adapter portability,
      and operational visibility.
    </p>
  </div>

  <div class="ambiten-alt-matrix">
    <div>
      <strong>Ambient execution state</strong>
      <span>Tenant, request, database, and session context remain available across async execution.</span>
    </div>
    <div>
      <strong>Adapter portability</strong>
      <span>Run the same runtime layer across Express, Fastify, NestJS, GraphQL, Lambda, and jobs.</span>
    </div>
    <div>
      <strong>Lifecycle control</strong>
      <span>Validation, auditing, soft delete, and policy hooks sit at the schema/model boundary.</span>
    </div>
    <div>
      <strong>Transaction continuity</strong>
      <span>Nested operations reuse the active session automatically when running inside a transaction.</span>
    </div>
    <div>
      <strong>Provider-based resolution</strong>
      <span>Models stay stable while the provider resolves database, client, and session per context.</span>
    </div>
    <div>
      <strong>Operational visibility</strong>
      <span>Logs and instrumentation can include tenant and request metadata without manual plumbing.</span>
    </div>
  </div>
</section>

<section class="ambiten-alt-footer-cta">
  <div>
    <span class="ambiten-alt-kicker">Explore The Runtime</span>
    <h2>Start with one request, then understand the system behind it.</h2>
    <p>
      Follow a request through adapters, context, models, providers, and MongoDB. From there,
      go deeper into multi-tenancy, transactions, middleware, instrumentation, and the
      operational governance layer Ambiten is designed to support.
    </p>
  </div>

  <div class="ambiten-alt-actions">
    <a class="ambiten-alt-action primary" href="/getting-started/one-request-flow">One Request Flow</a>
    <a class="ambiten-alt-action secondary" href="/architecture/whitepaper">Architecture</a>
  </div>
</section>

</div>
