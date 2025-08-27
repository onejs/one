import { chromium } from 'playwright'

async function testEnvVariable() {
  console.log('Testing ONE_URL_REWRITES environment variable...')
  
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  
  try {
    await page.goto('http://localhost:8083/test-rewrites')
    
    // Check what's actually in the built code
    const scriptContent = await page.evaluate(() => {
      // Check all script tags for ONE_URL_REWRITES
      const scripts = Array.from(document.querySelectorAll('script'))
      const results = []
      
      for (const script of scripts) {
        const src = script.src || 'inline'
        const text = script.textContent || ''
        if (text.includes('ONE_URL_REWRITES')) {
          results.push({
            src,
            found: text.substring(text.indexOf('ONE_URL_REWRITES') - 50, text.indexOf('ONE_URL_REWRITES') + 100)
          })
        }
      }
      
      return {
        scriptMatches: results,
        processEnv: typeof process !== 'undefined' ? process.env.ONE_URL_REWRITES : 'no process',
        importMetaEnv: typeof import.meta !== 'undefined' ? import.meta.env?.ONE_URL_REWRITES : 'no import.meta'
      }
    })
    
    console.log('Script analysis:', JSON.stringify(scriptContent, null, 2))
    
    // Check network requests to see what's being sent
    const responses = []
    page.on('response', response => {
      const url = response.url()
      if (url.includes('.js') || url.includes('.mjs')) {
        responses.push(url)
      }
    })
    
    await page.reload()
    await page.waitForTimeout(1000)
    
    console.log('\nJS files loaded:')
    responses.slice(0, 5).forEach(r => console.log('  -', r))
    
  } finally {
    await browser.close()
  }
}

testEnvVariable().catch(console.error)