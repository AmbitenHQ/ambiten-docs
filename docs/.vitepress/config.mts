import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Tenra",
  description:
    "Context-driven data runtime for multi-tenant, transaction-safe apps.",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", href: "/tenra_favicon_pack/favicon.ico", sizes: "any" }],
    ["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/tenra_favicon_pack/tenra-icon-32.png" }],
    ["link", { rel: "icon", type: "image/png", sizes: "192x192", href: "/tenra_favicon_pack/tenra-icon-192.png" }],
    ["link", { rel: "apple-touch-icon", sizes: "180x180", href: "/tenra_favicon_pack/tenra-icon-180.png" }],
    ["link", { rel: "manifest", href: "/tenra_favicon_pack/site.webmanifest" }],
    ["meta", { name: "theme-color", content: "#0b1220" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "Tenra" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Context-driven data runtime for multi-tenant, transaction-safe apps."
      }
    ]
  ],
  themeConfig: {
    logo: {
      light: "/tenra_svg_refinement_v2/tenra-logo-mark.svg",
      dark: "/tenra_svg_refinement_v2/tenra-logo-mark-dark.svg"
    },
    siteTitle: "Tenra",
    nav: [
      { text: "Home", link: "/" },
      { text: "Docs", link: "/getting-started/introduction" },
      { text: "Core Concepts", link: "/core/context" },
      { text: "Adapters", link: "/adapters/overview" },
      { text: "Architecture", link: "/architecture/whitepaper" },
      { text: "API", link: "/api" },
      { text: "Director", link: "/operations/director" },
      { text: "Why Tenra", link: "/why-tenra" },
      { text: "GitHub", link: "https://github.com/Nodem9/abimongo" }
    ],
    sidebar: [
      {
        text: "Getting Started",
        collapsed: true,
        items: [
          { text: "Introduction", link: "/getting-started/introduction" },
          { text: "Installation", link: "/getting-started/installation" },
          { text: "Quick Start", link: "/getting-started/quick-start" },
          { text: "One Request Flow", link: "/getting-started/one-request-flow" }
        ]
      },
      {
        text: "Tutorials",
        collapsed: true,
        items: [
          { text: "Overview", link: "/tutorials/" },

          { text: "Build a SaaS", link: "/tutorials/pdf-saas" },
          // { text: "GraphQL API", link: "/tutorials/graphql-api" },
          // { text: "Multi-Tenant System", link: "/tutorials/multi-tenant-app" },
          // { text: "Background Jobs", link: "/tutorials/worker-jobs" }
        ]
      },
      {
        text: "Architecture",
        collapsed: true,
        items: [
          { text: "Overview", link: "/architecture/whitepaper" },
          { text: "Runtime Execution Flow", link: "/architecture/runtime-execution-flow" },
          { text: "Multi-Tenancy", link: "/architecture/multi-tenancy" },
          { text: "Execution Guarantees", link: "/architecture/execution-guarantees" }
        ]
      },
      {
        text: "Core Concepts",
        collapsed: true,
        items: [
          { text: "Context", link: "/core/context" },
          { text: "Transactions", link: "/core/transactions" },
          { text: "Middleware", link: "/core/middleware" },
          { text: "Instrumentation", link: "/core/instrumentation" }
        ]
      },
      {
        text: "Runtime Layer",
        collapsed: true,
        items: [
          { text: "TenraModel", link: "/models/tenra-model" },
          { text: "Defining Models", link: "/models/defining-models" },
          { text: "Schema", link: "/models/schema" },
          { text: "Context Binding", link: "/models/context-binding" },
          { text: "Provider Contract", link: "/models/provider-contract" }
        ]
      },
      {
        text: "Model Operations",
        collapsed: true,
        items: [
          { text: "Create", link: "/crud/create" },
          { text: "Read", link: "/crud/read" },
          { text: "Update", link: "/crud/update" },
          { text: "Delete", link: "/crud/delete" },
          { text: "Aggregate", link: "/crud/aggregate" }
        ]
      },
      {
        text: "Runtime Features",
        collapsed: true,
        items: [
          { text: "Soft Delete", link: "/features/soft-delete" },
          { text: "Caching", link: "/features/caching" },
          { text: "Events", link: "/features/events" }
        ]
      },
      {
        text: "Product Operations",
        collapsed: true,
        items: [
          { text: "Director Dashboard", link: "/operations/director" }
        ]
      },
      {
        text: "Adapters",
        collapsed: true,
        items: [
          { text: "Overview", link: "/adapters/overview" },
          { text: "Express", link: "/adapters/express" },
          { text: "Fastify", link: "/adapters/fastify" },
          { text: "NestJS", link: "/adapters/nestjs" },
          { text: "GraphQL", link: "/adapters/graphql" },
          { text: "Lambda", link: "/adapters/lambda" },
          { text: "Usage Patterns", link: "/adapters/usage-patterns" }
        ]
      },
      {
        text: "Advanced",
        collapsed: true,
        items: [
          { text: "TenraClient", link: "/api/tenra-client" },
          { text: "TenraBootstrap", link: "/advanced/bootstrap-cli" },
          { text: "CLI Init", link: "/advanced/cli-init" },
          { text: "Advanced Usage", link: "/advanced/advanced-usage" },
          { text: "Performance Tuning", link: "/advanced/performance-tuning" },
          { text: "Deployment Guide", link: "/production/deployment" }
        ]
      },
      {
        text: "API Reference",
        collapsed: true,
        items: [
          { text: "API Overview", link: "/api" },
          { text: "Core API", link: "/api/core/" }
        ]
      }, {
        text: "Migration Guides",
        collapsed: true,
        items: [
          { text: "Overview", link: "/migration/overview-migration" },
          { text: "Abimongo to Tenra", link: "/migration/abimongo-to-tenra.md" }
        ]
      },
      {
        text: "Project",
        collapsed: true,
        items: [
          { text: "Why Tenra", link: "/why-tenra" },
          { text: "Mission & Roadmap", link: "/mission-roadmap" },

        ]
      }
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/Nodem9/abimongo" }
    ],
    footer: {
      message:
        "Framework-agnostic data runtime for modern, multi-tenant systems.",
      copyright: `Copyright © ${new Date().getFullYear()} Tenra`
    },
    search: {
      provider: "local"
    },
    outline: {
      level: [2, 3],
      label: "On this page"
    },
    docFooter: {
      prev: "Previous page",
      next: "Next page"
    }
  }
});
