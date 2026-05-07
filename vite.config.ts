// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const normalizeBasePath = (value: string | undefined) => {
  if (!value || value === "/") return "/";

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
};

const githubRepositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const basePath = normalizeBasePath(
  process.env.VITE_BASE_PATH ??
    (process.env.GITHUB_ACTIONS === "true" && githubRepositoryName
      ? `/${githubRepositoryName}/`
      : "/"),
);

export default defineConfig({
  // GitHub Pages is static hosting, so build prerendered HTML instead of Cloudflare output.
  cloudflare: false,
  vite: {
    base: basePath,
  },
  tanstackStart: {
    prerender: {
      enabled: true,
      autoSubfolderIndex: true,
      crawlLinks: true,
    },
  },
});
