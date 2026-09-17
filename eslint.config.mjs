import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

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
  // features through their facades; features stack app -> features -> shared
  // -> lib/content/db/packages, and only the shell is shared across features.
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
              group: ["@/features/*", "!@/features/shell"],
              message: "Cross-feature imports are forbidden; a feature may import only the shell.",
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
