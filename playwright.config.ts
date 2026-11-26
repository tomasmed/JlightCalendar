import fs from "fs";
import path from "path";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT || 3005);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;
const E2E_DB_PATH = path.resolve(process.cwd(), ".tmp-e2e.db");
const isCI = Boolean(process.env.CI);
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "true";
const hasProdBuild = fs.existsSync(path.resolve(process.cwd(), ".next", "BUILD_ID"));
const nextBin = path.resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");

if (!reuseExistingServer) {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const target = `${E2E_DB_PATH}${suffix}`;
    if (fs.existsSync(target)) {
      try {
        fs.unlinkSync(target);
      } catch {
        // Ignore locked file if another process holds handle
      }
    }
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  outputDir: "test-results/playwright-artifacts",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "kiosk-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "mobile-touch",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command:
      isCI || hasProdBuild
        ? `node "${nextBin}" start -H 127.0.0.1 -p ${PORT}`
        : `node "${nextBin}" dev -H 127.0.0.1 -p ${PORT}`,
    port: PORT,
    reuseExistingServer,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
    env: {
      ...process.env,
      JLIGHT_TEST_MODE: "true",
      DATABASE_URL: `file:${E2E_DB_PATH}`,
      AUTH_SECRET:
        process.env.AUTH_SECRET || "jlight-e2e-test-auth-secret-key",
      AUTH_URL: BASE_URL,
      NEXTAUTH_URL: BASE_URL,
    },
  },
});
