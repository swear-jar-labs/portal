import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import importX from "eslint-plugin-import-x";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/**/*.tsx"],
    ignores: ["src/app/layout.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name=/^[a-z]/]",
          message: "No intrinsic HTML in src/app. Use a @swearjar/dos component instead.",
        },
      ],
    },
  },
  {
    files: ["src/packages/swearjar-dos/**/*.{ts,tsx}"],
    rules: {
      // The kit stays framework-agnostic (a future standalone package):
      // next/image is an app-level concern.
      "@next/next/no-img-element": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*", "**/app/**", "**/db/**", "**/lib/**", "**/features/**"],
              message:
                "The kit must stay standalone: it never imports app code (src/app, src/db, src/lib, src/features).",
            },
          ],
        },
      ],
    },
  },
  // Feature layout (see AGENTS.md): src/app is routing only and reaches
  // features through their facades; a feature stack is app -> features ->
  // contracts -> own internals -> shared -> lib/content/db/packages, and only
  // the shell is shared across features.
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/*", "**/features/*/*"],
              message:
                "Import a feature through its facade (@/features/<name>); its internals stay private.",
            },
            {
              group: ["@/shared/*"],
              message:
                "Routing imports features, not shared modules; shared code reaches the app through a facade.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "**/app/**"],
              message: "Shared modules never import the routing layer (src/app).",
            },
            {
              group: ["@/features/**", "**/features/**"],
              message: "Shared modules never import features; features import shared.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "**/app/**"],
              message: "Features never import the routing layer (src/app).",
            },
            {
              regex: "^@/features/(?!shell(?:/|$)|[^/]+/contracts$).+$",
              message:
                "Cross-feature imports are forbidden; a feature may import only the shell or a feature contract.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/shell/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "**/app/**"],
              message: "Features never import the routing layer (src/app).",
            },
            {
              group: ["@/features/*"],
              message: "The shell is the frame: features depend on it, never the other way around.",
            },
          ],
        },
      ],
    },
  },
  // A feature contract is a visibility manifest: it re-exports the slice's
  // public surface through relative imports and never reaches another feature.
  {
    files: ["src/features/*/contracts/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "**/app/**"],
              message: "Contracts never import the routing layer (src/app).",
            },
            {
              regex: "^@/features/(?!shell(?:/|$)).+$",
              message:
                "Contracts re-export their own slice through relative imports; other features stay unreachable.",
            },
          ],
        },
      ],
    },
  },
  // The slice graph must stay acyclic: a contract re-exports its own internals,
  // so the leaf guarantee is gone and cycles are checked as a graph (see
  // AGENTS.md). import-x (not eslint-plugin-import, which under flat config
  // cannot parse imported TS files and silently misses every TS cycle) needs
  // the parser/extensions settings below; @typescript-eslint/parser is a direct
  // devDependency because the copy nested under typescript-eslint is not
  // resolvable for re-parsing, and the graph would stay empty. The kit is out
  // of scope: it is standalone and never imports app code.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/packages/**"],
    plugins: { "import-x": importX },
    settings: {
      "import-x/extensions": [".ts", ".tsx", ".js", ".jsx"],
      "import-x/parsers": { "@typescript-eslint/parser": [".ts", ".tsx"] },
      "import-x/resolver": { typescript: { project: "./tsconfig.json" } },
    },
    rules: {
      "import-x/no-cycle": "error",
    },
  },
  // Tests consume the kit through its public entries: the CSS-free contracts
  // entry for DOM-level constants, never the internals (the main entry pulls
  // CSS modules, which the Playwright transform cannot load).
  {
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/packages/swearjar-dos/*", "@swearjar/dos/*", "!@swearjar/dos/contracts"],
              message:
                "Import DOM contracts from @swearjar/dos/contracts; the kit's internals stay private.",
            },
          ],
        },
      ],
    },
  },
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
