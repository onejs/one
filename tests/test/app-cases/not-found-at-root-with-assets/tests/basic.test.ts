import { type Browser, type BrowserContext, chromium } from "playwright";
import { afterAll, beforeAll, expect, test } from "vitest";

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

test("not-found page", async () => {
  const page = await context.newPage();
  await page.goto(serverUrl + "/this-does-not-exist");

  expect(await page.getByTestId("not-found-page-content").textContent()).toEqual(
    "This is the not-found page.",
  );

  await page.close();
});

test("image asset", async () => {
  const page = await context.newPage();
  await page.goto(serverUrl + "/");

  const pngAsset = await page.getByTestId("sample-asset-png");

  // Check that the image has loaded correctly (not a broken image).
  // In the browser, when an <img> fails to load (e.g., 404, missing file),
  // its naturalWidth and naturalHeight will be 0.
  // A successfully loaded image will have naturalWidth > 0 and naturalHeight > 0.
  const { naturalWidth, naturalHeight } = await pngAsset.evaluate((el) => {
    const img = el as HTMLImageElement;
    return { naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight };
  });
  expect(naturalWidth, "PNG asset should load correctly").toBeGreaterThan(0);
  expect(naturalHeight, "PNG asset should load correctly").toBeGreaterThan(0);

  await page.close();
});
