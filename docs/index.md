---
layout: home
aside: false
title: Ambiten — Open-source MongoDB runtime
description: Open-source Node.js runtime for multi-tenant MongoDB applications, execution context, and transaction continuity.
---

<div class="vp-doc Ambiten-alt-home">
<div class="ambiten-home-watermark" aria-hidden="true"></div>

<section class="ambiten-alt-hero">
  <article class="ambiten-alt-hero-copy">
    <span class="ambiten-alt-kicker">Ambiten · Open-source Node.js infrastructure</span>
    <h1>An open-source runtime for multi-tenant Node.js and MongoDB applications.</h1>
    <p class="ambiten-alt-manifesto">
      Keep execution context consistent as your application grows.
    </p>
    <p class="ambiten-alt-positioning"> 
      Building a backend where tenant identity, database scope, request metadata,
      and transaction sessions must travel across services? Ambiten provides a
      defined execution context so participating MongoDB operations can use
      the appropriate state without passing it manually through every layer.
    </p>
    <p class="ambiten-alt-lead">
      Ambiten runs inside your Node.js application, on top of the official
      MongoDB driver. It coordinates context, models, transaction participation,
      adapters, middleware, and instrumentation. It is not a hosted database or
      a paid MongoDB aggregation feature.
    </p>
    <p class="ambiten-alt-availability">
      <strong>Free and open source.</strong>
      <code>npm install @ambiten/core</code>
    </p>
    <div class="ambiten-alt-actions">
      <a class="ambiten-alt-action primary" href="/getting-started/installation">
        Install Ambiten
      </a>
      <a class="ambiten-alt-action secondary" href="/getting-started/one-request-flow">
        See One Request Flow
      </a>
      <a class="ambiten-alt-action tertiary" href="/getting-started/introduction">
        What is Ambiten?
      </a>
    </div>
    <div class="ambiten-alt-proof">
      <div>
        <strong>Who it is for</strong>
        <span>Node.js teams building multi-tenant APIs, services, and background work with MongoDB.</span>
      </div>
      <div>
        <strong>What it solves</strong>
        <span>Repeated hand-offs of tenant, request, database, and transaction state across application layers.</span>
      </div>
      <div>
        <strong>How to adopt it</strong>
        <span>Start with the core runtime; add models and framework adapters when your application needs them.</span>
      </div>
    </div>
  </article>

  <aside class="ambiten-alt-hero-visual">
    <img
      class="ambiten-alt-spirit-hero"
      src="/ambiten_brand/ambiten-spirit-premium.svg"
      alt=""
      aria-hidden="true"
    />
    <div class="ambiten-alt-orbit">
      <div class="ambiten-alt-orbit-ring ambiten-alt-ring-b"></div>
      <div class="ambiten-alt-orbit-ring ambiten-alt-ring-a"></div>
      <div class="ambiten-alt-orbit-core">
        <img class="ambiten-orbit-mark ambiten-orbit-mark-light"
          src="/ambiten_brand/ambiten-wordmark-light.png" alt="Ambiten" />
        <img class="ambiten-orbit-mark ambiten-orbit-mark-dark"
          src="/ambiten_brand/ambiten-wordmark-dark.png" alt="" aria-hidden="true" />
      </div>
      <span class="ambiten-alt-node ambiten-alt-node-a"><span>Context</span></span>
      <span class="ambiten-alt-node ambiten-alt-node-b"><span>Adapters</span></span>
      <span class="ambiten-alt-node ambiten-alt-node-c"><span>Transactions</span></span>
      <span class="ambiten-alt-node ambiten-alt-node-d"><span>Tenancy</span></span>
    </div>
  </aside>
</section>

<section class="ambiten-alt-surface" id="when-to-use-ambiten">
  <article class="ambiten-alt-surface-primary">
    <span class="ambiten-alt-kicker">When Ambiten Helps</span>
    <h2>MongoDB operations are easy to write. Coordinating what surrounds them is harder.</h2>
    <p>
      Imagine an API request that creates a record, writes an audit event, and
      updates another collection. Every operation needs the correct tenant and,
      inside a transaction, the same active MongoDB session. As an application
      grows, repeatedly passing that state through controllers and services
      becomes an additional responsibility to maintain.
    </p>
    <p>
      Ambiten establishes an execution boundary for the runtime state those
      participating operations share. You decide where that boundary starts;
      the runtime helps carry the associated context through supported flows.
    </p>
  </article>
  <article class="ambiten-alt-surface-code">
    <span class="ambiten-alt-kicker">When You May Not Need It</span>
    <h3>Simple applications can stay simple.</h3>
    <p>
      If your application only performs a few straightforward MongoDB queries,
      the official driver may be enough. Ambiten is most relevant when
      multi-tenancy, transaction continuity, framework integration, and
      operational context become recurring concerns.
    </p>
    <p>
      <a href="/getting-started/one-request-flow">See the complete request flow →</a>
    </p>
  </article>
