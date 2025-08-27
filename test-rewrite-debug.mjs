import { chromium } from 'playwright'

async function testRewriteFeature() {
  console.log('Starting rewrite feature test...')
  
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Failed')) {
      console.log('Console error:', msg.text())
    }
  })
  
  try {
    // Test 1: Load test-rewrites page
    console.log('\n1. Loading test-rewrites page...')
    await page.goto('http://localhost:8083/test-rewrites')
    await page.waitForTimeout(1000)
    
    // Check for errors in console
    const pageContent = await page.content()
    console.log('   Page loaded:', pageContent.includes('URL Rewriting Test Page'))
    
    // Test 2: Check Link hrefs
    console.log('\n2. Checking Link hrefs...')
    const links = await page.locator('a[href*="/subdomain/"]').all()
    console.log(`   Found ${links.length} subdomain links`)
    
    for (const link of links) {
      const href = await link.getAttribute('href')
      const text = await link.textContent()
      console.log(`   Link: "${text?.trim()}" -> href="${href}"`)
    }
    
    // Test 3: Test subdomain access directly
    console.log('\n3. Testing subdomain access...')
    await page.goto('http://app1.localhost:8083/')
    await page.waitForTimeout(1000)
    
    const currentUrl = page.url()
    console.log(`   After navigation, URL is: ${currentUrl}`)
    
    const h1Text = await page.textContent('h1')
    console.log(`   Page H1: ${h1Text}`)
    
    // Check if we got redirected incorrectly
    if (!currentUrl.includes('app1.localhost')) {
      console.log('   ERROR: Got redirected away from subdomain!')
    }
    
    // Test 4: Check environment variable
    console.log('\n4. Checking ONE_URL_REWRITES...')
    const envCheck = await page.evaluate(() => {
      const results = {}
      try {
        if (typeof process !== 'undefined' && process.env.ONE_URL_REWRITES) {
          results.processEnv = process.env.ONE_URL_REWRITES
        }
      } catch (e) {
        results.processError = e.message
      }
      
      try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.ONE_URL_REWRITES) {
          // @ts-ignore
          results.importMeta = import.meta.env.ONE_URL_REWRITES
        }
      } catch (e) {
        results.importMetaError = e.message
      }
      
      return results
    })
    console.log('   Environment check:', JSON.stringify(envCheck, null, 2))
    
    // Test 5: Check if rewrites are being applied
    console.log('\n5. Testing rewrite function...')
    const rewriteTest = await page.evaluate(() => {
      // Import the rewrite functions
      try {
        // Try to access the rewrite config
        const getConfig = () => {
          if (typeof process !== 'undefined' && process.env.ONE_URL_REWRITES) {
            try {
              return JSON.parse(process.env.ONE_URL_REWRITES)
            } catch {
              return { error: 'Failed to parse process.env' }
            }
          }
          return { error: 'No env var found' }
        }
        
        return {
          config: getConfig(),
          hasReverseRewrite: typeof window.reverseRewrite === 'function',
        }
      } catch (e) {
        return { error: e.message }
      }
    })
    console.log('   Rewrite test:', JSON.stringify(rewriteTest, null, 2))
    
  } finally {
    await browser.close()
  }
}

testRewriteFeature().catch(console.error)