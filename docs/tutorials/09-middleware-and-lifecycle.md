# Tutorial 9 — Middleware and Lifecycle

> Estimated time: 20–25 minutes

This tutorial moves persistence policy out of routes and services into model middleware and schema hooks.

```text
Application → AmbitenModel → Model Before Middleware → Validation → Schema Pre Hook → MongoDB → Schema Post Hook → Model After Middleware
```

## What you will build

The user lifecycle normalizes email and enriches creation data, hides soft-deleted users by default, supports deleted-only and all-record reads, soft deletion, restore, and explicit hard deletion.

## Model middleware vs schema hooks

Model middleware shapes an `AmbitenModel` operation—its filter, update, document, result, tenant/database/session state, and lifecycle flags. Schema hooks participate in the schema-bound persistence lifecycle. For create operations, model-before middleware runs before validation; schema pre runs after validation and before persistence.

## Soft-delete policy

`configureUserLifecycle()` is process-level setup and must run once at startup. It configures `deletedAt` and `isDeleted`, rewrites ordinary finds to hide deleted records, and turns normal `deleteOne()` calls into an update by marking the middleware context with `meta.softDelete` and supplying an update payload.

```text
normal read    → isDeleted != true
onlyDeleted    → isDeleted = true
withDeleted    → no visibility filter
normal delete  → isDeleted = true, deletedAt = now
hardDelete     → physical removal
```

## Important boundary

Soft delete is a configured persistence policy, not an automatic default. It applies to the operations explicitly covered by the middleware. Aggregates, bulk operations, and custom collection access require their own applicable policy.

## Next tutorial

Tutorial 10 adds instrumentation and operational insight without turning routes into telemetry plumbing.