</section>

<section class="ambiten-alt-runtime-band">
  <div class="ambiten-alt-runtime-copy">
    <span class="ambiten-alt-kicker">One Runtime Flow</span>
    <h2>
      From an incoming request to MongoDB, keep the execution state together.
    </h2>
    <p>
      In many MongoDB applications, the difficult part is not the database call
      itself. The difficult part is preserving the execution state around that
      call: which tenant is active, which request or job initiated the work,
      which database should be used, whether a transaction session exists, which
      middleware participates, and what runtime metadata should be available to
      instrumentation.
    </p>
    <p>
      Ambiten gives those concerns a defined execution path instead of leaving
      them as repeated plumbing across controllers, services, resolvers,
      background jobs, and model calls.
    </p>
  </div>

  <div class="ambiten-alt-runtime-chain">
    <span>Execution Boundary</span>
    <span>AmbitenContext</span>
    <span>AmbitenModel</span>
    <span>Effective ModelContext</span>
    <span>Schema / Middleware</span>
    <span>Infrastructure</span>
    <span>MongoDB</span>
  </div>
</section>

<RuntimeAdapterGrid />

<section class="ambiten-director-home">
  <article class="ambiten-director-home-copy">
    <span class="ambiten-alt-kicker">Director Observability</span>
    <h2>
      Execution-level operational insight for the systems Ambiten powers.
    </h2>
    <p>
      Director is the planned operational intelligence layer for Ambiten. It is
      designed to build on structured runtime telemetry and turn execution
      signals into views around tenant activity, execution scope, transaction
      outcomes, runtime budgets, latency patterns, and operational behavior.
    </p>
    <p>
      Director is a planned preview, not a currently available paid product.
      Ambiten Core provides
      the execution model and runtime metadata; instrumentation exposes the
      signals; Director is designed to correlate and present those signals in a
      form teams can investigate and act on.
    </p>
    <div class="ambiten-alt-actions">
      <a
        class="ambiten-alt-action primary"
        href="/operations/director"
      >
        Open Director Preview
      </a>
      <a
        class="ambiten-alt-action secondary director-home-secondary"
        href="/core/instrumentation"
      >
        View Instrumentation
      </a>
    </div>
  </article>

  <article class="ambiten-director-home-panel">
    <div class="ambiten-director-home-panel-head">
      <span>Runtime Signals</span>
      <strong>What Director is designed to surface</strong>
    </div>
    <div class="ambiten-director-signal-list">
      <div>
        <strong>Tenant activity</strong>
        <span>
          Compare query volume, latency, runtime budgets, and operational
          patterns across tenant workloads.
        </span>
      </div>
      <div>
        <strong>Scope visibility</strong>
        <span>
          Surface operations without expected tenant or execution identity so
          teams can distinguish intentional system work from unexpected runtime
          behavior.
        </span>
      </div>
      <div>
        <strong>Transaction diagnostics</strong>
        <span>
          Observe transaction outcomes, abort patterns, durations, and runtime
          failure signals where corresponding telemetry is available.
        </span>
      </div>
    </div>
    <div class="ambiten-director-home-alerts">
      <span>execution telemetry</span>
      <span>query instrumentation</span>
      <span>runtime insight</span>
    </div>
  </article>
</section>
<HomepageLoggerSection />
<section class="ambiten-alt-surface">
  <article class="ambiten-alt-surface-primary">
    <span class="ambiten-alt-kicker">Why Ambiten Exists</span>
    <h2>
      MongoDB applications become harder to reason about when execution state
      lives everywhere.
    </h2>
    <p>
      Most teams can write CRUD operations. The harder problem appears as the
      application grows: tenant identity moves through too many layers,
      transactions depend on nested calls receiving the right session, database
      scope is reconstructed in different places, and instrumentation loses the
      execution information needed to explain what happened.
    </p>
    <p>
      Ambiten addresses that problem by giving execution state a defined runtime
      path. Models remain focused on persistence operations while context,
      middleware, provider infrastructure, transaction sessions, and runtime
      metadata participate around them through explicit responsibilities.
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
      Participating Ambiten model operations can inherit the active transaction
      session through the execution context. Tenant identity, request metadata,
      and other execution state can also be inherited when they have been
      established by the surrounding runtime.
    </p>
  </article>
