# Serverless Notes

Serverless runtimes behave very differently from long-running application servers.

Functions may start cold, execute briefly, pause between invocations, or terminate immediately after returning a response. Because of that, logging infrastructure designed for persistent runtimes does not always behave predictably inside serverless execution environments.

Conceptually:

```text
Cold Start
    ↓
Short Execution Window
    ↓
Invocation Ends
```

Logging strategy in serverless systems should therefore prioritize deterministic delivery, lightweight execution, and minimal background lifecycle dependencies.

## Structured console output

For most serverless runtimes, structured console logging is the safest default.

```ts
import { createLogger, consoleTransport } from '@ambiten/logger';

export const logger = createLogger({
  json: true,
  transports: [
    consoleTransport(false)
  ]
});
```

Conceptually:

```text
Structured Runtime Events
            ↓
stdout / stderr
            ↓
Provider Log Collection
```

Cloud platforms such as:

- AWS Lambda
- Google Cloud Functions
- Azure Functions
- Vercel Functions

already collect stdout and stderr automatically into centralized telemetry infrastructure.

Structured JSON console output therefore integrates naturally into the provider’s existing observability pipeline without requiring additional runtime complexity.

## Avoid long-running background infrastructure

Long-lived timers, persistent file streams, and background flush intervals are generally unsafe defaults inside serverless environments.

Conceptually:

```text
Background Timer
        ↓
Function Ends
        ↓
Pending Work Lost
```

Rolling file transports, metrics intervals, and continuous background flush loops are designed primarily for long-running runtimes.

Serverless execution may freeze or terminate before those background systems complete safely.

For most serverless workloads, logging should remain lightweight, synchronous where necessary, and explicitly controlled within the invocation lifecycle itself.

## Deterministic batch flushing

Asynchronous batching can still be useful in serverless systems, but delivery should generally be flushed explicitly before the function exits.

```ts
const transport = new AsyncBatchTransporter({
  batchSize: 25,
  flushInterval: 1000,
  startImmediately: false,
  sendBatch: async (entries) => {
    await sendLogs(entries);
  }
});

export async function handler(event) {
  logger.info('Handling event', { eventId: event.id });

  await transport.flush();

  return {
    statusCode: 200,
    body: 'ok'
  };
}
```

Conceptually:

```text
Runtime Events
        ↓
Batch Aggregation
        ↓
Explicit Flush
        ↓
Function Exit
```

This keeps telemetry delivery deterministic rather than depending on background timers that may never complete.

If a function returns before pending telemetry flushes, runtime events may be lost depending on provider lifecycle behavior.

## Context-aware serverless execution

Context-aware logging remains extremely valuable in serverless systems.

Request identifiers, invocation IDs, tenant identifiers, job references, and execution metadata can still propagate naturally through the runtime lifecycle.

```ts
await AmbitenContext.run(
  {
    requestId: context.awsRequestId,
    tenantId: event.headers?.['x-tenant-id']
  },
  async () => {
    logger.info('Processing serverless request');
  }
);
```

Conceptually:

```text
Invocation Context
        ↓
Runtime Metadata
        ↓
Structured Telemetry
```

This becomes especially useful when reconstructing distributed execution flows across:

- API gateways
- queues
- background triggers
- multi-tenant requests
- distributed workflows

inside ephemeral runtime environments.

## Lightweight transport strategy

Production serverless workloads should generally keep the transport pipeline lightweight.

Conceptually:

```text
Short-Lived Runtime
          ↓
Minimal Transport Overhead
```

Structured JSON console output is often sufficient because provider-managed telemetry systems already aggregate runtime output centrally.

Remote delivery transports should usually only be introduced when:

```text
delivery is explicitly awaited
provider telemetry extensions exist
managed ingestion layers are available
observability guarantees require direct delivery
```

Otherwise, the simplest structured stdout pipeline is usually the most operationally reliable approach.

## Serverless lifecycle awareness

The most important principle in serverless logging is lifecycle awareness.

Conceptually:

```text
Invocation Starts
        ↓
Runtime Execution
        ↓
Telemetry Flush
        ↓
Invocation Ends
```

The logger should never assume the runtime will remain alive after the invocation finishes.

Background delivery that works safely in persistent application servers may fail unpredictably in ephemeral execution environments.

## Operational recommendations

For most serverless production systems, the safest approach generally combines:

- structured JSON output
- lightweight transports
- explicit flushing
- minimal timers
- context-aware metadata
- provider-managed collection

This preserves strong operational visibility while avoiding lifecycle behavior that conflicts with ephemeral execution models.

## Summary

Serverless logging in Ambiten Logger is designed around deterministic delivery and lightweight execution within short-lived runtime environments.

Structured console output integrates naturally with provider-managed telemetry systems, explicit flushing prevents telemetry loss before invocation termination, context-aware metadata preserves execution continuity across distributed workflows, and avoiding long-running background infrastructure helps keep observability behavior predictable inside ephemeral serverless runtimes.
