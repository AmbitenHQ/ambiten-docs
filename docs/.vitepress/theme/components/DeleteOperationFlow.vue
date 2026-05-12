<template>
  <div class="crud-flow crud-flow-delete">
    <div class="crud-flow-step crud-flow-step-input">
      <span class="crud-flow-eyebrow">Input</span>
      <strong>Delete filter enters the model boundary</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-pre">
      <span class="crud-flow-eyebrow">Pre Hooks</span>
      <strong>Middleware can audit, guard, or reshape deletion behavior</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-context">
      <span class="crud-flow-eyebrow">Runtime Scope</span>
      <strong>Tenant, database, and session resolve from context</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-db">
      <span class="crud-flow-eyebrow">Execution</span>
      <strong>Runtime applies soft-delete or hard-delete policy</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-post">
      <span class="crud-flow-eyebrow">Post Hooks</span>
      <strong>Middleware can observe or extend the result</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-result">
      <span class="crud-flow-eyebrow">Output</span>
      <strong>Delete result or deleted document returns to the caller</strong>
    </div>
  </div>
</template>