</section>

<section class="ambiten-alt-grid">
  <article class="ambiten-alt-card">
    <span class="ambiten-alt-kicker">Product Delivery</span>
    <h3>Keep feature code focused on application intent.</h3>
    <p>
      Ambiten reduces the amount of execution state that application code must
      manually carry through every workflow. Context belongs to the runtime,
      persistence state belongs to the model operation, and infrastructure
      resolution stays behind defined provider boundaries.
    </p>
  </article>

  <article class="ambiten-alt-card">
    <span class="ambiten-alt-kicker">Platform Discipline</span>
    <h3>Give runtime responsibilities explicit owners.</h3>
    <p>
      Context propagation, transaction participation, tenant-aware infrastructure,
      middleware, lifecycle behavior, and instrumentation each have defined
      places in the runtime instead of depending entirely on conventions repeated
      across application code.
    </p>
  </article>

  <article class="ambiten-alt-card">
    <span class="ambiten-alt-kicker">Runtime Portability</span>
    <h3>Use one persistence model across different execution environments.</h3>
    <p>
      Ambiten's adapter model allows the same application and persistence layer
      to participate behind REST APIs, GraphQL resolvers, NestJS services,
      Lambda handlers, background workers, and explicit runtime boundaries.
    </p>
  </article>
</section>

<section class="ambiten-alt-comparison">
  <div class="ambiten-alt-comparison-head">
    <span class="ambiten-alt-kicker">Capability Surface</span>
    <h2>
      What Ambiten adds around ordinary MongoDB data access.
    </h2>
    <p>
      Ambiten is not only concerned with how documents are created, read,
      updated, or deleted. Its value is in the execution model around those
      operations: context propagation, model binding, provider resolution,
      transaction participation, framework integration, tenant-aware
      infrastructure, and operational metadata.
    </p>
  </div>

  <div class="ambiten-alt-matrix">
    <div>
      <strong>Execution-scoped state</strong>
      <span>
        Tenant, request, database, session, and runtime metadata can remain
        available across asynchronous execution through AmbitenContext.
      </span>
    </div>
    <div>
      <strong>Progressive adoption</strong>
      <span>
        Start directly with AmbitenClient, then add models, context, adapters,
        multi-tenancy, and transaction boundaries as application requirements
        grow.
      </span>
    </div>
    <div>
      <strong>Adapter portability</strong>
      <span>
        Establish the same runtime model across Express, Fastify, NestJS,
        GraphQL, Lambda, workers, and explicit execution flows.
      </span>
    </div>
    <div>
      <strong>Transaction participation</strong>
      <span>
        Participating operations can inherit the active MongoDB session when
        executed inside a compatible transaction boundary.
      </span>
    </div>
    <div>
      <strong>Provider-based resolution</strong>
      <span>
        Models retain their collection boundary while provider infrastructure
        resolves the database, MongoDB client, and active session required by
        the operation.
      </span>
    </div>
    <div>
      <strong>Operational visibility</strong>
      <span>
        Instrumentation can consume tenant, request, operation, and runtime
        metadata without requiring every application layer to reconstruct it.
      </span>
    </div>
  </div>
</section>

<section class="ambiten-alt-footer-cta">
  <div>
    <span class="ambiten-alt-kicker">Explore The Runtime</span>
    <h2>
      Start with one execution, then understand the system behind it.
    </h2>
    <p>
      Follow execution through adapters, context, model binding, middleware,
      infrastructure resolution, and MongoDB. From there, go deeper into
      multi-tenancy, transactions, instrumentation, deployment, and the
      operational intelligence Ambiten is designed to support.
    </p>
  </div>
  <div class="ambiten-alt-actions">
    <a
      class="ambiten-alt-action primary"
      href="/getting-started/one-request-flow"
    >
      One Request Flow
    </a>
    <a
      class="ambiten-alt-action secondary"
      href="/architecture/whitepaper"
    >
      Architecture
    </a>
  </div>
</section>
<nav class="ambiten-alt-actions" aria-label="Legal information and operator" style="justify-content: center; margin-top: 2rem; margin-bottom: 1rem;">
  <a class="ambiten-alt-action tertiary" href="/impressum">Impressum</a>
  <a class="ambiten-alt-action tertiary" href="/privacy">Privacy</a>
  <a class="ambiten-alt-action tertiary" href="https://www.abinod.com/">Maintained by Abinod</a>
</nav>
</div>

