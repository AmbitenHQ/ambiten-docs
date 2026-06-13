import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Ambiten",
  description:
    "Context-driven data runtime for multi-tenant, transaction-safe apps.",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/ambiten_favicon_pack/favi-512x512.svg" }],
    ["link", { rel: "icon", type: "image/svg+xml", sizes: "32x32", href: "/ambiten_favicon_pack/favi-cycle-32x32.svg" }],
    ["link", { rel: "icon", type: "image/png", sizes: "16x16", href: "/ambiten_favicon_pack/ambiten-icon-16.png" }],
    ["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/ambiten_favicon_pack/ambiten-icon-32.png" }],
    ["link", { rel: "icon", type: "image/png", sizes: "96x96", href: "/ambiten_favicon_pack/ambiten-icon-96.png" }],
    ["link", { rel: "icon", type: "image/png", sizes: "192x192", href: "/ambiten_favicon_pack/ambiten-icon-192.png" }],
    ["link", { rel: "apple-touch-icon", href: "/ambiten_favicon_pack/ambiten-icon-192.png" }],
    ["link", { rel: "manifest", href: "/ambiten_favicon_pack/site.webmanifest" }],
    ["meta", { name: "application-name", content: "Ambiten" }],
    ["meta", { name: "apple-mobile-web-app-title", content: "Ambiten" }],
    ["meta", { name: "theme-color", content: "#050816" }],
    ["meta", { name: "msapplication-TileColor", content: "#050816" }],
    ["meta", { name: "format-detection", content: "telephone=no" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "Ambiten Docs" }],
    ["meta", { property: "og:title", content: "Ambiten Docs" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Context-driven data runtime for multi-tenant, transaction-safe apps."
      }
    ],
    ["meta", { property: "og:image", content: "/ambiten_brand/ambiten-og-card.png" }],
    ["meta", { property: "og:image:alt", content: "Ambiten Docs social preview" }],
    ["meta", { property: "og:image:type", content: "image/png" }],
    ["meta", { property: "twitter:card", content: "summary_large_image" }],
    ["meta", { property: "twitter:title", content: "Ambiten Docs" }],
    [
      "meta",
      {
        property: "twitter:description",
        content:
          "Context-driven data runtime for multi-tenant, transaction-safe apps."
      }
    ],
    ["meta", { property: "twitter:image", content: "/ambiten_brand/ambiten-og-card.png" }],
    ["meta", { property: "twitter:image:alt", content: "Ambiten Docs social preview" }]
  ],
  themeConfig: {
    logo: {
      light: "/ambiten_brand/ambiten-mark-192x192.png",
      dark: "/ambiten_brand/ambiten-mark-192x192.svg"
    },
    siteTitle: 'Ambiten',
    nav: [
      { text: "Home", link: "/" },
      {
        text: "Learn",
        items: [
          { text: "Introduction", link: "/getting-started/introduction" },
          { text: "Installation", link: "/getting-started/installation" },
          { text: "Quick Start", link: "/getting-started/quick-start" },
          { text: "One Request Flow", link: "/getting-started/one-request-flow" },
          { text: "Tutorials", link: "/tutorials/" },
          { text: "Why Ambiten", link: "/why-ambiten" }
        ]
      },
      {
        text: "Runtime",
        items: [
          { text: "Architecture", link: "/architecture/whitepaper" },
          { text: "Core Concepts", link: "/core/context" },
          { text: "Runtime Layer", link: "/models/ambiten-model" },
          { text: "Model Operations", link: "/crud/create" },
          { text: "Runtime Features", link: "/features/soft-delete" }
        ]
      },
      {
        text: "Platform",
        items: [
          { text: "Adapters", link: "/adapters/overview" },
          { text: "Logger", link: "/logger/introduction" },
          { text: "Director", link: "/operations/director" }
        ]
      },
      {
        text: "Advanced",
        items: [
          { text: "AmbitenClient", link: "/reference/api/ambiten-client" },
          { text: "AmbitenBootstrap", link: "/advanced/bootstrap-cli" },
          { text: "CLI Init", link: "/advanced/cli-init" },
          { text: "Performance Tuning", link: "/advanced/performance-tuning" },
          { text: "Deployment Guide", link: "/production/deployment" },
          { text: "Migration Guides", link: "/migration/overview-migration" }
        ]
      },
      {
        text: "API Reference",
        items: [
          { text: "API Overview", link: "/reference/api" },
          { text: "AmbitenClient", link: "/reference/api/ambiten-client" },
          { text: "Core API", link: "/reference/api/core/README" },
          { text: "Logger API", link: "/reference/api/logger/README" },
          { text: "adapter-express", link: "/reference/api/adapter-express/README" },
          { text: "adapter-fastify", link: "/reference/api/adapter-fastify/README" },
          { text: "adapter-graphql", link: "/reference/api/adapter-graphql/README" },
          { text: "adapter-lambda", link: "/reference/api/adapter-lambda/README" },
          { text: "adapter-nestjs", link: "/reference/api/adapter-nestjs/README" },
          { text: "adapter-runtime", link: "/reference/api/adapter-runtime/README" },
          { text: "adapter-types", link: "/reference/api/adapter-types/README" }
        ]
      },
      {
        text: "Project",
        items: [
          { text: "Why Ambiten", link: "/why-ambiten" },
          { text: "Mission & Roadmap", link: "/mission-roadmap" },
          { text: "GitHub", link: "https://github.com/AmbitenHQ/ambiten" }
        ]
      }
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
        text: "Logger",
        collapsed: true,
        items: [
          { text: "Introduction", link: "/logger/introduction" },
          { text: "Architecture", link: "/logger/architecture" },
          { text: "Concept", link: "/logger/concept" },
          { text: "Structured Logging", link: "/logger/structured-logging" },
          { text: "Context-Aware Logging", link: "/logger/context-aware-logging" },
          { text: "Resilience Model", link: "/logger/resilience-model" },
          { text: "Reliability", link: "/logger/reliability" },
          { text: "Metrics", link: "/logger/metrics" },
          {
            text: "Getting Started",
            collapsed: true,
            items: [
              { text: "Installation", link: "/logger/getting-started/installation" },
              { text: "Basic Logger", link: "/logger/getting-started/basic-logger" },
              { text: "JSON Logging", link: "/logger/getting-started/json-logging" },
            ]
          },
          {
            text: "Transports",
            collapsed: true,
            items: [
              { text: "Overview", link: "/logger/transports/overview" },
              { text: "Transports Pipeline", link: "/logger//transports/transports-pipeline" },
              { text: "Console", link: "/logger/transports/console" },
              { text: "File Logging", link: "/logger/transports/file-logging" },
              { text: "Rotating File", link: "/logger/transports/rotating-files" },
              { text: "Rolling File", link: "/logger/transports/rolling-file" },
              { text: "Buffered", link: "/logger/transports/buffered" },
              { text: "Async Batch", link: "/logger/transports/async-batch" },
              { text: "HTTP", link: "/logger/transports/http-transport" },
              { text: "Elasticsearch", link: "/logger/transports/elasticsearch" },
              { text: "Loki", link: "/logger/transports/loki" }
            ]
          },
          {
            text: "Production",
            collapsed: true,
            items: [
              { text: "Overview", link: "/logger/production/overview" },
              { text: "Testing & Shutdown", link: "/logger/production/testing-shutdown" },
              { text: "Serverless Notes", link: "/logger/production/serverless-notes" },
              { text: "High Throughput Logging", link: "/logger/production/high-throughput-logging" },
              { text: "Log Retention Strategy", link: "/logger/production/log-retention-strategy" },
              { text: "Recommended Setups", link: "/logger/production/recommended-setups" },
            ]
          },

          { text: "Integration", link: "/logger/integration" },
          // { text: "API Reference", link: "/api/logger/" }
        ]
      },
      {
        text: "Runtime Layer",
        collapsed: true,
        items: [
          { text: "AmbitenModel", link: "/models/ambiten-model" },
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
          { text: "AmbitenClient", link: "/reference/api/ambiten-client" },
          { text: "AmbitenBootstrap", link: "/advanced/bootstrap-cli" },
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
          { text: "API Overview", link: "/reference/api" },
          { text: "AmbitenClient", link: "/reference/api/ambiten-client" },
          {
            text: "Core",
            collapsed: true,
            items: [
              { text: "Overview", link: "/reference/api/core/README" },
              { text: "Classes", link: "/reference/api/core/classes/AmbitenClient" },
              { text: "Functions", link: "/reference/api/core/functions/measureQuery" },
              { text: "Interfaces", link: "/reference/api/core/interfaces/AmbitenClientOptions" },
              { text: "Type Aliases", link: "/reference/api/core/type-aliases/ModelContext" },
              { text: "Enumerations", link: "/reference/api/core/enumerations/ErrorType" },
              { text: "Variables", link: "/reference/api/core/variables/AmbitenContext" }
            ]
          },
          {
            text: "Logger",
            collapsed: true,
            items: [
              { text: "Overview", link: "/reference/api/logger/README" },
              { text: "Classes", link: "/reference/api/logger/classes/MetricsTracker" },
              { text: "Functions", link: "/reference/api/logger/functions/createLogger" },
              { text: "Interfaces", link: "/reference/api/logger/interfaces/LoggerConfig" },
              { text: "Type Aliases", link: "/reference/api/logger/type-aliases/LogLevel" },
              { text: "Variables", link: "/reference/api/logger/variables/DefaultLogger" }
            ]
          },
          {
            text: "Adapters",
            collapsed: true,
            items: [
              {
                text: "adapter-express",
                collapsed: true,
                items: [
                  { text: "Overview", link: "/reference/api/adapter-express/README" },
                  { text: "Functions", link: "/reference/api/adapter-express/functions/createExpressAdapter" }
                ]
              },
              {
                text: "adapter-fastify",
                collapsed: true,
                items: [
                  { text: "Overview", link: "/reference/api/adapter-fastify/README" },
                  { text: "Functions", link: "/reference/api/adapter-fastify/functions/createFastifyAdapter" }
                ]
              },
              {
                text: "adapter-graphql",
                collapsed: true,
                items: [
                  { text: "Overview", link: "/reference/api/adapter-graphql/README" },
                  { text: "Functions", link: "/reference/api/adapter-graphql/functions/createApolloContextFactory" },
                  { text: "Interfaces", link: "/reference/api/adapter-graphql/interfaces/AmbitenGraphqlRuntimeContext" },
                  { text: "Type Aliases", link: "/reference/api/adapter-graphql/type-aliases/GraphqlAdapterOptions" }
                ]
              },
              {
                text: "adapter-lambda",
                collapsed: true,
                items: [
                  { text: "Overview", link: "/reference/api/adapter-lambda/README" },
                  { text: "Functions", link: "/reference/api/adapter-lambda/functions/createLambdaAdapter" },
                  { text: "Interfaces", link: "/reference/api/adapter-lambda/interfaces/LambdaRequestInput" },
                  { text: "Type Aliases", link: "/reference/api/adapter-lambda/type-aliases/LambdaAdapterOptions" }
                ]
              },
              {
                text: "adapter-nestjs",
                collapsed: true,
                items: [
                  { text: "Overview", link: "/reference/api/adapter-nestjs/README" },
                  { text: "Classes", link: "/reference/api/adapter-nestjs/classes/AmbitenNestAdapterModule" },
                  { text: "Type Aliases", link: "/reference/api/adapter-nestjs/type-aliases/NestjsAmbitenAdapterOptions" },
                  { text: "Variables", link: "/reference/api/adapter-nestjs/variables/AMBITEN_ADAPTER_OPTIONS" }
                ]
              },
              {
                text: "adapter-runtime",
                collapsed: true,
                items: [
                  { text: "Overview", link: "/reference/api/adapter-runtime/README" },
                  { text: "Functions", link: "/reference/api/adapter-runtime/functions/runWithAdapterContext" },
                  { text: "Interfaces", link: "/reference/api/adapter-runtime/interfaces/AdapterRuntimeContextSnapshot" }
                ]
              },
              {
                text: "adapter-types",
                collapsed: true,
                items: [
                  { text: "Overview", link: "/reference/api/adapter-types/README" },
                  { text: "Functions", link: "/reference/api/adapter-types/functions/resolveTenant" },
                  { text: "Interfaces", link: "/reference/api/adapter-types/interfaces/AmbitenRequestLike" },
                  { text: "Type Aliases", link: "/reference/api/adapter-types/type-aliases/TenantResolver" }
                ]
              }
            ]
          }
        ]
      }, {
        text: "Migration Guides",
        collapsed: true,
        items: [
          { text: "Overview", link: "/migration/overview-migration" },
          { text: "Abimongo to Ambiten", link: "/migration/abimongo-to-ambiten.md" }
        ]
      },
      {
        text: "Project",
        collapsed: true,
        items: [
          { text: "Why Ambiten", link: "/why-ambiten" },
          { text: "Mission & Roadmap", link: "/mission-roadmap" },

        ]
      }
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/AmbitenHQ/ambiten" }
    ],
    footer: {
      message:
        "Context-aware execution infrastructure for multi-tenant systems.",
      copyright: `Copyright © ${new Date().getFullYear()} Ambiten`
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


