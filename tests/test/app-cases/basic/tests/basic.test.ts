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

test("index page", async () => {
  const page = await context.newPage();
  await page.goto(serverUrl + "/");

  expect(await page.textContent("#content")).toEqual("Hello, this is the basic app test case!");

  await page.close();
});

test("api", async () => {
  const res = await fetchThing("/api", "json");
  expect(res).toMatchInlineSnapshot(`
    {
      "api": "works under app-cases/basic/app",
    }
  `);
});

test("middleware", async () => {
  const res = await fetchThing("/?test-middleware", "json");
  expect(res).toMatchInlineSnapshot(`
    {
      "middleware": "works under app-cases/basic/app",
    }
  `);
});

test(".d.ts files should not become routes", async () => {
  // Test that test-types.d.ts doesn't become a route
  // In prod mode, non-existent routes return 404
  // In dev mode, they return 200 with SPA shell (client-side routing)
  // Either way, the actual .d.ts file content should NOT be served

  const page = await context.newPage();
  await page.goto(serverUrl + "/test-types");

  // The critical test: page should NOT contain the TypeScript file content
  const content = await page.textContent("body");
  expect(content).not.toContain("export interface TestType");
  expect(content).not.toContain("interface TestType"); // Also check without export
  expect(content).not.toContain(".d.ts file"); // From our comment in the file

  await page.close();
});

async function fetchThing(path = "/", type: "text" | "json" | "headers") {
  return await fetch(`${process.env.ONE_SERVER_URL}${path}`).then((res) => {
    if (type === "headers") {
      return res.headers;
    }
    return res[type]();
  });
}
