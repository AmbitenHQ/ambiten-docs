<template>
  <article class="tenra-alt-surface-code homepage-code-panel">
    <span class="tenra-alt-kicker">Runtime Experience</span>
    <div class="homepage-code-panel-body">
      <slot />
    </div>
    <div class="homepage-code-panel-copy">
      <slot name="description" />
    </div>
  </article>
</template>
