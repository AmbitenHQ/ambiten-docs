<script setup>
defineProps({
  eyebrow: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  signals: {
    type: Array,
    default: () => []
  },
  cards: {
    type: Array,
    default: () => []
  },
  flow: {
    type: Array,
    default: () => []
  },
  accent: {
    type: String,
    default: "#4568f2"
  }
});
</script>

<template>
  <div class="doc-overview-cards" :style="{ '--doc-overview-accent': accent }">
    <section class="doc-overview-hero-card">
      <div>
        <span class="doc-overview-eyebrow">{{ eyebrow }}</span>
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
      </div>

      <div v-if="signals.length" class="doc-overview-signal-strip">
        <span v-for="signal in signals" :key="signal">{{ signal }}</span>
      </div>
    </section>

    <section v-if="cards.length" class="doc-overview-pillars">
      <article v-for="card in cards" :key="card.title" class="doc-overview-pillar">
        <span v-if="card.label" class="doc-overview-eyebrow">{{ card.label }}</span>
        <strong>{{ card.title }}</strong>
        <p>{{ card.text }}</p>
      </article>
    </section>

    <section v-if="flow.length" class="doc-overview-flow" aria-label="Runtime flow">
      <template v-for="(step, index) in flow" :key="step.title">
        <article class="doc-overview-flow-step">
          <span>{{ step.label }}</span>
          <strong>{{ step.title }}</strong>
        </article>
        <div v-if="index < flow.length - 1" class="doc-overview-flow-arrow" aria-hidden="true">
          &rarr;
        </div>
      </template>
    </section>
  </div>
</template>
