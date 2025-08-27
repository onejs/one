import { chromium } from 'playwright'

async function testLinkNavigation() {
  console.log('Testing subdomain link navigation with port preservation...\n')
  
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    // Test 1: Load test page
    console.log('1. Loading test-rewrites page...')
    await page.goto('http://localhost:8081/test-rewrites')
    await page.waitForTimeout(2000) // Wait for hydration
    
    // Test 2: Check link href includes port
    console.log('\n2. Checking subdomain links have correct port...')
    const linkInfo = await page.evaluate(() => {
      const link = document.querySelector('a[href*="subdomain"]')
      if (!link) return null
      return {
        text: link.textContent,
        href: link.getAttribute('href'),
        actualHref: link.href,
        includesPort: link.href.includes(':8081')
      }
    })
    
    console.log(`   Link text: "${linkInfo?.text?.trim()}"`)
    console.log(`   href attribute: ${linkInfo?.href}`)
    console.log(`   actual href (with port): ${linkInfo?.actualHref}`)
    console.log(`   ✓ Includes port :8081: ${linkInfo?.includesPort}`)
    
    if (!linkInfo?.includesPort) {
      console.error('   ❌ ERROR: Port not preserved in subdomain URL!')
    }
    
    // Test 3: Click the link and verify navigation
    console.log('\n3. Clicking subdomain link...')
    const beforeUrl = page.url()
    console.log(`   Before click: ${beforeUrl}`)
    
    // Click the first subdomain link
    await page.click('a[href*="subdomain"]:first-of-type')
    await page.waitForTimeout(2000) // Wait for navigation
    
    const afterUrl = page.url()
    const pageContent = await page.textContent('h1')
    console.log(`   After click: ${afterUrl}`)
    console.log(`   Page H1: ${pageContent}`)
    
    // Verify we're on the subdomain URL with port
    const isSubdomainUrl = afterUrl.includes('.localhost:8081')
    console.log(`   ✓ Navigated to subdomain URL: ${isSubdomainUrl}`)
    
    if (!isSubdomainUrl) {
      console.error('   ❌ ERROR: Navigation failed - not on subdomain URL!')
    }
    
    // Test 4: Navigate back and try another link
    console.log('\n4. Testing navigation back...')
    await page.goBack()
    await page.waitForTimeout(1000)
    
    const backUrl = page.url()
    console.log(`   Back to: ${backUrl}`)
    console.log(`   ✓ Back navigation works: ${backUrl.includes('/test-rewrites')}`)
    
    // Test 5: Direct subdomain access with port
    console.log('\n5. Testing direct subdomain access with port...')
    await page.goto('http://app1.localhost:8081/')
    await page.waitForTimeout(1000)
    
    const directUrl = page.url()
    const directContent = await page.textContent('h1')
    console.log(`   Direct access URL: ${directUrl}`)
    console.log(`   Page content: ${directContent}`)
    console.log(`   ✓ Direct access works: ${directUrl.includes('app1.localhost:8081')}`)
    
    console.log('\n✅ All navigation tests complete!')
    console.log('\nKeeping browser open for 10 seconds for manual inspection...')
    await page.waitForTimeout(10000)
    
  } catch (error) {
    console.error('Test failed:', error)
  } finally {
    await browser.close()
  }
}

testLinkNavigation().catch(console.error)