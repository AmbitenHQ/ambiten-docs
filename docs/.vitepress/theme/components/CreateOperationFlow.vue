<template>
  <div class="crud-flow crud-flow-create">
    <div class="crud-flow-step crud-flow-step-input">
      <span class="crud-flow-eyebrow">Input</span>
      <strong>Document payload enters the model boundary</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-validate">
      <span class="crud-flow-eyebrow">Validation</span>
      <strong>Schema rules validate structure and constraints</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-pre">
      <span class="crud-flow-eyebrow">Pre Hooks</span>
      <strong>Middleware can enrich, normalize, or reject the write</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-context">
      <span class="crud-flow-eyebrow">Runtime Scope</span>
      <strong>Tenant, database, and session resolve from context</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-db">
      <span class="crud-flow-eyebrow">Persistence</span>
      <strong>MongoDB executes within the resolved scope</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-post">
      <span class="crud-flow-eyebrow">Post Hooks</span>
      <strong>Middleware can observe or extend the result</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-result">
      <span class="crud-flow-eyebrow">Output</span>
      <strong>Normalized document returns to the caller</strong>
    </div>
  </div>
</template>