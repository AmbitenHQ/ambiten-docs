---
layout: home
aside: false
---

<div class="vp-doc tenra-alt-home">
<section class="tenra-alt-hero">
  <article class="tenra-alt-hero-copy">
    <span class="tenra-alt-kicker">Tenra Runtime</span>
    <h1>Context-aware MongoDB execution for multi-tenant systems.</h1>
    <p class="tenra-alt-manifesto">
      Resolve context once. Execute safely everywhere.
    </p>
    <p class="tenra-alt-positioning">
      Tenra turns MongoDB data access into a runtime layer for tenant-aware,
      transaction-safe, observable applications.
    </p>
    <p class="tenra-alt-lead">
      Tenra is a framework-agnostic data runtime for teams building serious MongoDB
      systems where tenant identity, request metadata, transaction scope, provider
      resolution, middleware, and observability need to move through the application
      without being manually passed from one service to another.
    </p>
    <div class="tenra-alt-actions">
      <a class="tenra-alt-action primary" href="/getting-started/one-request-flow">See One Request Flow</a>
      <a class="tenra-alt-action secondary" href="/getting-started/introduction">Start With Tenra</a>
      <a class="tenra-alt-action tertiary" href="/operations/director">Explore Director</a>
    </div>
    <div class="tenra-alt-proof">
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

  <aside class="tenra-alt-hero-visual">
    <div class="tenra-alt-orbit">
      <div class="tenra-alt-orbit-ring tenra-alt-ring-b"></div>
      <div class="tenra-alt-orbit-ring tenra-alt-ring-a"></div>
      <div class="tenra-alt-orbit-core">
        <img src="/tenra_svg_refinement_v2/tenra-logo-mark-dark.svg" alt="Tenra" />
      </div>
      <span class="tenra-alt-node tenra-alt-node-a"><span>Context</span></span>
      <span class="tenra-alt-node tenra-alt-node-b"><span>Adapters</span></span>
      <span class="tenra-alt-node tenra-alt-node-c"><span>Transactions</span></span>
      <span class="tenra-alt-node tenra-alt-node-d"><span>Tenancy</span></span>
    </div>
  </aside>
</section>

<section class="tenra-alt-runtime-band">
  <div class="tenra-alt-runtime-copy">
    <span class="tenra-alt-kicker">One Runtime Flow</span>
    <h2>A request enters once. Tenra carries the execution state through the system.</h2>
    <p>
      In many MongoDB applications, the difficult part is not the database call itself.
      The difficult part is preserving the right execution state around that call:
      which tenant is active, which request triggered the operation, which database
      should be used, whether a transaction session exists, which middleware should run,
      and how the operation should be observed.
    </p>
    <p>
      Tenra makes those concerns part of one runtime flow instead of leaving them as
      repeated plumbing across controllers, services, resolvers, jobs, and model calls.
    </p>
  </div>

  <div class="tenra-alt-runtime-chain">
    <span>Request</span>
    <span>Adapter</span>
    <span>TenraContext</span>
    <span>TenraModel</span>
    <span>Provider</span>
    <span>MongoDB</span>
  </div>
</section>

<RuntimeAdapterGrid />

<section class="tenra-director-home">
  <article class="tenra-director-home-copy">
    <span class="tenra-alt-kicker">Director Observability</span>
    <h2>Tenant-aware operations insight for the systems Tenra powers.</h2>
    <p>
      Director is the first premium operations surface for Tenra. It builds on the
      telemetry produced by <code>measureQuery</code> and turns runtime activity into
      operational insight: tenant heatmaps, unscoped query detection, rollback-rate
      analysis, latency patterns, and the early signals teams need before performance,
      cloud cost, or support load becomes painful.
    </p>
    <p>
      This is where Tenra moves beyond model execution and becomes a foundation for
      operational governance. The same runtime that carries tenant and request context
      can also help teams understand how their data layer behaves in production.
    </p>
    <div class="tenra-alt-actions">
      <a class="tenra-alt-action primary" href="/operations/director">Open Director Docs</a>
      <a class="tenra-alt-action secondary director-home-secondary" href="/core/instrumentation">View Instrumentation</a>
    </div>
  </article>

  <article class="tenra-director-home-panel">
    <div class="tenra-director-home-panel-head">
      <span>Tenant Heatmap</span>
      <strong>p95 latency by account</strong>
    </div>
    <div class="tenra-director-home-bars">
      <div style="--director-home-bar: 86%">
        <span>acme-enterprise</span>
        <b></b>
        <strong>412ms</strong>
      </div>
      <div style="--director-home-bar: 58%">
        <span>northwind</span>
        <b></b>
        <strong>287ms</strong>
      </div>
      <div style="--director-home-bar: 34%">
        <span>atlas-labs</span>
        <b></b>
        <strong>184ms</strong>
      </div>
    </div>
    <div class="tenra-director-home-alerts">
      <span>7 unscoped queries</span>
      <span>2.8% rollback rate</span>
      <span>3 tenants elevated</span>
    </div>
  </article>
