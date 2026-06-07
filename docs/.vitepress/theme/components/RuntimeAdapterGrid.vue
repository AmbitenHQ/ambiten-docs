<template>
  <section class="ambiten-runtime-adapters" aria-labelledby="runtime-adapters-title">
    <div class="ambiten-runtime-adapters-head">
      <div>
        <span class="ambiten-alt-kicker">Supported Runtimes</span>
        <h2 id="runtime-adapters-title">Choose the adapter that matches where your app runs.</h2>
      </div>
    </div>

    <div class="ambiten-runtime-card-grid">
      <a class="ambiten-runtime-card runtime-express" href="/adapters/express">
        <span class="ambiten-runtime-card-icon">
          <img src="/runtime-logos/express.svg" alt="" />
        </span>
        <span class="ambiten-runtime-card-copy">
          <strong>Express</strong>
          <span>Middleware entry point for familiar Node.js services and REST APIs.</span>
        </span>
        <span class="ambiten-runtime-card-meta">Middleware</span>
      </a>

      <a class="ambiten-runtime-card runtime-fastify" href="/adapters/fastify">
        <span class="ambiten-runtime-card-icon">
          <img src="/runtime-logos/fastify.svg" alt="" />
        </span>
        <span class="ambiten-runtime-card-copy">
          <strong>Fastify</strong>
          <span>Hook-driven integration for high-throughput APIs with request-scoped context.</span>
        </span>
        <span class="ambiten-runtime-card-meta">preHandler</span>
      </a>

      <a class="ambiten-runtime-card runtime-nestjs" href="/adapters/nestjs">
        <span class="ambiten-runtime-card-icon">
          <img src="/runtime-logos/nestjs.svg" alt="" />
        </span>
        <span class="ambiten-runtime-card-copy">
          <strong>NestJS</strong>
          <span>Module and interceptor wiring for structured applications with clear boundaries.</span>
        </span>
        <span class="ambiten-runtime-card-meta">Module</span>
      </a>

      <a class="ambiten-runtime-card runtime-graphql" href="/adapters/graphql">
        <span class="ambiten-runtime-card-icon">
          <img src="/runtime-logos/graphql.svg" alt="" />
        </span>
        <span class="ambiten-runtime-card-copy">
          <strong>GraphQL</strong>
          <span>Context factory support for resolver-based execution and schema-first APIs.</span>
        </span>
        <span class="ambiten-runtime-card-meta">Resolvers</span>
      </a>

      <a class="ambiten-runtime-card runtime-lambda" href="/adapters/lambda">
        <span class="ambiten-runtime-card-icon">
          <img src="/runtime-logos/awslambda.svg" alt="" />
        </span>
        <span class="ambiten-runtime-card-copy">
          <strong>AWS Lambda</strong>
          <span>Wrapped handlers for serverless, event-driven, and scheduled workloads.</span>
        </span>
        <span class="ambiten-runtime-card-meta">Handler</span>
      </a>
    </div>
  </section>
</template>
