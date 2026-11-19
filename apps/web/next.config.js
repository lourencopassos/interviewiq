const path = require("path");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(self), camera=(self), geolocation=()" },
];

// Session data (CV, transcripts, reports) must not be stored by shared caches
// or the browser's back/forward cache. The SSE route is excluded: config
// headers override handler headers, and it needs its own
// `no-cache, no-transform` so proxies don't buffer the stream.
const noStore = [{ key: "Cache-Control", value: "no-store" }];

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@interviewiq/ui",
    "@interviewiq/db",
    "@interviewiq/types",
    "@interviewiq/ai",
  ],
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/sessions/:path*", headers: noStore },
      { source: "/api/interview/:id/:action((?!stream$)[^/]+)", headers: noStore },
    ];
  },
};

module.exports = nextConfig;
