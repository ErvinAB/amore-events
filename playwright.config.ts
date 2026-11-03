import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a PRODUCTION build (`next build && next start`) because
 * caching behaviour differs from `next dev`. Needs the local Supabase stack
 * and .env.local. Reuses a server already listening on E2E_PORT.
 */
const port = Number(process.env.E2E_PORT ?? 3300);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["iPhone 14"], browserName: "chromium" } },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${port}`,
    url: `http://localhost:${port}/en`,
    reuseExistingServer: true,
    timeout: 300_000,
    env: { NEXT_PUBLIC_SITE_URL: `http://localhost:${port}` },
  },
});
