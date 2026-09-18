import { setImmediate as waitForObserver } from "node:timers/promises";
import { AmbitenContext } from "@ambiten/core";

export interface QuerySignal {
  status: "success" | "error";
  requestId?: string;
  tenantId?: string;
  operation?: string;
  collectionName?: string;
  error?: string;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function withQueryObservation<R>(
  operation: () => Promise<R>
): Promise<{ result: R; signals: QuerySignal[] }> {
  const current = AmbitenContext.get();
  const signals: QuerySignal[] = [];

  const observer = {
    onQuery(payload: Record<string, unknown>) {
      const ctx = AmbitenContext.get();
      const signal: QuerySignal = {
        status: "success",
        requestId: ctx.requestId,
        tenantId: ctx.tenantId,
        operation: readString(payload.operation),
        collectionName: readString(payload.collectionName)
      };

      signals.push(signal);
      console.log("[ambiten query]", signal);
    },

    onQueryError(payload: Record<string, unknown>) {
      const ctx = AmbitenContext.get();
      const signal: QuerySignal = {
        status: "error",
        requestId: ctx.requestId,
        tenantId: ctx.tenantId,
        operation: readString(payload.operation),
        collectionName: readString(payload.collectionName),
        error: payload.error instanceof Error
          ? payload.error.message
          : readString(payload.error)
      };

      signals.push(signal);
      console.error("[ambiten query error]", signal);
    }
  };

  return AmbitenContext.run({ ...current, observer }, async () => {
    try {
      const result = await operation();
      return { result, signals };
    } finally {
      // Ambiten 1.2.4 schedules observer callbacks with setImmediate().
      // Flush those callbacks before this demonstration serializes its signals.
      // A failed query still rejects with its original error after this wait.
      await waitForObserver();
    }
  });
}
