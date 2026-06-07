<p align="center">
	<img 
	src="https://cdn.jsdelivr.net/gh/AmbitenHQ/ambiten-docs@main/docs/public/ambiten_brand/ambiten-mark-300x300.png"
	width="400" 
	alt="Ambiten" 
	/>
</p>

<h1 align="center">ambiten-docs</h1>

<p align="center">
	The official documentation system for Ambiten.
</p>

<p align="center">
	Context-driven, enterprise-grade documentation for a runtime-aware MongoDB platform.
</p>

## Overview

This repository contains the official Ambiten documentation site, including:

- product messaging and landing-page experience
- onboarding and getting-started flows
- architecture and runtime design references
- core concepts such as context, transactions, middleware, and instrumentation
- model, schema, provider, adapter, and client documentation
- CRUD, feature, and advanced operational guides

The documentation is designed to serve both first-time adopters and teams evaluating Ambiten for production use.

## Documentation Goals

The Ambiten docs are expected to:

- explain the runtime model clearly and accurately
- maintain enterprise-grade writing quality and visual consistency
- avoid overstating implementation details
- keep product branding and technical behavior aligned
- scale from onboarding content to architectural reference material

## Audience

The documentation is written for teams building production systems on top of MongoDB.

That includes backend engineers implementing application workflows, platform teams evaluating runtime boundaries and tenant isolation, and technical decision-makers assessing operational behavior, observability, and long-term architectural fit.

The system is also structured to support maintainers extending the documentation platform itself.

## Documentation structure

The documentation is organized around execution boundaries and runtime responsibilities.

Core runtime concepts such as context propagation, middleware execution, transactions, and instrumentation form the foundation of the system. From there, the documentation expands into models, providers, adapters, CRUD execution behavior, operational features, and deployment guidance.

This structure is designed to support both onboarding and deep architectural exploration without forcing readers into implementation details too early.

## Documentation platform

The documentation platform is built on VitePress with a custom Ambiten theme layer and a reusable component system for execution flows, runtime diagrams, operational cards, and architectural visualizations.

The visual system is designed to keep technical content readable while preserving a stable product identity across onboarding, architecture, and operational sections.

## Repository Layout

Key files and directories in this workspace:

- `docs/.vitepress/config.mts`
	Site navigation, sidebar structure, metadata, and docs-level configuration.
- `docs/.vitepress/theme/index.ts`
	Theme component registration and theme bootstrap.
- `docs/.vitepress/theme/custom.css`
	Shared design system, layout styling, brand palette, and docs UI rules.
- `docs/.vitepress/theme/components/`
	Reusable Vue components for pills, cards, diagrams, and conceptual flows.
- `docs/public/`
	Static brand and documentation assets.

## Local Workflow

From the repository root, install dependencies and run the documentation build.

```bash
npm install
npm run docs:build
```

The documentation build is the baseline verification step and should pass before publishing or merging substantial documentation changes.

## Writing Standards

All Ambiten documentation should follow these standards:

- use Ambiten naming consistently across product-facing content
- prefer technically precise, enterprise-grade language
- keep conceptual boundaries clear between runtime, model, provider, client, and adapter responsibilities
- do not describe behavior that is not supported by the implementation
- replace plain ASCII flow diagrams with designed visual components where appropriate
- preserve strong dark-mode and light-mode readability

## Visual Standards

The docs UI should remain visually coherent across all sections.

That includes:

- consistent card treatments
- shared pill-style execution flows
- deliberate contrast in both light and dark mode
- alignment between landing-page brand language and technical documentation surfaces
- premium, stable, enterprise-grade presentation rather than experimental styling drift

## Contribution Expectations

When updating the documentation:

1. maintain factual alignment with the real Ambiten runtime and APIs
2. update legacy `Abimongo` wording to `Ambiten` in product-facing content where appropriate
3. preserve or improve the existing visual system rather than introducing one-off patterns
4. check links, routes, and sidebar placement
5. run the docs build before finalizing changes

## Quality Checklist

Before considering a documentation change complete, verify:

- naming is accurate and current
- routes and internal links resolve correctly
- dark-mode and light-mode contrast remain acceptable
- new diagrams or flow sections match the existing design language
- documentation build passes without dead links

## Product Positioning

Ambiten documentation should communicate the product as:

- a runtime-aware data platform
- context-driven by design
- suitable for both straightforward services and complex production systems
- structured for enterprise expectations without making application code heavy

## Support for Future Growth

This docs system is expected to evolve with:

- additional observability and security plugin documentation
- clearer separation between community and enterprise capabilities
- expanded API references and operational guides
- broader adapter, runtime, and deployment documentation

The README should remain a stable operating guide for maintainers even as the site grows.
