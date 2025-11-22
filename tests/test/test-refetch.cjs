const { chromium } = require('playwright')

async function testRefetch() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newContext().then(c => c.newPage())

  console.log('Testing SSG refetch at http://localhost:3002/test-refetch')

  await page.goto('http://localhost:3002/test-refetch')
  await page.waitForTimeout(1000) // Wait for hydration

  // Get initial data
  const initialTimestamp = await page.textContent('text=Timestamp:').then(t => t.split(': ')[1])
  const initialServerCount = await page.textContent('text=Server Count:').then(t => t.split(': ')[1])
  const initialClientCount = await page.textContent('text=Client Refetch Count:').then(t => t.split(': ')[1])

  console.log('Initial state:')
  console.log('  Timestamp:', initialTimestamp)
  console.log('  Server Count:', initialServerCount)
  console.log('  Client Count:', initialClientCount)

  // Click refetch button
  console.log('\nClicking refetch button...')
  await page.click('button:has-text("Refetch Loader")')
  await page.waitForTimeout(2000) // Wait for refetch

  // Get new data
  const newTimestamp = await page.textContent('text=Timestamp:').then(t => t.split(': ')[1])
  const newServerCount = await page.textContent('text=Server Count:').then(t => t.split(': ')[1])
  const newClientCount = await page.textContent('text=Client Refetch Count:').then(t => t.split(': ')[1])

  console.log('\nAfter refetch:')
  console.log('  Timestamp:', newTimestamp)
  console.log('  Server Count:', newServerCount)
  console.log('  Client Count:', newClientCount)

  // Check if refetch worked
  if (newTimestamp !== initialTimestamp) {
    console.log('\n✅ SUCCESS: Timestamp changed, refetch worked!')
  } else {
    console.log('\n❌ FAILED: Timestamp did not change')
    console.log('  Expected: Different timestamp')
    console.log('  Got: Same timestamp')
  }

  if (newClientCount === '1') {
    console.log('✅ Client count incremented correctly')
  } else {
    console.log('❌ Client count did not increment as expected')
  }

  await browser.close()
}

testRefetch().catch(console.error)