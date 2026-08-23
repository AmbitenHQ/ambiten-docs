<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import DocBreadcrumbs from "./components/DocBreadcrumbs.vue";
import ReleaseAnnouncementBanner from "./components/ReleaseAnnouncementBanner.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #layout-top>
      <ReleaseAnnouncementBanner />
    </template>
    <template #doc-before>
      <DocBreadcrumbs />
    </template>
  </Layout>
</template>
