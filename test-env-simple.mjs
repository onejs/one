import { chromium } from 'playwright'

async function testEnvVariable() {
  console.log('Testing ONE_URL_REWRITES environment variable...')
  
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Failed')) {
      console.log('Console:', msg.text())
    }
  })
  
  try {
    await page.goto('http://localhost:8084/test-rewrites')
    await page.waitForTimeout(1000)
    
    // Check if env vars are defined
    const envCheck = await page.evaluate(() => {
      const result = {
        hasProcess: typeof process !== 'undefined',
        hasImportMeta: false,
        processValue: 'not found',
        importMetaValue: 'not found'
      }
      
      if (typeof process !== 'undefined' && process.env && process.env.ONE_URL_REWRITES) {
        result.processValue = process.env.ONE_URL_REWRITES
      }
      
      try {
        if (import.meta && import.meta.env && import.meta.env.ONE_URL_REWRITES) {
          result.hasImportMeta = true
          result.importMetaValue = import.meta.env.ONE_URL_REWRITES
        }
      } catch (e) {
        // ignore
      }
      
      return result
    })
    
    console.log('\nEnvironment check:', envCheck)
    
    // Now check Link hrefs
    const links = await page.$$eval('a[href*="/subdomain/"]', elements => 
      elements.map(el => ({
        text: el.textContent,
        href: el.getAttribute('href')
      }))
    )
    
    console.log('\nLinks found:')
    links.forEach(link => {
      console.log(`  "${link.text.trim()}" -> ${link.href}`)
    })
    
    // Check if links have been transformed
    const hasSubdomainUrl = links.some(l => l.href && l.href.includes('.localhost'))
    console.log('\nLinks transformed to subdomain URLs:', hasSubdomainUrl)
    
  } finally {
    await browser.close()
  }
}

testEnvVariable().catch(console.error)