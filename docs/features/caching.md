# AmbitenCache

AmbitenCache is the runtime-aware caching layer for Ambiten.

It extends tenant isolation, execution context, and operational safety into the cache boundary so applications can use shared cache infrastructure without leaking data across tenants or scattering cache rules throughout the codebase.

Unlike traditional cache helpers that rely on manual string composition, AmbitenCache derives cache scope directly from the active runtime context.

<DocOverviewCards 
eyebrow="Tenant-Aware Cache" 
title="Cache keys inherit runtime scope instead of relying on manual string discipline." 
description="AmbitenCache binds cache operations to tenant identity, namespaces, TTL policy, serialization safety, and observable cache behavior." accent="#16a37b"
:signals='["Prefix", "Tenant ID", "Namespace", "Key", "TTL", "Hit / miss"]' 
:cards='[ { "label": "Isolation", "title": "Tenant identity becomes part of every key", "text": "Shared Redis infrastructure can still maintain strict tenant separation through runtime-aware key resolution." }, { "label": "Safety", "title": "Invalid payloads fail safely", "text": "Unreadable cache values are treated as misses and invalidated automatically instead of crashing application flow." }, { "label": "Performance", "title": "Wrap simplifies repeated fetch logic", "text": "The check-fetch-set lifecycle becomes one consistent runtime-aware operation." }
]'
:flow='[ { "label": "Resolve", "title": "Read active runtime scope" }, { "label": "Compose", "title": "Build tenant-aware cache key" }, { "label": "Read", "title": "Return hit or fetch source" }, { "label": "Observe", "title": "Emit cache telemetry" }
]'
/>

## Runtime-aware caching

Traditional caching systems often depend on manually composed keys:

```ts
const key = `tenant-a:users:${userId}`;
```

This approach becomes fragile as systems scale because isolation depends entirely on developer discipline.

AmbitenCache moves this responsibility into the runtime itself. Cache operations automatically inherit tenant scope from AmbitenContext, allowing application code to remain simple while cache boundaries stay predictable.

```ts
await cache.set("dashboard-stats", stats);
```

The runtime determines the correct tenant-aware cache key automatically.

## Key composition

Internally, cache keys follow a hierarchical structure:

```ts
{prefix}:{tenantId}:{namespace}:{key}
```

The final key is derived from runtime context, explicit overrides, and cache configuration.

| Component | Default   | Purpose                    |
| --------- | --------- | -------------------------- |
| Prefix    | `Ambiten`   | Global cache namespace     |
| Tenant ID | `default` | Runtime tenant isolation   |
| Namespace | `cache`   | Logical grouping           |
| Key       | —         | Unique resource identifier |

Tenant resolution follows the active execution scope unless explicitly overridden.

## Basic Usage

```ts
await cache.set("dashboard-stats", stats, {
  ttlSeconds: 60
});

const cachedStats =
  await cache.get<DashboardData>("dashboard-stats");
```

Because cache operations are context-aware, tenant identity does not need to be threaded manually through application code.

## The wrap pattern

The recommended pattern is `wrap(...)`.

It combines cache lookup, source fetch, serialization, and storage into one operation.

```ts
const user = await cache.wrap(
  `user-${userId}`,
  async () => {
    return UserModel.findById(userId);
  },
  {
    ttlSeconds: 300
  }
);
```

This reduces repeated cache boilerplate while keeping cache behavior consistent across services.

## Tenant-aware execution

By default, AmbitenCache resolves tenant scope from the active runtime context.

```ts
await AmbitenContext.run(
  {
    tenantId: "tenant-a"
  },
  async () => {
    await cache.set("config", config);
  }
);
```

The resulting cache entry is isolated automatically within the tenant boundary.

Explicit overrides remain possible for administrative or cross-tenant workflows:

```ts
await cache.get("config", {
  tenantId: "system-global",
  namespace: "settings"
});
```

## Serialization safety

AmbitenCache handles serialization automatically using JSON encoding.

If cached data becomes corrupted or unreadable, the runtime treats it as a cache miss instead of allowing invalid payloads to break execution flow.

Invalid entries are removed automatically when encountered.

This behavior prioritizes runtime resilience over strict cache correctness.

## Invalidation strategy

Single-key invalidation is supported directly:

```ts
await cache.invalidate("dashboard-stats");
```

For broader invalidation patterns, AmbitenCache supports pattern-based invalidation using Redis SCAN semantics instead of KEYS, avoiding blocking behavior in production environments.

This allows tenant-aware cache cleanup without degrading Redis performance under load.

## Observability

Cache operations participate in Ambiten’s instrumentation model.

Operations such as:

```sh
hit
miss
invalidate
corrupt
```

can be surfaced through logging, metrics, or OpenTelemetry integrations.

This makes it possible to observe cache efficiency at the tenant, namespace, or request level rather than treating caching as an opaque subsystem.

## Runtime behavior

AmbitenCache is designed around three operational principles.

Isolation remains automatic because tenant scope is part of key resolution rather than an optional convention. Failure remains recoverable because unreadable values degrade into misses instead of request failures. Observability remains consistent because cache behavior participates in the same runtime telemetry model as models and middleware.

The result is a cache layer that behaves like part of the runtime rather than an external utility.

## Recommended usage

AmbitenCache works best for stable, frequently read data such as:

- dashboards
- configuration
- feature flags
- lookup tables
- session-adjacent runtime state

Highly volatile or write-heavy data should use shorter TTLs and deliberate invalidation policies.

Cache design should remain intentional rather than automatic.

## Mental model

```PlainText
Context resolves scope.
Cache derives isolation.
Runtime enforces consistency.
```

## Summary

AmbitenCache extends Ambiten’s runtime architecture into the caching layer.

By combining tenant-aware key resolution, runtime-scoped execution, serialization safety, and observable cache behavior, it allows applications to use shared cache infrastructure safely without leaking operational complexity into business logic.

### Related Pages

- [AmbitenContext](/core/context)
- [Instrumentation & Observability](/core/instrumentation)
- [Multi-Tenant Strategies](/architecture/multi-tenancy)
- [Perfomance Tuning](/advanced/performance-tuning)
