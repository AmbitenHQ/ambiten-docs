<script setup lang="ts">
defineProps<{
  items: string[];
  ariaLabel?: string;
}>();
</script>

<template>
  <div class="signal-flow" :aria-label="ariaLabel ?? 'Execution flow'">
    <template v-for="(item, index) in items" :key="`${item}-${index}`">
      <div class="signal-flow-pill">
        <strong>{{ item }}</strong>
      </div>
      <div
        v-if="index < items.length - 1"
        class="signal-flow-connector"
        aria-hidden="true"
      ></div>
    </template>
  </div>
</template>
