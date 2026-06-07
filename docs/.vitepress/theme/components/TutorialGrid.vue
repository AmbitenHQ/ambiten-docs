<script setup lang="ts">
const tutorials = [
  {
    title: "Document-to-PDF SaaS",
    status: "Available",
    href: "/tutorials/pdf-saas",
    summary:
      "Build a tenant-aware SaaS product with tier policies, transaction-safe workflows, runtime instrumentation, and operational visibility.",
    accent: "saas",
    metrics: ["Tenant isolation", "Usage policies", "Transaction flow"]
  },
  {
    title: "GraphQL Runtime",
    status: "Planned",
    href: "",
    summary:
      "Expose Ambiten models through GraphQL while preserving context propagation, middleware behavior, and resolver-safe execution.",
    accent: "graphql",
    metrics: ["Resolver context", "Execution flow", "Policy enforcement"]
  },
  {
    title: "Multi-Tenant Platform",
    status: "Planned",
    href: "",
    summary:
      "Design tenant-aware infrastructure with provider routing, runtime policy boundaries, and operational isolation strategies.",
    accent: "tenant",
    metrics: ["Tenant routing", "Isolation strategy", "Runtime policies"]
  },
  {
    title: "Background Workers",
    status: "Planned",
    href: "",
    summary:
      "Run queues and scheduled jobs with explicit runtime scope so asynchronous execution remains observable and context-safe.",
    accent: "jobs",
    metrics: ["Worker scope", "Retry handling", "Trace continuity"]
  }
];
</script>

<template>
  <section class="tutorial-grid" aria-label="Tutorial overview">
    <component
      :is="tutorial.href ? 'a' : 'article'"
      v-for="tutorial in tutorials"
      :key="tutorial.title"
      class="tutorial-card"
      :class="[
        `tutorial-card-${tutorial.accent}`,
        { 'tutorial-card-disabled': !tutorial.href }
      ]"
      :href="tutorial.href || undefined"
      :aria-disabled="tutorial.href ? undefined : 'true'"
    >
      <div class="tutorial-card-topline">
        <span class="tutorial-card-mark" aria-hidden="true"></span>
        <span class="tutorial-card-status">
          {{ tutorial.status }}
        </span>
      </div>

      <h3>{{ tutorial.title }}</h3>

      <p>
        {{ tutorial.summary }}
      </p>

      <div
        class="tutorial-card-metrics"
        aria-label="Tutorial coverage"
      >
        <span
          v-for="metric in tutorial.metrics"
          :key="metric"
        >
          {{ metric }}
        </span>
      </div>

      <span
        v-if="tutorial.href"
        class="tutorial-card-action"
      >
        Start tutorial
      </span>

      <span
        v-else
        class="tutorial-card-action"
      >
        Coming soon
      </span>
    </component>
  </section>
</template>

<style scoped>
.tutorial-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin: 1.25rem 0 2rem;
}

.tutorial-card {
  position: relative;
  display: flex;
  min-height: 255px;
  flex-direction: column;
  overflow: hidden;
  padding: 1.25rem;
  border: 1px solid var(--ab-content-border);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--tutorial-accent) 11%, transparent), transparent 42%),
    var(--ab-content-bg);
  box-shadow: var(--ab-content-shadow);
  color: inherit;
  text-decoration: none;
}

.tutorial-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(90deg, var(--tutorial-accent), color-mix(in srgb, var(--tutorial-accent) 30%, transparent));
}

.tutorial-card:hover {
  border-color: color-mix(in srgb, var(--tutorial-accent) 38%, var(--ab-content-border));
  transform: translateY(-2px);
  transition:
    border-color 160ms ease,
    transform 160ms ease;
}

.tutorial-card-disabled {
  cursor: default;
}

.tutorial-card-disabled:hover {
  transform: none;
}

.tutorial-card-saas {
  --tutorial-accent: #4568f2;
}

.tutorial-card-graphql {
  --tutorial-accent: #8b5cf6;
}

.tutorial-card-tenant {
  --tutorial-accent: #0f9f6e;
}

.tutorial-card-jobs {
  --tutorial-accent: #d38a49;
}

.tutorial-card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.tutorial-card-mark {
  width: 2.35rem;
  height: 2.35rem;
  border: 1px solid color-mix(in srgb, var(--tutorial-accent) 35%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--tutorial-accent) 24%, transparent), transparent),
    color-mix(in srgb, var(--tutorial-accent) 8%, var(--ab-content-bg));
}

.tutorial-card-status {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0.3rem 0.55rem;
  border: 1px solid color-mix(in srgb, var(--tutorial-accent) 28%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--tutorial-accent) 8%, transparent);
  color: var(--ab-heading);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.tutorial-card h3 {
  margin: 0;
  color: var(--ab-heading);
  font-size: 1.18rem;
  line-height: 1.25;
}

.tutorial-card p {
  margin: 0.75rem 0 0;
  color: var(--ab-body);
  line-height: 1.65;
}

.tutorial-card-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: auto;
  padding-top: 1rem;
}

.tutorial-card-metrics span {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0.32rem 0.55rem;
  border: 1px solid var(--ab-pill-border);
  border-radius: 999px;
  background: var(--ab-pill-bg);
  color: var(--ab-body);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
}

.tutorial-card-action {
  margin-top: 1rem;
  color: var(--tutorial-accent);
  font-size: 0.9rem;
  font-weight: 800;
}

.dark .tutorial-card {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--tutorial-accent) 16%, transparent), transparent 44%),
    var(--ab-content-bg);
}

.dark .tutorial-card-status,
.dark .tutorial-card-action {
  color: color-mix(in srgb, var(--tutorial-accent) 68%, #ffffff);
}

@media (max-width: 760px) {
  .tutorial-grid {
    grid-template-columns: 1fr;
  }

  .tutorial-card {
    min-height: 0;
  }
}
</style>
