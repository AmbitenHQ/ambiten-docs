# Tutorials

Learn Tenra by building real systems instead of isolated examples.

Tutorials are designed to show how the runtime behaves across complete application workflows: context propagation, middleware execution, transactions, tenant isolation, instrumentation, and operational boundaries working together inside one system.

<OneRequestFlowVisual />

## Why tutorials exist

Tenra is not only a collection of APIs.

It is a runtime system.

Understanding individual methods is useful, but production behavior emerges from how execution boundaries interact across adapters, context, models, middleware, transactions, and infrastructure resolution.

That is why the tutorials focus on complete runtime flows rather than disconnected snippets.

The goal is to help you understand how systems remain predictable as they grow in complexity.

## What you will learn

Each tutorial is built around a real architectural pattern rather than a synthetic example.

You will see how runtime context moves through requests, how middleware shapes behavior centrally, how tenant isolation remains enforced automatically, and how instrumentation exposes operational behavior without polluting business logic.

The tutorials also demonstrate how transactions, policies, and runtime guarantees interact under realistic workloads instead of only in simplified examples.

## Learning structure

Every tutorial follows the same architectural progression.

```PlainText
Product Definition
→ Data Modeling
→ Runtime Setup
→ Feature Workflows
→ Runtime Behavior
→ Operational Insight
```

This structure keeps the focus on execution behavior instead of only implementation details.

You are not only learning how to write features.

You are learning how those features behave inside a controlled runtime system.

## Available tutorials

<TutorialGrid />

### Build a Document-to-PDF SaaS

This tutorial walks through a complete multi-tenant SaaS application with tenant-aware execution, transaction-safe workflows, instrumentation-driven observability, and usage-tier enforcement.

The system includes real operational concerns such as usage limits, upgrade flows, runtime policy enforcement, and request-scoped execution behavior.

Instead of treating Tenra as an isolated data layer, the tutorial demonstrates how the runtime coordinates the entire execution path.

→ [Start tutorial](/tutorials/pdf-saas)

## What makes these tutorials different

Most tutorials on the web focus on calling APIs.

Tenra tutorials focus on execution architecture.

The emphasis is on runtime boundaries, operational correctness, scalability, and system behavior under production conditions rather than only showing how to invoke methods.

That distinction matters because most complexity in modern systems comes from execution coordination, not from individual database calls.

## When to use tutorials

Tutorials are most useful when you want to understand how multiple runtime concepts work together inside a complete application.

They are especially useful if you want to:

- move beyond isolated examples
- understand request-scoped execution
- study multi-tenant runtime behavior
- see how instrumentation and middleware interact
- learn how Tenra behaves under realistic architectural conditions

For lower-level API details, use the core documentation and reference sections.

## Summary

Tutorials are where the Tenra runtime becomes concrete.

They demonstrate how context propagation, middleware, transactions, instrumentation, and tenant-aware execution combine to support real production-style systems instead of isolated code samples.

## Next step

→ [Build a Document-to-PDF SaaS](/tutorials/pdf-saas)
