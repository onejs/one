/**
 * Test script to verify that server-only code (like @vxrn/mdx) is not included
 * in the native bundle.
 *
 * Usage: yarn test:native-bundle
 *
 * This script:
 * 1. Starts the Metro dev server
 * 2. Fetches the iOS bundle
 * 3. Checks that @vxrn/mdx code is NOT present in the bundle
 * 4. Checks that the loader function is properly tree-shaken
 */

import { spawn, type ChildProcess } from 'node:child_process'

const METRO_PORT = 8081
const BUNDLE_URL = `http://localhost:${METRO_PORT}/index.bundle?platform=ios&dev=true&minify=false`

// Strings that should NOT appear in the native bundle
const FORBIDDEN_STRINGS = [
  'mdx-bundler', // @vxrn/mdx dependency
  'getAllFrontmatter', // function from @vxrn/mdx used in loader
  'getMDXBySlug', // another function from @vxrn/mdx
  '@vxrn/mdx', // the package name itself
]

// Strings that SHOULD appear (to verify bundle loaded correctly)
const REQUIRED_STRINGS = [
  'Home Page', // from our component
  '__vxrn__loader__', // empty loader marker
]

async function waitForServer(url: string, maxWaitMs = 60000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    try {
      const response = await fetch(url.replace('/index.bundle', '/status'), {
        signal: AbortSignal.timeout(2000),
      })
      if (response.ok) {
        return
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Server did not start within ${maxWaitMs}ms`)
}

async function fetchBundle(): Promise<string> {
  console.log(`Fetching bundle from ${BUNDLE_URL}...`)
  const response = await fetch(BUNDLE_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch bundle: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

function checkBundle(bundleContent: string): { passed: boolean; errors: string[] } {
  const errors: string[] = []

  // Check that forbidden strings are NOT present
  for (const forbidden of FORBIDDEN_STRINGS) {
    if (bundleContent.includes(forbidden)) {
      errors.push(`FAIL: Bundle contains forbidden string: "${forbidden}"`)
    } else {
      console.log(`PASS: Bundle does not contain: "${forbidden}"`)
    }
  }

  // Check that required strings ARE present
  for (const required of REQUIRED_STRINGS) {
    if (!bundleContent.includes(required)) {
      errors.push(`FAIL: Bundle missing required string: "${required}"`)
    } else {
      console.log(`PASS: Bundle contains required: "${required}"`)
    }
  }

  return { passed: errors.length === 0, errors }
}

async function main() {
  let metroProcess: ChildProcess | null = null

  try {
    console.log('Starting Metro dev server...')

    // Start the dev server
    metroProcess = spawn('yarn', ['dev'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    })

    // Log Metro output for debugging
    metroProcess.stdout?.on('data', (data) => {
      const str = data.toString()
      if (str.includes('error') || str.includes('Error')) {
        console.error('[Metro]', str)
      }
    })
    metroProcess.stderr?.on('data', (data) => {
      console.error('[Metro stderr]', data.toString())
    })

    console.log('Waiting for Metro server to be ready...')
    await waitForServer(`http://localhost:${METRO_PORT}`)
    console.log('Metro server is ready!')

    // Wait a bit for Metro to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Fetch and check the bundle
    const bundleContent = await fetchBundle()
    console.log(`Bundle size: ${(bundleContent.length / 1024).toFixed(2)} KB`)

    const { passed, errors } = checkBundle(bundleContent)

    if (!passed) {
      console.error('\n=== TEST FAILED ===')
      for (const error of errors) {
        console.error(error)
      }
      process.exit(1)
    }

    console.log('\n=== ALL TESTS PASSED ===')
    console.log('Server-only code (@vxrn/mdx) was successfully tree-shaken from native bundle!')
    process.exit(0)
  } catch (error) {
    console.error('Test failed with error:', error)
    process.exit(1)
  } finally {
    if (metroProcess) {
      metroProcess.kill('SIGTERM')
    }
  }
}

main()
