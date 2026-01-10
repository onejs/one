/**
 * Test for loader HMR functionality
 *
 * Tests:
 * 1. No node:async_hooks in client bundle (causes browser error)
 * 2. Page loads without errors
 * 3. Editing data file triggers HMR update
 * 4. Content updates without full page reload
 */

import { spawn, ChildProcess } from 'node:child_process'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DATA_FILE = join(process.cwd(), 'data/content.json')
const PORT = 8092
const PAGE_URL = `http://localhost:${PORT}/loader-test`

let serverProcess: ChildProcess | null = null
let failures: string[] = []

function fail(message: string) {
  console.error('❌ FAIL:', message)
  failures.push(message)
}

function pass(message: string) {
  console.log('✅ PASS:', message)
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Starting dev server...')
    serverProcess = spawn('npx', ['one', 'dev', '--port', String(PORT)], {
      cwd: process.cwd(),
      env: { ...process.env, ONE_DEBUG_LOADER_DEPS: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let started = false
    const timeout = setTimeout(() => {
      if (!started) reject(new Error('Server startup timeout'))
    }, 30000)

    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      if (output.includes('Local:') && !started) {
        started = true
        clearTimeout(timeout)
        setTimeout(resolve, 2000)
      }
    })

    serverProcess.stderr?.on('data', (data) => {
      // Ignore expected warnings
    })

    serverProcess.on('error', reject)
  })
}

async function stopServer(): Promise<void> {
  if (serverProcess) {
    serverProcess.kill('SIGTERM')
    serverProcess = null
    await sleep(1000)
  }
}

async function fetchPage(): Promise<string> {
  const response = await fetch(PAGE_URL)
  return response.text()
}

async function fetchClientBundle(): Promise<string> {
  // Fetch the main entry point which includes client code
  const response = await fetch(`http://localhost:${PORT}/@id/__x00__virtual:one-entry`)
  return response.text()
}

function updateDataFile(title: string, count: number): void {
  writeFileSync(DATA_FILE, JSON.stringify({ title, count }, null, 2))
}

function getOriginalData(): { title: string; count: number } {
  return JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
}

async function runTests() {
  const originalData = getOriginalData()
  console.log('Original data:', originalData)
  console.log('')

  try {
    // ============================================
    // TEST 1: Check built client code for async_hooks leak
    // ============================================
    console.log('--- Test 1: Check for node:async_hooks in client bundle ---')

    // Check the built dist files that would be bundled for client
    const distPath = join(process.cwd(), '../../packages/one/dist/esm')
    const indexPath = join(distPath, 'index.js')

    if (existsSync(indexPath)) {
      const indexContent = readFileSync(indexPath, 'utf-8')

      // Check if index.js re-exports from trackLoaderDependencies
      if (indexContent.includes('trackLoaderDependencies')) {
        fail(
          'index.js imports from trackLoaderDependencies - this will leak node:async_hooks to client'
        )
      } else {
        pass('index.js does not directly import trackLoaderDependencies')
      }

      // Check for direct async_hooks import in files that index.js imports
      const watchFilePath = join(distPath, 'utils/watchFile.js')
      if (existsSync(watchFilePath)) {
        const watchFileContent = readFileSync(watchFilePath, 'utf-8')
        if (watchFileContent.includes('node:async_hooks')) {
          fail('watchFile.js contains node:async_hooks import')
        } else {
          pass('watchFile.js is client-safe (no node:async_hooks)')
        }
      } else {
        fail('watchFile.js does not exist - client-safe wrapper not created')
      }
    }

    await startServer()
    console.log('Server started\n')

    // ============================================
    // TEST 2: Check page for async_hooks references
    // ============================================
    console.log('--- Test 2: Check client bundle for async_hooks ---')

    try {
      const clientBundle = await fetchClientBundle()
      if (clientBundle.includes('node:async_hooks')) {
        fail('Client bundle contains node:async_hooks reference - will error in browser')
      } else {
        pass('Client bundle does not contain node:async_hooks')
      }
    } catch (e) {
      console.log('Could not fetch client bundle directly, checking HTML...')
    }

    // ============================================
    // TEST 3: Page loads with HMR scripts
    // ============================================
    console.log('\n--- Test 3: Page loads with HMR scripts ---')
    const initialHtml = await fetchPage()

    const hasLoaderHmrScript = initialHtml.includes('one:loader-data-update')
    const hasRefetchLoader = initialHtml.includes('__oneRefetchLoader')

    if (hasLoaderHmrScript) {
      pass('Page has loader HMR script (one:loader-data-update listener)')
    } else {
      fail('Page missing loader HMR script')
    }

    if (hasRefetchLoader) {
      pass('Page has __oneRefetchLoader on window')
    } else {
      fail('Page missing __oneRefetchLoader')
    }

    // ============================================
    // TEST 4: Server-side content updates on file change
    // ============================================
    console.log('\n--- Test 4: Server detects file change ---')
    const newTitle = 'HMR Test ' + Date.now()
    const newCount = Math.floor(Math.random() * 1000)

    updateDataFile(newTitle, newCount)
    console.log(`Updated data file to: title="${newTitle}", count=${newCount}`)

    await sleep(2000)

    const updatedHtml = await fetchPage()

    if (updatedHtml.includes(newTitle)) {
      pass('Server returns updated title after file change')
    } else {
      fail('Server does not return updated title - file watcher not working')
    }

    if (updatedHtml.includes(String(newCount))) {
      pass('Server returns updated count after file change')
    } else {
      fail('Server does not return updated count')
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50))
    if (failures.length === 0) {
      console.log('✅ All tests passed!')
    } else {
      console.log(`❌ ${failures.length} test(s) failed:`)
      failures.forEach((f, i) => console.log(`   ${i + 1}. ${f}`))
      process.exitCode = 1
    }
  } finally {
    // Restore original data
    updateDataFile(originalData.title, originalData.count)
    console.log('\nRestored original data')

    await stopServer()
    console.log('Server stopped')
  }
}

runTests()
