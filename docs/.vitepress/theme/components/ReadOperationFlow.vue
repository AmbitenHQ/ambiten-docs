<template>
  <div class="crud-flow crud-flow-read">
    <div class="crud-flow-step crud-flow-step-input">
      <span class="crud-flow-eyebrow">Input</span>
      <strong>Query enters the model boundary</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-pre">
      <span class="crud-flow-eyebrow">Pre Hooks</span>
      <strong>Middleware can shape filters and enforce policies</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-context">
      <span class="crud-flow-eyebrow">Runtime Scope</span>
      <strong>Tenant, database, and request state resolve from context</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-db">
      <span class="crud-flow-eyebrow">Execution</span>
      <strong>MongoDB executes against the resolved collection</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-post">
      <span class="crud-flow-eyebrow">Post Hooks</span>
      <strong>Middleware can observe or enrich the result</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-result">
      <span class="crud-flow-eyebrow">Output</span>
      <strong>Normalized documents return to the caller</strong>
    </div>
  </div>
</template>