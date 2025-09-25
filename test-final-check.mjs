import { chromium } from 'playwright'

async function testFinalCheck() {
  console.log('Final check of URL rewriting feature...\n')
  
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  // Capture console messages
  let errorCount = 0
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('Failed to parse')) {
      errorCount++
    }
  })
  
  try {
    // Test 1: Load test page
    console.log('1. Loading test-rewrites page...')
    await page.goto('http://localhost:8085/test-rewrites')
    await page.waitForTimeout(2000) // Give time for hydration
    
    console.log(`   ✓ Page loaded (${errorCount} parse errors)`)
    
    // Test 2: Check Link hrefs
    console.log('\n2. Checking Link hrefs after hydration...')
    const links = await page.$$eval('a', elements => 
      elements.map(el => ({
        text: el.textContent?.trim(),
        href: el.getAttribute('href'),
        actualHref: el.href // This is what the browser sees
      }))
    )
    
    const subdomainLinks = links.filter(l => 
      l.text && l.text.includes('Subdomain')
    )
    
    console.log(`   Found ${subdomainLinks.length} subdomain links:`)
    subdomainLinks.forEach(link => {
      console.log(`     "${link.text}"`)
      console.log(`       href attribute: ${link.href}`)
      console.log(`       actual href: ${link.actualHref}`)
      const isTransformed = link.actualHref?.includes('.localhost')
      console.log(`       ✓ Transformed to subdomain: ${isTransformed}`)
    })
    
    // Test 3: Direct subdomain access
    console.log('\n3. Testing direct subdomain access...')
    await page.goto('http://app1.localhost:8085/')
    await page.waitForTimeout(1000)
    
    const currentUrl = page.url()
    const pageTitle = await page.textContent('h1')
    console.log(`   Current URL: ${currentUrl}`)
    console.log(`   Page title: ${pageTitle}`)
    console.log(`   ✓ Subdomain routing: ${currentUrl.includes('app1.localhost')}`)
    
    console.log('\n✅ All checks complete!')
    console.log('\nYou can now hover over the links to see the subdomain URLs!')
    console.log('Press Ctrl+C to exit...')
    
    // Keep browser open for manual inspection
    await new Promise(resolve => setTimeout(resolve, 30000))
    
  } finally {
    await browser.close()
  }
}

testFinalCheck().catch(console.error)