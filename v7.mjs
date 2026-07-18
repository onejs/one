import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 900, height: 800 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto('http://localhost:8081/forum', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(1500)
// Click on the content area of the first card — should navigate to thread
const contentText = page.locator('text=/The main event is stacked this time/').first()
await contentText.click()
await page.waitForTimeout(1500)
console.log('after content click url:', page.url())
// go back, then click author name
await page.goto('http://localhost:8081/forum', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(1500)
const authorName = page.locator('text=IronFistMike').first()
await authorName.click()
await page.waitForTimeout(1500)
console.log('after author click url:', page.url())
await browser.close()
