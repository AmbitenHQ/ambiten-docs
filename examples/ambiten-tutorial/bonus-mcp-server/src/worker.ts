import { pathToFileURL } from "node:url";
import { AmbitenContext, MultiTenantManager } from "@ambiten/core";
import {
  withQueryObservation,
  type QuerySignal
} from "./instrumentation/query-observer.js";
import { UserModel } from "./models/user.model.js";
import { initializeRuntime, shutdownRuntime } from "./runtime/runtime.js";

export interface UserSummaryJob {
  id: string;
  tenantId: string;
  type: "USER_SUMMARY";
}

export interface WorkerResult {
  jobId: string;
  tenantId: string;
  requestId?: string;
  contextPreserved: boolean;
  userCount: number;
  signals: QuerySignal[];
}

export const jobs: UserSummaryJob[] = [
  { id: "tenant-a-users", tenantId: "tenant-a", type: "USER_SUMMARY" },
  { id: "tenant-b-users", tenantId: "tenant-b", type: "USER_SUMMARY" }
];

export async function processJob(job: UserSummaryJob): Promise<WorkerResult> {
  // Core 1.2.4 merges parent context. A new job must not inherit a request session.
  if (AmbitenContext.hasActiveContext()) {
    throw new Error("Worker jobs must start outside an existing execution context.");
  }

  const tenant = await MultiTenantManager.resolveTenant(job.tenantId);
  if (!tenant) {
    throw new Error(`Tenant "${job.tenantId}" could not be resolved.`);
  }

  const requestId = `job-${job.id}`;
  return AmbitenContext.run({ tenantId: job.tenantId, requestId }, async () => {
    const beforeAwait = { ...AmbitenContext.get() };
    await Promise.resolve();
    const afterAwait = AmbitenContext.get();

    const observed = await withQueryObservation(() => UserModel.find({}));
    const current = AmbitenContext.get();

    return {
      jobId: job.id,
      tenantId: current.tenantId ?? job.tenantId,
      requestId: current.requestId,
      contextPreserved:
        beforeAwait.tenantId === afterAwait.tenantId &&
        beforeAwait.requestId === afterAwait.requestId,
      userCount: observed.result.length,
      signals: observed.signals
    };
  });
}

async function main() {
  try {
    await initializeRuntime();

    // Each call creates a fresh execution; process-level infrastructure is reused.
    for (const job of jobs) {
      console.log(`\nProcessing ${job.id}...`);
      const result = await processJob(job);
      console.log(JSON.stringify(result, null, 2));
    }
  } finally {
    await shutdownRuntime();
  }
}

// Keep the entry point runnable while allowing the same handler to be tested.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error("Worker failed:", error);
    process.exitCode = 1;
  });
}
