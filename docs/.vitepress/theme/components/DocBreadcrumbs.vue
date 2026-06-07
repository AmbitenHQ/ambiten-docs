<script setup lang="ts">
import { computed } from "vue";
import { useData, useRoute } from "vitepress";

type Crumb = {
  text: string;
  link?: string;
};

const route = useRoute();
const { frontmatter, page } = useData();

const segmentLabels: Record<string, string> = {
  "getting-started": "Getting Started",
  tutorials: "Tutorials",
  architecture: "Architecture",
  core: "Core Concepts",
  logger: "Logger",
  crud: "Model Operations",
  features: "Runtime Features",
  models: "Runtime Layer",
  adapters: "Adapters",
  advanced: "Advanced",
  production: "Production",
  operations: "Operations",
  migration: "Migration",
  api: "API",
  "api/core": "Core API",
  "api/logger": "Logger API",
  "logger/getting-started": "Getting Started",
  "logger/transports": "Transports",
  "logger/production": "Production"
};

const pageTitleOverrides: Record<string, string> = {
  "/": "Home",
  "/api": "API Overview",
  "/api/": "API Overview",
  "/tutorials/": "Overview",
  "/tutorials": "Overview",
  "/migration/overview-migration": "Overview",
  "/api/core/": "Core API",
  "/api/logger/": "Logger API"
};

function titleCaseFromSlug(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const crumbs = computed<Crumb[]>(() => {
  if (frontmatter.value.layout === "home" || route.path === "/") {
    return [];
  }

  const cleanPath = route.path.replace(/\/$/, "");
  const parts = cleanPath.split("/").filter(Boolean);

  if (!parts.length) {
    return [];
  }

  const result: Crumb[] = [{ text: "Home", link: "/" }];

  parts.forEach((part, index) => {
    const cumulative = parts.slice(0, index + 1).join("/");
    const path = `/${cumulative}`;
    const nextPath = `${path}/`;
    const isLast = index === parts.length - 1;

    let text =
      (isLast && pageTitleOverrides[path]) ||
      (isLast && pageTitleOverrides[nextPath]) ||
      segmentLabels[cumulative] ||
      segmentLabels[part] ||
      titleCaseFromSlug(part);

    if (isLast) {
      text = page.value.title || text;
      result.push({ text });
      return;
    }

    result.push({ text, link: path });
  });

  return result;
});
</script>

<template>
  <nav v-if="crumbs.length" class="ab-doc-breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li v-for="(crumb, index) in crumbs" :key="`${crumb.text}-${index}`">
        <a v-if="crumb.link" :href="crumb.link">{{ crumb.text }}</a>
        <span v-else aria-current="page">{{ crumb.text }}</span>
      </li>
    </ol>
  </nav>
</template>
