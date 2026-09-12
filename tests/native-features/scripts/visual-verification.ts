#!/usr/bin/env bun
import fs from 'node:fs'
import path from 'node:path'
import { countChangedPixels, extractCrop, readPng, saveCrop } from './visual-pixel-gate'
import { evaluateGeminiOracle, type OracleVerdict } from './visual-gemini-oracle'
import { VISUAL_CHECKS, type VisualCheckDeclaration } from './visual-declarations'

export interface SubjectGateResult {
  passed: boolean
  positiveReading: number
  negativeReading: number
  floor: number
  changedPixels: number
  totalPixels: number
  changedRatio: number
  nullStateReads: string
  crossSubstitutionMatches: number
  corpusSize: number
  swapTestPassed: boolean
  failureReason?: string
}

export interface AdvisoryOracleResult {
  positiveVerdict: OracleVerdict
  negativeVerdict: OracleVerdict
  advisoryPassed: boolean
  commentary?: string
}

export interface VisualCheckResult {
  name: string
  suite: string
  subject: string
  positivePath: string
  negativePath: string
  gate: SubjectGateResult
  oracle?: AdvisoryOracleResult
  passed: boolean
  durationMs: number
  error?: string
}

export interface VerifyOptions {
  /** Root directory holding captured screenshots (defaults to /tmp/one-native-capture) */
  captureDir?: string
  /** Specific artifact directory for the current suite run (e.g. /tmp/one-native-capture/pickers) */
  artifactDir?: string
  /** If true, runs the advisory Gemini Vision Oracle as well */
  oracle?: boolean
  /** Directory where cropped regions are saved for inspection */
  cropDir?: string
  /** Override model for Gemini oracle (defaults to gemini-3.8-flash-low) */
  model?: string
}

const DEFAULT_CAPTURE_DIR = '/tmp/one-native-capture'
const DEFAULT_CROP_DIR = '/tmp/one-native-visual-crops'

