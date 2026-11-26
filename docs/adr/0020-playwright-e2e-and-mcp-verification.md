# ADR 0020: Playwright Real-Browser E2E Suite, Playwright MCP Verification & CI Artifacts

- **Status:** Accepted
- **Date:** 2026-11-26
- **Deciders:** Human Maintainer & Autonomous Agents

## Context

JlightCalendar already enforces pure logic and React Rules-of-Hooks via `tests/unit.test.ts` and exercises Next.js App Router API routes against an isolated SQLite database via `tests/system.test.ts` (ADR 0014). However, neither suite spins up a real browser to verify:
- Real DOM rendering, CSS layout, and responsive breakpoints (`1920x1080` wall kiosk vs `390x844` mobile touch).
- Interactive UI workflows (Ephemeral Comets, authenticated Household Galaxies, calendar events, chores, shared lists, and Theme Studio `creamy` / `osl` switching).
- Touch target ergonomics (`>= 44px` / `48px` minimum hit targets).
- Visual verification screenshots for "Show & Tell" Pull Requests.

We evaluated four real-browser testing options for Next.js 15 App Router + React 19 + Tailwind CSS:
1. **Playwright (`@playwright/test` E2E)** — boots the full Next.js app + SQLite DB via `webServer`, native React 19 & multi-context support, built-in HTML trace viewer & screenshot APIs, and exact locator parity with `@playwright/mcp`. *(Note: `@playwright/experimental-ct-react` is deprecated and intentionally skipped.)*
2. **Vitest Browser Mode (`@vitest/browser`)** — strong for isolated `'use client'` component tests, but requires adding Vite/Vitest alongside Next.js and mocking App Router/auth/APIs. Deferred unless a large standalone widget library emerges.
3. **Cypress** — heavier footprint, weaker Safari/WebKit and multi-tab/multi-user ergonomics, and paid parallelization.
4. **Storybook 9 + `@storybook/addon-vitest`** — high maintenance cost of maintaining `.stories.tsx` files across all components without replacing E2E coverage.

## Decision

1. **Adopt `@playwright/test` for Real-Browser E2E Testing**:
   - Add `playwright.config.ts` and `tests/e2e/` running Chromium across two viewport projects: `kiosk-desktop` (`1920x1080`) and `mobile-touch` (`390x844`, `hasTouch: true`).
   - Run against an isolated SQLite database (`DATABASE_URL=file:./.tmp-e2e.db`, `JLIGHT_TEST_MODE=true`) via Playwright's `webServer`.
2. **Test-Only Browser Session Bridge (`POST /api/test/session`)**:
   - `setMockTestSession()` in `src/auth.ts` mutates an in-process variable and cannot be called by an external browser process.
   - Introduce `POST /api/test/session` that **strictly returns `404 Not Found`** whenever `process.env.JLIGHT_TEST_MODE !== "true"`. When `JLIGHT_TEST_MODE === "true"`, it ensures a test user and default Galaxy exist in SQLite and sets a real NextAuth v5 JWT cookie (`authjs.session-token`) signed via `resolveAuthSecret()`.
   - This enables both deterministic Playwright `.spec.ts` suites and interactive `@playwright/mcp` AI agents to test authenticated Household Galaxies without Google OAuth.
3. **Playwright MCP (`@playwright/mcp`) for Local Agent Verification**:
   - Autonomous agents use `@playwright/mcp` locally against the dev/test server to inspect live UI state, verify new features, and capture Show & Tell screenshots before requesting human sign-off.
   - CI never runs non-deterministic LLM/MCP loops; CI executes only deterministic `.spec.ts` tests.
4. **GitHub-Hosted `ubuntu-latest` CI with Screenshot & Report Artifacts**:
   - Add an `e2e-playwright` job to `.github/workflows/ci.yml` running on GitHub-hosted `ubuntu-latest` (free for public AGPL-3.0 repositories, safe for fork PRs, consistent Linux font rendering).
   - Upload `playwright-report/` (HTML report + traces) and `test-results/show-and-tell/` (verification PNGs) via `actions/upload-artifact@v4` with `if: always()`.

## Consequences

- **Positive:** Real-browser regression coverage for kiosk & mobile UIs, touch-target enforcement, and downloadable PR verification screenshots/traces on every CI run.
- **Security:** `POST /api/test/session` is hard-gated on `JLIGHT_TEST_MODE === "true"` and covered by a negative `404` assertion in `tests/system.test.ts`; production deployments on Vercel never set `JLIGHT_TEST_MODE`.
- **Trade-offs:** Adds ~1–2 minutes to CI via a parallel `e2e-playwright` job while keeping the existing `ci-verify` job fast.
