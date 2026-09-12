import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'

const execFileAsync = promisify(execFile)

export interface OracleVerdict {
  passed: boolean
  reason: string
  rawOutput?: string
}

export interface OracleOptions {
  model?: string
  effort?: 'low' | 'medium' | 'high'
  timeoutMs?: number
  agyPath?: string
}

const DEFAULT_AGY_PATH = '/Users/n8/.local/bin/agy'
const DEFAULT_MODEL = 'gemini-3.8-flash-low'
const DEFAULT_EFFORT = 'low'
const DEFAULT_TIMEOUT_MS = 35_000

export async function evaluateGeminiOracle(
  imageOrCropPath: string,
  assertionPrompt: string,
  options: OracleOptions = {}
): Promise<OracleVerdict> {
  if (!fs.existsSync(imageOrCropPath)) {
    throw new Error(`Oracle target image does not exist: ${imageOrCropPath}`)
  }

  const agyPath =
    options.agyPath ?? (fs.existsSync(DEFAULT_AGY_PATH) ? DEFAULT_AGY_PATH : 'agy')
  const model = options.model ?? DEFAULT_MODEL
  const effort = options.effort ?? DEFAULT_EFFORT
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const prompt = `You are an automated visual testing verification oracle.
Inspect the image file at ${imageOrCropPath} using your view_file tool.
Verification Assertion: ${assertionPrompt}

Evaluate whether the assertion is TRUE based purely on the visible visual elements painted in this image.
Respond ONLY with a valid JSON object formatted exactly as:
{
  "passed": true/false,
  "reason": "concise explanation of what was visually observed"
}`

  try {
    const { stdout, stderr } = await execFileAsync(
      agyPath,
      ['--model', model, '--effort', effort, '-p', prompt],
      {
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          // ensure PATH is preserved
          PATH: process.env.PATH,
        },
      }
    )

    const raw = stdout.trim()
    return parseOracleResponse(raw)
  } catch (err: any) {
    return {
      passed: false,
      reason: `Oracle execution failed: ${err.message || String(err)}`,
      rawOutput: err.stdout || err.stderr,
    }
  }
}

export function parseOracleResponse(raw: string): OracleVerdict {
  // Extract JSON from potential markdown code blocks ```json ... ``` or raw {...}
  let jsonStr = raw
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  } else {
    const braceStart = raw.indexOf('{')
    const braceEnd = raw.lastIndexOf('}')
    if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
      jsonStr = raw.slice(braceStart, braceEnd + 1).trim()
    }
  }

  try {
    const parsed = JSON.parse(jsonStr)
    return {
      passed: Boolean(parsed.passed),
      reason: String(parsed.reason ?? ''),
      rawOutput: raw,
    }
  } catch (parseErr) {
    // Fallback heuristic if LLM produced plain text
    const lower = raw.toLowerCase()
    const passed =
      lower.includes('"passed": true') ||
      (lower.includes('passed: true') && !lower.includes('not passed'))
    return {
      passed,
      reason: `Parsed with fallback: ${raw.slice(0, 200)}`,
      rawOutput: raw,
    }
  }
}
