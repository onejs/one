#!/usr/bin/env bun
import fs from 'node:fs'
import path from 'node:path'
import {
  countChangedPixels,
  countInkPixels,
  countDistinctColors,
  readPng,
  saveCrop,
} from './visual-pixel-gate'
import { evaluateGeminiOracle, type OracleVerdict } from './visual-gemini-oracle'
import { VISUAL_CHECKS, type VisualCheckDeclaration } from './visual-declarations'

export interface PixelGateResult {
  passed: boolean
  changedPixels: number
  totalPixels: number
  changedRatio: number
  inkPixels: number
  distinctColors: number
  minChangedFloor: number
  minInkFloor: number
  minColorsFloor: number
  nullStateReads: string
  failureReason?: string
}

export interface OracleCheckResult {
  passed: boolean
  positiveVerdict: OracleVerdict
  negativeVerdict: OracleVerdict
  failureReason?: string
}

export interface VisualCheckResult {
  name: string
  suite: string
  subject: string
  positivePath: string
  negativePath: string
  pixelGate: PixelGateResult
  oracle?: OracleCheckResult
  passed: boolean
  durationMs: number
  error?: string
}

export interface VerifyOptions {
  /** Root directory holding captured screenshots (defaults to /tmp/one-native-capture) */
  captureDir?: string
  /** Specific artifact directory for the current suite run (e.g. /tmp/one-native-capture/pickers) */
  artifactDir?: string
  /** If true, runs only the deterministic pixel gating measurements without LLM oracle */
  skipOracle?: boolean
  /** Directory where cropped regions are saved for oracle inspection */
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
 * Verifies a single declared visual check:
 * 1. Resolves positive and negative capture files.
 * 2. Runs deterministic pixel measurements (changed count, ink count, distinct colors).
 *    Fails if changed pixels == 0 (Rule 2: blind crop) or ink/colors below floor (Rule 3).
 * 3. Runs Gemini Vision Oracle on both positive crop and negative crop:
 *    Must PASS on positive crop and FAIL on negative crop (Rule 1).
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

  // Step 1: Gating pixel measurement (deterministic)
  const changed = countChangedPixels(positivePath, negativePath, decl.region)
  const ink = countInkPixels(positivePath, decl.region)
  const colors = countDistinctColors(positivePath, decl.region)

  let gatePassed = true
  let gateReason: string | undefined

  if (changed.changed === 0) {
    gatePassed = false
    gateReason = `Blind crop: 0 of ${changed.total} pixels changed between positive and negative captures inside region.`
  } else if (changed.changed < decl.minChangedPixels) {
    gatePassed = false
    gateReason = `Changed pixels (${changed.changed}) fell below required floor (${decl.minChangedPixels}).`
  } else if (ink.ink < decl.minInkPixels) {
    gatePassed = false
    gateReason = `Ink pixels (${ink.ink}) fell below required floor (${decl.minInkPixels}). Control appears unpainted/flat.`
  } else if (colors < decl.minDistinctColors) {
    gatePassed = false
    gateReason = `Distinct colors (${colors}) fell below required floor (${decl.minDistinctColors}).`
  }

  const pixelGate: PixelGateResult = {
    passed: gatePassed,
    changedPixels: changed.changed,
    totalPixels: changed.total,
    changedRatio: changed.ratio,
    inkPixels: ink.ink,
    distinctColors: colors,
    minChangedFloor: decl.minChangedPixels,
    minInkFloor: decl.minInkPixels,
    minColorsFloor: decl.minDistinctColors,
    nullStateReads: decl.calibration.nullStateReads,
    failureReason: gateReason,
  }

  // If pixel gate failed, fail immediately (fast deterministic gate)
  if (!gatePassed) {
    return {
      name: decl.name,
      suite: decl.suite,
      subject: decl.subject,
      positivePath,
      negativePath,
      pixelGate,
      passed: false,
      durationMs: Date.now() - started,
      error: gateReason,
    }
  }

  // If skipOracle requested, pass based on pixel gate
  if (options.skipOracle) {
    return {
      name: decl.name,
      suite: decl.suite,
      subject: decl.subject,
      positivePath,
      negativePath,
      pixelGate,
      passed: true,
      durationMs: Date.now() - started,
    }
  }

  // Step 2: Gemini Vision Oracle evaluation
  const cropDir = options.cropDir ?? DEFAULT_CROP_DIR
  fs.mkdirSync(cropDir, { recursive: true })

  const posImg = readPng(positivePath)
  const negImg = readPng(negativePath)
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

  let oraclePassed = true
  let oracleReason: string | undefined

  if (!posVerdict.passed) {
    oraclePassed = false
    oracleReason = `Oracle failed on positive capture: ${posVerdict.reason}`
  } else if (negVerdict.passed) {
    oraclePassed = false
    oracleReason = `Oracle incorrectly passed on negative capture: ${negVerdict.reason}`
  }

  const oracle: OracleCheckResult = {
    passed: oraclePassed,
    positiveVerdict: posVerdict,
    negativeVerdict: negVerdict,
    failureReason: oracleReason,
  }

  return {
    name: decl.name,
    suite: decl.suite,
    subject: decl.subject,
    positivePath,
    negativePath,
    pixelGate,
    oracle,
    passed: gatePassed && oraclePassed,
    durationMs: Date.now() - started,
    error: oracleReason,
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

// ==========================================
// CLI Execution
// ==========================================
async function main() {
  const args = process.argv.slice(2)
  let suite: string | undefined
  let checkName: string | undefined
  let artifactDir: string | undefined
  let captureDir = DEFAULT_CAPTURE_DIR
  let skipOracle = false
  let jsonOutput = false
  let runAll = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--suite' && args[i + 1]) suite = args[++i]
    else if (arg === '--check' && args[i + 1]) checkName = args[++i]
    else if (arg === '--artifact-dir' && args[i + 1]) artifactDir = args[++i]
    else if (arg === '--capture-dir' && args[i + 1]) captureDir = args[++i]
    else if (arg === '--skip-oracle') skipOracle = true
    else if (arg === '--json') jsonOutput = true
    else if (arg === '--all') runAll = true
  }

  const options: VerifyOptions = {
    artifactDir,
    captureDir,
    skipOracle,
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

  for (const res of results) {
    const icon = res.passed ? 'PASS' : 'FAIL'
    console.log(`[${icon}] ${res.suite} :: ${res.name} (${res.durationMs}ms)`)
    console.log(`  Subject: ${res.subject}`)
    console.log(
      `  Pixel Gate: ${res.pixelGate.passed ? 'PASS' : 'FAIL'} ` +
        `(changed: ${res.pixelGate.changedPixels.toLocaleString()} / ${res.pixelGate.totalPixels.toLocaleString()}, ` +
        `ink: ${res.pixelGate.inkPixels.toLocaleString()}, colors: ${res.pixelGate.distinctColors})`
    )
    if (res.oracle) {
      console.log(
        `  Gemini Oracle: ${res.oracle.passed ? 'PASS' : 'FAIL'} ` +
          `[Pos: ${res.oracle.positiveVerdict.passed ? 'PASS' : 'FAIL'}, ` +
          `Neg: ${!res.oracle.negativeVerdict.passed ? 'PASS (Failed as req)' : 'FAIL (Passed unexpectedly)'}]`
      )
      if (!res.oracle.passed) {
        console.log(`  Oracle Reason: ${res.oracle.failureReason}`)
      }
    }
    if (!res.passed && res.error) {
      console.log(`  Error: ${res.error}`)
    }
    console.log('')

    if (res.passed) passedCount++
    else failedCount++
  }

  console.log(`Total: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`)
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
