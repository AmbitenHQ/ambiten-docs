<template>
  <div class="package-manager-tabs">
    <div class="package-manager-tablist" role="tablist" aria-label="Package manager commands">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="package-manager-tab"
        :class="{ 'is-active': activeTab === tab.id }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`package-manager-panel-${tab.id}`"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-for="tab in tabs"
      :key="`${tab.id}-panel`"
      v-show="activeTab === tab.id"
      class="package-manager-panel"
      role="tabpanel"
      :id="`package-manager-panel-${tab.id}`"
    >
      <div class="language-bash package-manager-code">
        <button class="copy" title="Copy"></button>
        <span class="lang">bash</span>
        <pre><code>{{ tab.command }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const tabs = [
  { id: "pnpm", label: "pnpm", command: "pnpm add @ambiten/logger" },
  { id: "npm", label: "npm", command: "npm install @ambiten/logger" },
  { id: "yarn", label: "yarn", command: "yarn add @ambiten/logger" }
];

const activeTab = ref("pnpm");
</script>
