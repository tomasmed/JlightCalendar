import fs from "fs";
import path from "path";
import { expect, Page } from "@playwright/test";

export const SHOW_AND_TELL_DIR = path.resolve(
  process.cwd(),
  "test-results",
  "show-and-tell"
);

export interface TestSessionResult {
  ok: boolean;
  user: {
    id: string;
    email: string;
    name: string;
  };
  galaxyId: string;
}

/**
 * Authenticates the browser page via the JLIGHT_TEST_MODE-only session bridge.
 * Sets a real NextAuth v5 JWT cookie in the Playwright BrowserContext.
 */
export async function loginAsTestUser(
  page: Page,
  options: {
    id?: string;
    email?: string;
    name?: string;
    galaxyName?: string;
  } = {}
): Promise<TestSessionResult> {
  const response = await page.request.post("/api/test/session", {
    data: {
      email: options.email ?? "alice@jlight.test",
      name: options.name ?? "Captain Alice",
      galaxyName: options.galaxyName ?? "Alice's Test Galaxy",
      ...(options.id ? { id: options.id } : {}),
    },
  });

  expect(response.ok(), `POST /api/test/session failed with ${response.status()}`).toBeTruthy();
  const payload = (await response.json()) as TestSessionResult;
  expect(payload.ok).toBe(true);
  expect(payload.galaxyId).toBeTruthy();
  return payload;
}

/**
 * Captures a clean "Show & Tell" verification screenshot into
 * test-results/show-and-tell/<name>.png for PR review artifacts.
 */
export async function captureShowAndTell(
  page: Page,
  name: string,
  options: { fullPage?: boolean } = {}
): Promise<string> {
  fs.mkdirSync(SHOW_AND_TELL_DIR, { recursive: true });
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "-");
  const filePath = path.join(SHOW_AND_TELL_DIR, `${safeName}.png`);
  await page.screenshot({
    path: filePath,
    fullPage: options.fullPage ?? false,
  });
  return filePath;
}

/**
 * Blocks external third-party weather/geolocation requests during E2E tests
 * so screenshots and page loads stay fast and deterministic offline.
 */
export async function stubExternalNetwork(page: Page) {
  await page.route(
    /https:\/\/(ipapi\.co|api\.open-meteo\.com)\/.*/,
    (route) => route.abort()
  );
}
