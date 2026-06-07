<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import DocBreadcrumbs from "./components/DocBreadcrumbs.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #doc-before>
      <DocBreadcrumbs />
    </template>
  </Layout>
</template>
