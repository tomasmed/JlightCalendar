import { test, expect } from "@playwright/test";
import {
  captureShowAndTell,
  loginAsTestUser,
  stubExternalNetwork,
} from "./helpers";

test.describe("JlightCalendar Real-Browser E2E Flows", () => {
  test.beforeEach(async ({ page }) => {
    await stubExternalNetwork(page);
  });

  test("Landing page & Ephemeral Comet creation without OAuth", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /One Shared Calendar Everyone Actually Checks/i,
      })
    ).toBeVisible();

    await captureShowAndTell(page, `${testInfo.project.name}-landing`);

    // Launch an Ephemeral Comet (no sign-in required)
    const cometNameInput = page.getByPlaceholder(
      /e\.g\. Q4 Sprint, Cabin Weekend/i
    );
    await cometNameInput.fill("Weekend Cabin Trip");

    const creatorInput = page.getByPlaceholder(/e\.g\. Alex/i);
    await creatorInput.fill("Sam");

    const launchBtn = cometNameInput
      .locator("xpath=ancestor::form")
      .locator('button[type="submit"]');
    await launchBtn.click();

    // Should transition into the Comet workspace with Calendar & Lists tabs
    await expect(page.getByText("Weekend Cabin Trip").first()).toBeVisible({
      timeout: 15_000,
    });

    await captureShowAndTell(page, `${testInfo.project.name}-comet-workspace`);
  });

  test("Authenticated Household Galaxy: Calendar, Themes (Creamy & OSL), Chores & Lists", async ({
    page,
  }, testInfo) => {
    const session = await loginAsTestUser(page, {
      email: `e2e-${testInfo.project.name}@jlight.test`,
      name: "Captain Alice",
      galaxyName: "Sol Family Kiosk",
    });

    // Seed a sample event via API so the calendar immediately displays rich content
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const eventRes = await page.request.post("/api/events", {
      data: {
        galaxyId: session.galaxyId,
        title: "Family Taco Night",
        startTime: `${todayStr}T18:00:00`,
        endTime: `${todayStr}T19:30:00`,
        isAllDay: false,
      },
    });
    expect(eventRes.ok()).toBeTruthy();

    await page.goto("/");

    // Wait for authenticated workspace & seeded event to appear (visible in desktop grid or mobile split agenda)
    await expect(
      page.getByText("Family Taco Night").locator("visible=true").first()
    ).toBeVisible({
      timeout: 15_000,
    });

    // Capture default Creamy (Mocha) theme screenshot
    await captureShowAndTell(page, `${testInfo.project.name}-calendar-creamy`);

    // Switch to OSL Neon theme (Over-Volt Blue) via Theme Studio
    const themeTrigger = page
      .getByRole("button", { name: /Open Theme Studio/i })
      .locator("visible=true")
      .first();
    await expect(themeTrigger).toBeVisible();
    await themeTrigger.click();

    const oslThemeBtn = page
      .locator('[data-testid="theme-option-over-volt-blue"]')
      .locator("visible=true")
      .first();
    await expect(oslThemeBtn).toBeVisible();
    await oslThemeBtn.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      "over-volt-blue"
    );
    await captureShowAndTell(page, `${testInfo.project.name}-calendar-osl`);

    // Navigate to Chores tab and verify touch ergonomics + interactive flow
    const choresTab = page
      .getByRole("button", { name: /^Chores$/i })
      .locator("visible=true")
      .first();
    await expect(choresTab).toBeVisible();

    const choresBox = await choresTab.boundingBox();
    expect(choresBox).not.toBeNull();
    if (choresBox) {
      expect(choresBox.height).toBeGreaterThanOrEqual(40);
    }

    await choresTab.click();
    await expect(
      page.getByRole("heading", { name: /Chores/i }).locator("visible=true").first()
    ).toBeVisible({ timeout: 10_000 });

    await captureShowAndTell(page, `${testInfo.project.name}-chores`);

    // Navigate to Lists tab, add a grocery item, and verify it renders
    const listsTab = page
      .getByRole("button", { name: /^Lists$/i })
      .locator("visible=true")
      .first();
    await listsTab.click();

    const addInput = page.locator('input[type="text"]').first();
    await expect(addInput).toBeVisible({ timeout: 10_000 });
    await addInput.fill("Avocados for Taco Night");
    await addInput.press("Enter");

    await expect(page.getByText("Avocados for Taco Night")).toBeVisible({
      timeout: 10_000,
    });

    await captureShowAndTell(page, `${testInfo.project.name}-lists`);
  });
});
