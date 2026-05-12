<template>
  <div class="crud-flow crud-flow-update">
    <div class="crud-flow-step crud-flow-step-input">
      <span class="crud-flow-eyebrow">Input</span>
      <strong>Filter and mutation enter the model boundary</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-pre">
      <span class="crud-flow-eyebrow">Pre Hooks</span>
      <strong>Middleware can validate, enrich, or constrain the mutation</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-context">
      <span class="crud-flow-eyebrow">Runtime Scope</span>
      <strong>Tenant, database, and session resolve from context</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-db">
      <span class="crud-flow-eyebrow">Execution</span>
      <strong>MongoDB executes the update or upsert operation</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-post">
      <span class="crud-flow-eyebrow">Post Hooks</span>
      <strong>Middleware can observe or extend the result</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-result">
      <span class="crud-flow-eyebrow">Output</span>
      <strong>Write result or updated document returns to the caller</strong>
    </div>
  </div>
</template>