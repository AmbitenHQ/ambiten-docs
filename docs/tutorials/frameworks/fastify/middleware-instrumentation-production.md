# Middleware, Instrumentation & Production Notes

::: info Planned page
This is the fourth and final page of the Fastify framework track. Its detailed walkthrough will be added in a later brief. It builds on the [Tenant-Aware API](/tutorials/frameworks/fastify/tenant-aware-api) and [Transaction Continuity](/tutorials/frameworks/fastify/transaction-continuity) pages.
:::

## Purpose

Demonstrate that the same Ambiten runtime policies remain useful when the HTTP framework changes from Express to Fastify.

## Planned scope

- Reuse model middleware and lifecycle behavior without depending on Fastify request objects.
- Preserve tenant and request identity in execution-scoped instrumentation.
- Distinguish Fastify transport hooks from Ambiten model-operation middleware.
- Keep shared clients, tenant infrastructure, and configuration at process lifetime.
- Define startup, readiness, error handling, request draining, and shutdown responsibilities.
- Describe trusted tenant selection and authorization boundaries before production deployment.

## Target checkpoint

The application should preserve its model policies and instrumentation while Fastify owns transport behavior. Resource cleanup belongs to the process lifecycle, and request-specific state must remain scoped to its execution.

This page will consolidate the framework change, not reproduce the entire [Production Runtime tutorial](/tutorials/12-production-runtime) or claim that adapter installation alone makes an application production-ready.

## Continue learning

Previous: [Transaction Continuity](/tutorials/frameworks/fastify/transaction-continuity).

Return to the [Fastify Overview](/tutorials/frameworks/fastify) or [Framework Tracks](/tutorials/frameworks/). [NestJS](/tutorials/frameworks/nestjs) is the next planned framework integration and remains separate from this track.
