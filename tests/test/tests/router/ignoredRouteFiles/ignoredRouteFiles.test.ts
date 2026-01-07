import { type Browser, type BrowserContext, chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const serverUrl = process.env.ONE_SERVER_URL;
const isDebug = !!process.env.DEBUG;

let browser: Browser;
let context: BrowserContext;

beforeAll(async () => {
  browser = await chromium.launch({ headless: !isDebug });
  context = await browser.newContext();
});

afterAll(async () => {
  await browser.close();
});

test("ignoredRouteFiles", async () => {
  const page = await context.newPage();

  await page.goto(serverUrl + "/router/ignoredRouteFiles/route.normal");
  expect(
    await page.$('[data-testid="ignoredRouteFiles-route-normal"]'),
    "normal route file should not be ignored",
  ).not.toBeNull();

  await page.goto(serverUrl + "/router/ignoredRouteFiles/route-1.should-be-ignored");
  expect(
    await page.$('[data-testid="ignoredRouteFiles-not-found"]'),
    "route file matching ignoredRouteFiles should be ignored, should show not found page",
  ).not.toBeNull();

  await page.goto(serverUrl + "/router/ignoredRouteFiles/route-2.should-be-ignored");
  expect(
    await page.$('[data-testid="ignoredRouteFiles-not-found"]'),
    "route file matching ignoredRouteFiles should be ignored, should show not found page",
  ).not.toBeNull();
});
