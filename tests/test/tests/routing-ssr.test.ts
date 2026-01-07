import { type Browser, type BrowserContext, chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

describe(`SSR Routing Tests`, () => {
  // it('should render the SSR page', async () => {
  //   const response = await fetch(`${serverUrl}/ssr/basic`)
  //   const html = await response.text()
  //   expect(html).toContain('This is a basic SSR page')
  // })

  // it('should return 200 status for the SSR page', async () => {
  //   const response = await fetch(`${serverUrl}/ssr/basic`)
  //   expect(response.status).toBe(200)
  // })

  it(`Dynamic SSR pages should navigate between and use loaders properly`, async () => {
    const page = await context.newPage();

    await page.goto(`${serverUrl}/ssr/sub/page`);

    expect(await page.textContent("#params")).toContain(`{"rest":["sub","page"]}`);
    expect(await page.textContent("#data")).toContain(`"sub/page"`);

    await page.click(`#test-change-sub-route`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(page.url()).toBe(`${serverUrl}/ssr/sub/page-next`);
    expect(await page.textContent("#params")).toContain(`{"rest":["sub","page-next"]}`);
    expect(await page.textContent("#data")).toContain(`"sub/page-next"`);

    await page.click(`#test-change-sub-route`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(page.url()).toBe(`${serverUrl}/ssr/sub/page-next-next`);
    expect(await page.textContent("#params")).toContain(`{"rest":["sub","page-next-next"]}`);
    expect(await page.textContent("#data")).toContain(`"sub/page-next-next"`);

    await page.close();
  });

  it(`SSR loader should receive request parameter`, async () => {
    const page = await context.newPage();

    await page.goto(`${serverUrl}/ssr/request-test`);

    // Verify that the loader received a request object
    expect(await page.textContent("#has-request")).toBe("true");

    // Verify the request method is GET
    expect(await page.textContent("#request-method")).toBe('"GET"');

    // Verify the request URL contains the correct path
    const requestUrl = await page.textContent("#request-url");
    expect(requestUrl).toContain("/ssr/request-test");

    // Verify user agent is present
    const userAgent = await page.textContent("#user-agent");
    expect(userAgent).not.toBe("null");
    expect(userAgent).not.toBe("undefined");

    // Verify path is correct
    expect(await page.textContent("#path")).toBe('"/ssr/request-test"');

    // Verify params is an empty object for this route
    expect(await page.textContent("#params")).toBe("{}");

    await page.close();
  });

  it(`SSR loader should receive request parameter with dynamic route params`, async () => {
    const page = await context.newPage();
    const testId = "test-123";

    await page.goto(`${serverUrl}/ssr/${testId}/request-test`);

    // Verify that the loader received a request object
    expect(await page.textContent("#has-request")).toBe("true");

    // Verify the request method is GET
    expect(await page.textContent("#request-method")).toBe('"GET"');

    // Verify the request URL contains the correct path
    const requestUrl = await page.textContent("#request-url");
    expect(requestUrl).toContain(`/ssr/${testId}/request-test`);

    // Verify user agent is present
    const userAgent = await page.textContent("#user-agent");
    expect(userAgent).not.toBe("null");
    expect(userAgent).not.toBe("undefined");

    // Verify path is correct
    expect(await page.textContent("#path")).toBe(`"/ssr/${testId}/request-test"`);

    // Verify params contains the id
    expect(await page.textContent("#params")).toBe(`{"id":"${testId}"}`);

    // Verify id is extracted correctly
    expect(await page.textContent("#id")).toBe(`"${testId}"`);

    await page.close();
  });
});
