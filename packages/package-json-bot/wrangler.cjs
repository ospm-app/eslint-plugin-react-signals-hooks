// Configuration for Cloudflare Workers using Wrangler
module.exports = {
  name: 'packagejson-bot',
  main: 'dist/worker.js',
  compatibility_date: '2023-07-24',

  // Environment variables
  vars: {
    ALCHEMY_API_KEY: '${ALCHEMY_API_KEY}',
    NODE_ENV: 'production',
  },

  // R2 Bucket configuration
  r2_buckets: [
    {
      binding: 'R2_BUCKET',
      bucket_name: 'package-llm-cache',
      preview_bucket_name: 'package-llm-cache-dev',
    },
  ],

  // KV Namespace configuration
  kv_namespaces: [
    {
      binding: 'KV_CACHE',
      id: '${KV_NAMESPACE_ID}',
      preview_id: '${KV_PREVIEW_NAMESPACE_ID}',
    },
  ],

  // Durable Objects
  durable_objects: {
    bindings: [
      {
        name: 'ANALYSIS_LOCK',
        class_name: 'AnalysisLock',
      },
    ],
  },

  // Scheduled tasks
  triggers: {
    crons: ['0 0 * * *'], // Daily cleanup job
  },

  // Build configuration
  build: {
    command: 'npm run build',
    cwd: '.',
    watch: './src/**/*.ts',
  },

  // Dev server configuration
  dev: {
    ip: 'localhost',
    port: 8787,
    local_protocol: 'http',
  },

  // Environment specific settings
  env: {
    development: {
      route: 'packagejson-bot-dev.workers.dev',
      vars: {
        NODE_ENV: 'development',
      },
    },
    production: {
      route: 'api.packagejsonbot.com/*',
      zone_id: '${CLOUDFLARE_ZONE_ID}',
      vars: {
        NODE_ENV: 'production',
      },
    },
  },
};
