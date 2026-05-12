<template>
  <div class="crud-flow crud-flow-aggregate">
    <div class="crud-flow-step crud-flow-step-input">
      <span class="crud-flow-eyebrow">Input</span>
      <strong>Aggregation pipeline enters the model boundary</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-pre">
      <span class="crud-flow-eyebrow">Pre Hooks</span>
      <strong>Middleware can inject policy or reshape pipeline stages</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-context">
      <span class="crud-flow-eyebrow">Runtime Scope</span>
      <strong>Tenant, database, and transaction scope resolve from context</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-db">
      <span class="crud-flow-eyebrow">Execution</span>
      <strong>MongoDB executes the pipeline against the resolved collection</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-post">
      <span class="crud-flow-eyebrow">Post Hooks</span>
      <strong>Middleware can observe results and emit runtime signals</strong>
    </div>

    <div class="crud-flow-arrow" aria-hidden="true">→</div>

    <div class="crud-flow-step crud-flow-step-result">
      <span class="crud-flow-eyebrow">Output</span>
      <strong>Result set, stream, or cached response returns to the caller</strong>
    </div>
  </div>
</template>