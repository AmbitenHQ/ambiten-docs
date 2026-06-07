<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const isVisible = ref(true);
const isDismissed = ref(false);

let dismissTimer: ReturnType<typeof setTimeout> | undefined;
let removeTimer: ReturnType<typeof setTimeout> | undefined;

function dismiss() {
  if (isDismissed.value) {
    return;
  }

  isDismissed.value = true;

  if (dismissTimer) {
    clearTimeout(dismissTimer);
  }

  removeTimer = setTimeout(() => {
    isVisible.value = false;
  }, 560);
}

function handleDocumentClick() {
  dismiss();
}

onMounted(() => {
  dismissTimer = setTimeout(() => {
    dismiss();
  }, 6200);

  document.addEventListener("click", handleDocumentClick, { capture: true });
});

onBeforeUnmount(() => {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
  }

  if (removeTimer) {
    clearTimeout(removeTimer);
  }

  document.removeEventListener("click", handleDocumentClick, { capture: true });
});
</script>

<template>
  <transition name="ambiten-spirit-overlay-fade">
    <div
      v-if="isVisible"
      class="ambiten-spirit-overlay"
      :class="{ 'is-dismissed': isDismissed }"
      aria-hidden="true"
      @click="dismiss"
    >
      <div class="ambiten-spirit-overlay-shell">
        <img
          src="/ambiten_brand/ambiten-spirit-animation.svg"
          alt=""
          class="ambiten-spirit-overlay-art"
          draggable="false"
        />
      </div>
    </div>
  </transition>
</template>
