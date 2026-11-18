const path = require("path");

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
};

module.exports = nextConfig;
