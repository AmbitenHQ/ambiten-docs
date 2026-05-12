<script setup lang="ts">
import { ref } from "vue";

type Adapter = {
  id: string;
  label: string;
  packageName: string;
  description: string;
  useCase: string;
};

const adapters: Adapter[] = [
  {
    id: "express",
    label: "Express",
    packageName: "@tenra/adapter-express",
    description: "Use this for traditional Node.js HTTP services built around Express routing and middleware.",
    useCase: "Best when your application already uses Express as its primary API runtime."
  },
  {
    id: "fastify",
    label: "Fastify",
    packageName: "@tenra/adapter-fastify",
    description: "Use this for high-performance HTTP services built on Fastify's plugin and request lifecycle model.",
    useCase: "Best when you want a faster, plugin-oriented server runtime."
  },
  {
    id: "nestjs",
    label: "NestJS",
    packageName: "@tenra/adapter-nestjs",
    description: "Use this when Tenra needs to integrate with NestJS modules, providers, and dependency injection.",
    useCase: "Best for structured backend applications using NestJS conventions."
  },
  {
    id: "graphql",
    label: "GraphQL",
    packageName: "@tenra/adapter-graphql",
    description: "Use this for resolver-driven execution where Tenra should participate directly in GraphQL request flows.",
    useCase: "Best for GraphQL APIs built with Apollo, Yoga, or similar frameworks."
  },
  {
    id: "lambda",
    label: "AWS Lambda",
    packageName: "@tenra/adapter-lambda",
    description: "Use this for serverless and event-driven deployments where Tenra runs inside Lambda execution environments.",
    useCase: "Best for serverless architectures that still need consistent context and runtime behavior."
  }
];

const selectedId = ref(adapters[0].id);

const selectedAdapter = () =>
  adapters.find((adapter) => adapter.id === selectedId.value) ?? adapters[0];
</script>

<template>
  <div class="adapter-selector">
    <div class="adapter-selector-nav" role="tablist" aria-label="Supported adapters">
      <button
        v-for="adapter in adapters"
        :key="adapter.id"
        type="button"
        class="adapter-selector-tab"
        :class="{ 'is-active': adapter.id === selectedId }"
        :aria-selected="adapter.id === selectedId"
        @click="selectedId = adapter.id"
      >
        {{ adapter.label }}
      </button>
    </div>

    <div class="adapter-selector-panel">
      <div class="adapter-selector-header">
        <span class="adapter-selector-eyebrow">Recommended Package</span>
        <h3>{{ selectedAdapter().label }}</h3>
      </div>

      <p>{{ selectedAdapter().description }}</p>
      <p class="adapter-selector-usecase">{{ selectedAdapter().useCase }}</p>

      <pre><code>npm install {{ selectedAdapter().packageName }}</code></pre>
    </div>
  </div>
</template>
