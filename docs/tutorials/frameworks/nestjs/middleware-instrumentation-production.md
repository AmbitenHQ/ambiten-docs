# Middleware, Instrumentation & Production Structure

::: info Planned page
This is the fourth NestJS framework-track page. Its detailed walkthrough will be supplied after the tenant-aware and transaction pages. These capabilities are not implemented in the first checkpoint.
:::

## Purpose

Prove that Ambiten model policies and instrumentation remain reusable while NestJS owns composition and transport behavior.

## Planned scope

- Reuse model middleware and lifecycle policies without coupling them to controllers.
- Distinguish NestJS HTTP middleware, guards, and interceptors from Ambiten operation middleware.
- Preserve execution identity in runtime instrumentation without putting mutable tenant state on singleton providers.
- Compose shared clients, tenant configuration, and models as process-level infrastructure.
- Define startup, readiness, request draining, shutdown, and resource cleanup responsibilities.
- Make authentication, tenant authorization, and trusted infrastructure selection explicit.

## Target checkpoint

The same application policies should apply through NestJS without a second persistence architecture. Providers remain reusable; request and transaction state remain execution-scoped.

This page consolidates the framework integration rather than repeating the [Production Runtime tutorial](/tutorials/12-production-runtime).

Previous: [Transaction Continuity Across Services](/tutorials/frameworks/nestjs/transaction-continuity).

Return to the [NestJS Overview](/tutorials/frameworks/nestjs) or [Framework Tracks](/tutorials/frameworks/).
