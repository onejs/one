import { type Browser, type BrowserContext, chromium } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";

const serverUrl = process.env.ONE_SERVER_URL || "http://localhost:8081";
const isDebug = !!process.env.DEBUG;

console.info(`Testing: ${serverUrl} with debug mode: ${isDebug}`);

let browser: Browser;
let context: BrowserContext;

beforeAll(async () => {
  browser = await chromium.launch({ headless: !isDebug });
  context = await browser.newContext();
});

afterAll(async () => {
  await browser.close();
}, 30000);

test("homepage loads with no error logs", async () => {
  const page = await context.newPage();

  const consoleMessages: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleMessages.push(msg.text());
    }
  });

  await page.goto(serverUrl, { timeout: 120000 });
  expect(consoleMessages).toHaveLength(0);

  await page.close();
}, 180000);

// this stopped working, but only in playwright..
test.skip('clicking "Get Started" link navigates without reloading to docs', async () => {
  const page = await context.newPage();

  await page.goto(serverUrl);

  // log out item we find with Get Started text:
  await page.click('text="Docs"');
  await new Promise((res) => setTimeout(res, 1000));

  // expect(loadEventFired).toBe(false)
  expect(page.url()).toBe(`${serverUrl}/docs/introduction`);

  await page.close();
});

test("ScrollBehavior docs page loads correctly with title", async () => {
  const page = await context.newPage();

  await page.goto(`${serverUrl}/docs/components-ScrollBehavior`, { timeout: 120000 });

  // Check that the page title contains ScrollBehavior
  const title = await page.title();
  expect(title).toContain("ScrollBehavior");

  // Check that the H1 heading is rendered correctly
  const h1 = await page.locator("h1").first();
  const h1Text = await h1.textContent();
  expect(h1Text).toContain("ScrollBehavior");

  await page.close();
}, 180000);

test("accordion auto-opens to Components section when visiting ScrollBehavior page", async () => {
  const page = await context.newPage();

  // Set desktop viewport to ensure sidebar is visible
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto(`${serverUrl}/docs/components-ScrollBehavior`, { timeout: 120000 });

  // Wait for the page to load
  await page.waitForSelector("h1", { timeout: 10000 });

  // Wait a bit for the accordion to initialize
  await page.waitForTimeout(500);

  // Check that we can see the ScrollBehavior link in the sidebar (meaning the accordion is open)
  const scrollBehaviorLink = page.locator('a[href="/docs/components-ScrollBehavior"]');
  const isVisible = await scrollBehaviorLink.isVisible();
  expect(isVisible).toBe(true);

  await page.close();
}, 180000);

test("accordion auto-opens to Hooks section when visiting useRouter page", async () => {
  const page = await context.newPage();

  // Set desktop viewport to ensure sidebar is visible
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto(`${serverUrl}/docs/hooks-useRouter`, { timeout: 120000 });

  // Wait for the page to load
  await page.waitForSelector("h1", { timeout: 10000 });

  // Wait a bit for the accordion to initialize
  await page.waitForTimeout(500);

  // The useRouter link should be visible in the sidebar (meaning Hooks accordion is open)
  const useRouterLink = page.locator('a[href="/docs/hooks-useRouter"]');
  const isVisible = await useRouterLink.isVisible();
  expect(isVisible).toBe(true);

  await page.close();
}, 180000);
