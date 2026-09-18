import { MultiTenantManager } from "@ambiten/core";
import { client } from "../core/db.js";
import { closeTutorialTenants, registerTutorialTenants } from "../core/tenancy.js";
import { configureUserLifecycle } from "../policies/user-lifecycle.js";

let initialized = false;
let shuttingDown = false;
let initializationPromise: Promise<void> | null = null;
let shutdownPromise: Promise<void> | null = null;

// One startup attempt per process, including concurrent callers.
export function initializeRuntime(): Promise<void> {
  if (shuttingDown) {
    return Promise.reject(new Error("Runtime shutdown has begun; start a new process."));
  }
  if (initialized) return Promise.resolve();

  initializationPromise ??= (async () => {
    await client.connect();
    if (shuttingDown) {
      throw new Error("Runtime shutdown began during initialization.");
    }
    registerTutorialTenants();
    configureUserLifecycle();
    initialized = true;
  })();
  return initializationPromise;
}

export function getRuntimeStatus() {
  const tenants = MultiTenantManager.getAllTenants();
  return {
    initialized,
    shuttingDown,
    tenants: {
      registered: tenants.length,
      connected: tenants.filter(tenant => Boolean(tenant.client)).length
    }
  };
}

// Stop advertising readiness before draining in-flight HTTP requests.
export function beginRuntimeShutdown() {
  shuttingDown = true;
}

export async function checkRuntimeReadiness(): Promise<boolean> {
  if (!initialized || shuttingDown) return false;
  try {
    const db = await client.db();
    await db.command({ ping: 1 }, { timeoutMS: 2000 });
    return initialized && !shuttingDown;
  } catch {
    return false;
  }
}

// Shutdown is terminal and all callers receive the same completion promise.
export function shutdownRuntime(): Promise<void> {
  if (shutdownPromise) return shutdownPromise;
  beginRuntimeShutdown();

  shutdownPromise = (async () => {
    // A startup failure is reported by its caller; cleanup must still run.
    await initializationPromise?.catch(() => {});
    const errors: unknown[] = [];
    try {
      await closeTutorialTenants();
    } catch (error) {
      errors.push(error);
    }
    try {
      await client.close();
    } catch (error) {
      errors.push(error);
    } finally {
      initialized = false;
    }
    if (errors.length) {
      throw new AggregateError(errors, "Runtime cleanup failed.");
    }
  })();
  return shutdownPromise;
}