export function resolveImagePath(relativePath: string, options: VerifyOptions): string {
  const candidates: string[] = []

  // 1. Check relative to options.artifactDir
  if (options.artifactDir) {
    candidates.push(path.join(options.artifactDir, path.basename(relativePath)))
    candidates.push(path.join(options.artifactDir, relativePath))
  }

  // 2. Check relative to captureDir
  const captureDir = options.captureDir ?? DEFAULT_CAPTURE_DIR
  candidates.push(path.join(captureDir, relativePath))
  candidates.push(path.join(captureDir, path.basename(relativePath)))

  // 3. Check absolute path directly
  if (path.isAbsolute(relativePath)) {
    candidates.push(relativePath)
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(
    `Screenshot '${relativePath}' not found in any candidate location:\n  ${candidates.join('\n  ')}`
  )
}

/**
 * Verifies a single declared visual check using directional subject-specific deterministic measurement.
 *
 * Gating assertions (enforced deterministically):
 * 1. Positive capture reading MUST be >= decl.minSubjectFloor (proves control painted).
 * 2. Negative capture reading MUST be < decl.minSubjectFloor (enforces swap test: negative MUST fail).
 * 3. Changed pixels between pair inside region MUST be > 0 (Rule 2: crop intersects subject).
 *
 * Gemini Vision Oracle is demoted to advisory and only runs when requested.
 */
export async function verifyVisualCheck(
  checkOrName: string | VisualCheckDeclaration,
  options: VerifyOptions = {}
): Promise<VisualCheckResult> {
  const started = Date.now()
  const decl: VisualCheckDeclaration =
    typeof checkOrName === 'string'
      ? VISUAL_CHECKS.find((c) => c.name === checkOrName)!
      : checkOrName

  if (!decl) {
    throw new Error(`Visual check declaration '${checkOrName}' not found`)
  }

  const positivePath = resolveImagePath(decl.positiveCapture, options)
  const negativePath = resolveImagePath(decl.negativeCapture, options)

  const posImg = readPng(positivePath)
  const negImg = readPng(negativePath)

  const posCrop = extractCrop(posImg, decl.region)
  const negCrop = extractCrop(negImg, decl.region)

  // Step 1: Directional subject-specific measurements
  const posReading = decl.measureSubject(posCrop)
  const negReading = decl.measureSubject(negCrop)
  const changed = countChangedPixels(positivePath, negativePath, decl.region, 8)

  const positivePass = posReading >= decl.minSubjectFloor
  const swapTestPass = negReading < decl.minSubjectFloor
  const cropIntersects = changed.changed > 0

  let gatePassed = true
  let gateReason: string | undefined

  if (!cropIntersects) {
    gatePassed = false
    gateReason = `Blind crop: 0 of ${changed.total} pixels changed inside region.`
  } else if (!positivePass) {
    gatePassed = false
    gateReason = `Positive capture measurement (${posReading.toLocaleString()}) fell below required floor (${decl.minSubjectFloor.toLocaleString()}). Control appears unpainted.`
  } else if (!swapTestPass) {
    gatePassed = false
    gateReason = `Swap test failed: negative capture unexpectedly met subject floor (${negReading.toLocaleString()} >= ${decl.minSubjectFloor.toLocaleString()}). Measurement is not discriminating.`
  }

  const gate: SubjectGateResult = {
    passed: gatePassed,
    positiveReading: posReading,
    negativeReading: negReading,
    floor: decl.minSubjectFloor,
    changedPixels: changed.changed,
    totalPixels: changed.total,
    changedRatio: changed.ratio,
    nullStateReads: decl.calibration.nullStateReads,
    crossSubstitutionMatches: decl.calibration.crossSubstitutionMatches,
    corpusSize: decl.calibration.corpusSize,
    swapTestPassed: swapTestPass,
    failureReason: gateReason,
  }

  // Step 2: Advisory Oracle (optional, non-gating)
  let oracle: AdvisoryOracleResult | undefined
  if (options.oracle) {
    const cropDir = options.cropDir ?? DEFAULT_CROP_DIR
    fs.mkdirSync(cropDir, { recursive: true })

    const posCropPath = path.join(cropDir, `${decl.name}-pos.png`)
    const negCropPath = path.join(cropDir, `${decl.name}-neg.png`)
    saveCrop(posImg, decl.region, posCropPath)
    saveCrop(negImg, decl.region, negCropPath)

    const posVerdict = await evaluateGeminiOracle(posCropPath, decl.prompt, {
      model: options.model,
    })
    const negVerdict = await evaluateGeminiOracle(negCropPath, decl.prompt, {
      model: options.model,
    })

    const advisoryPassed = posVerdict.passed && !negVerdict.passed
    oracle = {
      positiveVerdict: posVerdict,
      negativeVerdict: negVerdict,
      advisoryPassed,
      commentary: advisoryPassed
        ? `Advisory oracle confirmed: pos passed, neg rejected.`
        : `Advisory oracle divergence: pos=${posVerdict.passed}, neg=${negVerdict.passed}`,
    }
  }

  return {
    name: decl.name,
    suite: decl.suite,
    subject: decl.subject,
    positivePath,
    negativePath,
    gate,
    oracle,
    passed: gatePassed,
    durationMs: Date.now() - started,
    error: gateReason,
  }
}

/**
 * Verifies all visual checks declared for a specific suite.
 */
export async function verifySuiteVisuals(
  suite: string,
  options: VerifyOptions = {}
): Promise<VisualCheckResult[]> {
  const suiteChecks = VISUAL_CHECKS.filter((c) => c.suite === suite)
  if (suiteChecks.length === 0) {
    return []
  }

  const results: VisualCheckResult[] = []
  for (const check of suiteChecks) {
    const res = await verifyVisualCheck(check, options)
    results.push(res)
  }
  return results
}

/**
 * Verifies all declared visual checks across all suites.
 */
export async function runAllVisualChecks(
  options: VerifyOptions = {}
): Promise<VisualCheckResult[]> {
  const results: VisualCheckResult[] = []
  for (const check of VISUAL_CHECKS) {
    const res = await verifyVisualCheck(check, options)
    results.push(res)
  }
  return results
}

/**
 * Runs the explicit swap test across checks:
 * Feeds each check its OWN negative capture as the subject, asserting that the subject
 * measurement fails to meet the floor. Proves the deterministic gate is discriminating
 * and directional rather than symmetric.
 */
export async function runSwapTest(options: VerifyOptions = {}): Promise<{
  passed: boolean
  rejectedCount: number
  totalCount: number
  failures: string[]
}> {
  let rejectedCount = 0
  const failures: string[] = []

  for (const decl of VISUAL_CHECKS) {
    const swappedDecl: VisualCheckDeclaration = {
      ...decl,
      positiveCapture: decl.negativeCapture,
      negativeCapture: decl.positiveCapture,
    }
    const res = await verifyVisualCheck(swappedDecl, options)
    if (!res.passed) {
      rejectedCount++
    } else {
      failures.push(
        `${decl.suite} :: ${decl.name} (reading ${res.gate.positiveReading} met floor ${decl.minSubjectFloor})`
      )
    }
  }

  return {
    passed: rejectedCount === VISUAL_CHECKS.length,
    rejectedCount,
    totalCount: VISUAL_CHECKS.length,
    failures,
  }
}

export interface CrossSubstitutionResult {
  name: string
  suite: string
  floor: number
  matches: number
  total: number
  matchingCaptures: string[]
}

/**
 * Runs the cross-substitution test across all corpus PNGs:
 * For each check, applies its measureSubject over its own region to all 70 corpus captures
 * and counts how many clear the floor. High-specificity subject detectors will match only
 * their own positive (or genuine sibling instances of the same control).
 */
export async function runCrossSubstitutionTest(
  options: VerifyOptions = {}
): Promise<CrossSubstitutionResult[]> {
  const captureDir = options.captureDir ?? DEFAULT_CAPTURE_DIR
  const suites = fs.readdirSync(captureDir)
  const allPngs: { suite: string; file: string; fullPath: string; rel: string }[] = []
  for (const s of suites) {
    const sPath = path.join(captureDir, s)
    if (!fs.statSync(sPath).isDirectory()) continue
    for (const f of fs.readdirSync(sPath)) {
      if (f.endsWith('.png')) {
        allPngs.push({
          suite: s,
          file: f,
          fullPath: path.join(sPath, f),
          rel: `${s}/${f}`,
        })
      }
    }
  }

  const results: CrossSubstitutionResult[] = []
  for (const decl of VISUAL_CHECKS) {
    let matches = 0
    const matchingCaptures: string[] = []
    for (const imgInfo of allPngs) {
      const img = readPng(imgInfo.fullPath)
      const crop = extractCrop(img, decl.region)
      const val = decl.measureSubject(crop)
      if (val >= decl.minSubjectFloor) {
        matches++
        matchingCaptures.push(imgInfo.rel)
      }
    }
    results.push({
      name: decl.name,
      suite: decl.suite,
      floor: decl.minSubjectFloor,
      matches,
      total: allPngs.length,
      matchingCaptures,
    })
  }
  return results
}

// ==========================================
// CLI Execution
// ==========================================
async function main() {
  const args = process.argv.slice(2)
  let suite: string | undefined
  let checkName: string | undefined
  let artifactDir: string | undefined
  let captureDir = DEFAULT_CAPTURE_DIR
  let runOracle = false
  let jsonOutput = false
  let swapTestMode = false
  let crossSubMode = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--suite' && args[i + 1]) suite = args[++i]
    else if (arg === '--check' && args[i + 1]) checkName = args[++i]
    else if (arg === '--artifact-dir' && args[i + 1]) artifactDir = args[++i]
    else if (arg === '--capture-dir' && args[i + 1]) captureDir = args[++i]
    else if (arg === '--oracle') runOracle = true
    else if (arg === '--swap-test') swapTestMode = true
    else if (arg === '--cross-sub' || arg === '--cross-substitution') crossSubMode = true
    else if (arg === '--json') jsonOutput = true
  }

  const options: VerifyOptions = {
    artifactDir,
    captureDir,
    oracle: runOracle,
  }

  if (crossSubMode) {
    console.log(
      '\n=== RUNNING CROSS-SUBSTITUTION SPECIFICITY TEST (ALL 70 CORPUS CAPTURES) ===\n'
    )
    const crossResults = await runCrossSubstitutionTest(options)
    for (const r of crossResults) {
      console.log(
        `${r.name.padEnd(28)} ${r.matches.toString().padStart(2)} / ${r.total} matches (floor: ${r.floor.toLocaleString().padStart(7)}): ${r.matchingCaptures.join(', ')}`
      )
    }
    console.log('')
    process.exit(0)
  }

  if (swapTestMode) {
    console.log('\n=== RUNNING DIRECTIONAL SWAP TEST (FEED NEGATIVE AS SUBJECT) ===\n')
    const swap = await runSwapTest(options)
    for (const decl of VISUAL_CHECKS) {
      const swappedDecl: VisualCheckDeclaration = {
        ...decl,
        positiveCapture: decl.negativeCapture,
        negativeCapture: decl.positiveCapture,
      }
      const res = await verifyVisualCheck(swappedDecl, options)
      const rejected = !res.passed
      console.log(
        `[${rejected ? 'REJECTED as required' : 'FAILED (Passed unexpectedly)'}] ${decl.suite} :: ${decl.name}`
      )
      console.log(
        `  Negative reading: ${res.gate.positiveReading.toLocaleString()} (floor: ${decl.minSubjectFloor.toLocaleString()})`
      )
    }
    console.log(
      `\nSwap Test Rejection: ${swap.rejectedCount} / ${swap.totalCount} (${(
        (swap.rejectedCount / swap.totalCount) *
        100
      ).toFixed(1)}%)\n`
    )
    if (!swap.passed) {
      console.error(`Swap test failures:\n  ${swap.failures.join('\n  ')}`)
      process.exit(1)
    }
    process.exit(0)
  }

  let results: VisualCheckResult[] = []

  if (checkName) {
    results = [await verifyVisualCheck(checkName, options)]
  } else if (suite) {
    results = await verifySuiteVisuals(suite, options)
  } else {
    results = await runAllVisualChecks(options)
  }

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2))
    const allPassed = results.every((r) => r.passed)
    process.exit(allPassed ? 0 : 1)
  }

  console.log('\n=== ONE NATIVE VISUAL VERIFICATION RESULTS ===\n')
  let passedCount = 0
  let failedCount = 0
  let swapPassCount = 0

  for (const res of results) {
    const icon = res.passed ? 'PASS' : 'FAIL'
    console.log(`[${icon}] ${res.suite} :: ${res.name} (${res.durationMs}ms)`)
    console.log(`  Subject: ${res.subject}`)
    console.log(
      `  Subject Gate: ${res.gate.passed ? 'PASS' : 'FAIL'} ` +
        `(positive: ${res.gate.positiveReading.toLocaleString()} >= ${res.gate.floor.toLocaleString()}, ` +
        `swap negative: ${res.gate.negativeReading.toLocaleString()} < ${res.gate.floor.toLocaleString()})`
    )
    console.log(
      `  Changed pixels: ${res.gate.changedPixels.toLocaleString()} / ${res.gate.totalPixels.toLocaleString()} ` +
        `(${(res.gate.changedRatio * 100).toFixed(1)}%)`
    )
    console.log(
      `  Cross-substitution: ${res.gate.crossSubstitutionMatches} / ${res.gate.corpusSize} matches (${res.gate.nullStateReads})`
    )

    if (res.gate.swapTestPassed) swapPassCount++

    if (res.oracle) {
      const oIcon = res.oracle.advisoryPassed ? 'PASS' : 'NOTE'
      console.log(
        `  Advisory Oracle [${oIcon}]: Pos: ${res.oracle.positiveVerdict.passed ? 'true' : 'false'}, ` +
          `Neg: ${res.oracle.negativeVerdict.passed ? 'true' : 'false'}`
      )
      console.log(`    Commentary: ${res.oracle.commentary}`)
    }
    if (!res.passed && res.error) {
      console.log(`  Error: ${res.error}`)
    }
    console.log('')

    if (res.passed) passedCount++
    else failedCount++
  }

  console.log(
    `Total Checks: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount} | Swap Test (Neg Rejected): ${swapPassCount}/${results.length}`
  )

  if (failedCount > 0) {
    process.exit(1)
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('Fatal visual verification error:', err)
    process.exit(1)
  })
}