</section>

<section class="tenra-alt-surface">
  <article class="tenra-alt-surface-primary">
    <span class="tenra-alt-kicker">Why Tenra Exists</span>
    <h2>MongoDB applications become fragile when execution rules live everywhere.</h2>
    <p>
      Most teams can write CRUD operations. The harder problem appears as the application
      grows: tenant IDs are passed through too many layers, transactions depend on every
      nested call remembering the right session, policies are enforced inconsistently,
      and observability becomes incomplete because the model layer no longer knows enough
      about the request that triggered it.
    </p>
    <p>
      Tenra addresses that problem by treating execution context as infrastructure.
      Models remain focused on data operations, while the runtime carries the state needed
      for isolation, consistency, instrumentation, and policy-aware execution.
    </p>
  </article>

  <article class="tenra-alt-surface-code">
    <span class="tenra-alt-kicker">Runtime Experience</span>
    <pre class="tenra-alt-code-sample">
    <code>
    await TenraContext.withTransaction(async () =&gt; {
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

<section class="tenra-alt-grid">
  <article class="tenra-alt-card">
    <span class="tenra-alt-kicker">Product Delivery</span>
    <h3>Keep feature code close to product intent.</h3>
    <p>
      Tenra reduces the amount of infrastructure state that product teams need to carry
      through every workflow. The result is cleaner application code and fewer places
      where tenant or transaction handling can drift.
    </p>
  </article>

  <article class="tenra-alt-card">
    <span class="tenra-alt-kicker">Platform Discipline</span>
    <h3>Make isolation and consistency enforceable by design.</h3>
    <p>
      Multi-tenancy, transaction continuity, middleware, soft delete, auditing, and
      instrumentation become runtime capabilities rather than conventions every engineer
      must remember manually.
    </p>
  </article>

  <article class="tenra-alt-card">
    <span class="tenra-alt-kicker">Runtime Portability</span>
    <h3>Use one data layer across many execution environments.</h3>
    <p>
      Tenra’s adapter model allows the same models and runtime contracts to work behind
      REST APIs, GraphQL resolvers, NestJS services, Lambda handlers, and background jobs.
    </p>
  </article>
</section>

<section class="tenra-alt-comparison">
  <div class="tenra-alt-comparison-head">
    <span class="tenra-alt-kicker">Capability Surface</span>
    <h2>What Tenra adds beyond ordinary ODM-style model execution.</h2>
    <p>
      Tenra is not only concerned with how documents are created, read, updated, or deleted.
      Its value is in the execution environment around those operations: context propagation,
      provider resolution, lifecycle control, transaction continuity, adapter portability,
      and operational visibility.
    </p>
  </div>

  <div class="tenra-alt-matrix">
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

<section class="tenra-alt-footer-cta">
  <div>
    <span class="tenra-alt-kicker">Explore The Runtime</span>
    <h2>Start with one request, then understand the system behind it.</h2>
    <p>
      Follow a request through adapters, context, models, providers, and MongoDB. From there,
      go deeper into multi-tenancy, transactions, middleware, instrumentation, and the
      operational governance layer Tenra is designed to support.
    </p>
  </div>

  <div class="tenra-alt-actions">
    <a class="tenra-alt-action primary" href="/getting-started/one-request-flow">One Request Flow</a>
    <a class="tenra-alt-action secondary" href="/architecture/whitepaper">Architecture</a>
  </div>
</section>

</div>



<!-- ---
layout: home
aside: false
---

<div class="vp-doc tenra-alt-home">

<section class="tenra-alt-hero">
  <article class="tenra-alt-hero-copy">
    <span class="tenra-alt-kicker">Tenra Runtime</span>
    <h1>Context-aware MongoDB execution for multi-tenant systems.</h1>
    <p class="tenra-alt-manifesto">
      Resolve context once. Execute safely everywhere.
    </p>
    <p class="tenra-alt-positioning">
      Tenra turns MongoDB from a data store into a runtime system.
    </p>
    <p class="tenra-alt-lead">
      Tenra is a framework-agnostic data runtime for teams building tenant-aware,
      transaction-safe MongoDB applications without scattering infrastructure concerns
      across services, handlers, and model calls.
    </p>
    <div class="tenra-alt-actions">
    <a class="tenra-alt-action primary" href="/getting-started/one-request-flow">See One Request Flow</a>
    <a class="tenra-alt-action secondary" href="/getting-started/introduction">Start With Tenra</a>
    <a class="tenra-alt-action tertiary" href="/operations/director">Explore Director</a>
    </div>
    <div class="tenra-alt-proof">
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
        <span>The same runtime layer works across Express, Fastify, NestJS, GraphQL, and Lambda.</span>
      </div>
    </div>
  </article>

  <aside class="tenra-alt-hero-visual">
    <div class="tenra-alt-orbit">
      <div class="tenra-alt-orbit-ring tenra-alt-ring-b"></div>
      <div class="tenra-alt-orbit-ring tenra-alt-ring-a"></div>
      <div class="tenra-alt-orbit-core">
        <img src="/tenra_svg_refinement_v2/tenra-logo-mark-dark.svg" alt="Tenra" />
      </div>
      <span class="tenra-alt-node tenra-alt-node-a">Context</span>
      <span class="tenra-alt-node tenra-alt-node-b">Adapters</span>
      <span class="tenra-alt-node tenra-alt-node-c">Transactions</span>
      <span class="tenra-alt-node tenra-alt-node-d">Tenancy</span>
    </div>
  </aside>
</section>

<section class="tenra-alt-runtime-band">
  <div class="tenra-alt-runtime-copy">
    <span class="tenra-alt-kicker">One Runtime Flow</span>
    <h2>A request enters once. Tenra carries the execution state through the system.</h2>
    <p>
      Tenra centralizes the runtime concerns that usually make MongoDB applications hard to scale:
      tenant resolution, request metadata, transaction scope, middleware enforcement, provider resolution,
      and observability.
    </p>
  </div>
  <div class="tenra-alt-runtime-chain">
    <span>Request</span>
    <span>Adapter</span>
    <span>TenraContext</span>
    <span>TenraModel</span>
    <span>Provider</span>
    <span>MongoDB</span>
  </div>
</section>

<RuntimeAdapterGrid />

<section class="tenra-director-home">
  <article class="tenra-director-home-copy">
    <span class="tenra-alt-kicker">Director Observability</span>
    <h2>Turn runtime telemetry into tenant-aware operations insight.</h2>
    <p>
      Director is the first premium operations surface for Tenra. It consumes
      instrumentation from <code>measureQuery</code> and shows tenant heatmaps,
      unscoped query detection, rollback-rate analysis, and the signals teams need
      before cloud cost or support load becomes painful.
    </p>
    <div class="tenra-alt-actions">
      <a class="tenra-alt-action primary" href="/operations/director">Open Director Docs</a>
      <a class="tenra-alt-action secondary director-home-secondary" href="/core/instrumentation">View Instrumentation</a>
    </div>
  </article>

  <article class="tenra-director-home-panel">
    <div class="tenra-director-home-panel-head">
      <span>Tenant Heatmap</span>
      <strong>p95 latency by account</strong>
    </div>
    <div class="tenra-director-home-bars">
      <div style="--director-home-bar: 86%">
        <span>acme-enterprise</span>
        <b></b>
        <strong>412ms</strong>
      </div>
      <div style="--director-home-bar: 58%">
        <span>northwind</span>
        <b></b>
        <strong>287ms</strong>
      </div>
      <div style="--director-home-bar: 34%">
        <span>atlas-labs</span>
        <b></b>
        <strong>184ms</strong>
      </div>
    </div>
    <div class="tenra-director-home-alerts">
      <span>7 unscoped queries</span>
      <span>2.8% rollback rate</span>
      <span>3 tenants elevated</span>
    </div>
  </article>
</section>

<section class="tenra-alt-surface">
  <article class="tenra-alt-surface-primary">
    <span class="tenra-alt-kicker">Why It Matters</span>
    <h2>Tenra removes the infrastructure repetition that makes runtime layers fragile.</h2>
    <p>
      Most teams do not struggle with CRUD itself. They struggle with what surrounds it:
      passing tenant IDs, preserving sessions, enforcing policies, keeping request metadata available,
      and making the same model code work across different runtimes.
    </p>
    <ul class="tenra-alt-list">
      <li>Write models once and keep them portable across runtimes.</li>
      <li>Resolve tenant, request, database, and session state through the runtime.</li>
      <li>Apply middleware, observability, and policy controls at the model lifecycle boundary.</li>
      <li>Use explicit infrastructure contracts without turning services into plumbing layers.</li>
    </ul>
  </article>

  <article class="tenra-alt-surface-code">
    <span class="tenra-alt-kicker">Runtime Experience</span>
    <div class="tenra-alt-code-sample">
      <div>await TenraContext.withTransaction(async () =&gt; &#123;</div>
      <div>&nbsp;&nbsp;const user = await UserModel.create(&#123;</div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;name: 'Amina',</div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;email: 'amina@team.io'</div>
      <div>&nbsp;&nbsp;&#125;);</div>
      <div></div>
      <div>&nbsp;&nbsp;await AuditLogModel.create(&#123;</div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;action: 'USER_CREATED',</div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;userId: user._id</div>
      <div>&nbsp;&nbsp;&#125;);</div>
      <div>&#125;);</div>
    </div>
    <p>
      The active tenant, session, request metadata, middleware, and provider resolution are handled by
      the runtime. Application code stays focused on the workflow.
    </p>
  </article>
</section>

<section class="tenra-alt-grid">
  <article class="tenra-alt-card">
    <span class="tenra-alt-kicker">For Product Teams</span>
    <h3>Keep feature code close to product intent.</h3>
    <p>
      Tenra keeps infrastructure state out of the hot path so teams can build workflows without
      manually threading tenant IDs, sessions, and database references everywhere.
    </p>
  </article>

  <article class="tenra-alt-card">
    <span class="tenra-alt-kicker">For Platform Teams</span>
    <h3>Make isolation and consistency enforceable by design.</h3>
    <p>
      Multi-tenancy, transaction propagation, soft delete, middleware, and instrumentation become
      runtime capabilities instead of conventions scattered across code.
    </p>
  </article>

  <article class="tenra-alt-card">
    <span class="tenra-alt-kicker">For Runtime Portability</span>
    <h3>Use one runtime layer across many execution environments.</h3>
    <p>
      Tenra’s adapter model allows the same models to run behind REST APIs, GraphQL resolvers,
      NestJS services, Lambda handlers, and background jobs.
    </p>
  </article>
</section>

<section class="tenra-alt-comparison">
  <div class="tenra-alt-comparison-head">
    <span class="tenra-alt-kicker">Capability Surface</span>
    <h2>What Tenra adds beyond ordinary ODM-style model execution.</h2>
  </div>
  <div class="tenra-alt-matrix">
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

<section class="tenra-alt-footer-cta">
  <div>
    <span class="tenra-alt-kicker">Explore The Runtime</span>
    <h2>Start with one request, then understand the system behind it.</h2>
    <p>
      See how a request flows through adapters, context, models, providers, and MongoDB—then go deeper
      into multi-tenancy, transactions, middleware, and runtime architecture.
    </p>
  </div>
  <div class="tenra-alt-actions">
    <a class="tenra-alt-action primary" href="/getting-started/one-request-flow">One Request Flow</a>
    <a class="tenra-alt-action secondary" href="/architecture/whitepaper">Architecture</a>
  </div>
</section>

</div> -->
