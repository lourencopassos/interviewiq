import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next@15 still ships legacy (eslintrc-style) configs, so we
// bridge them into ESLint 9's flat config via FlatCompat.
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".turbo/**",
      "node_modules/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // CommonJS config files (next.config.js, postcss.config.js) and the Node
    // test files (test/*.test.cjs, which load the TS sources via tsx) use require()
    files: ["*.config.js", "*.config.cjs", "test/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
