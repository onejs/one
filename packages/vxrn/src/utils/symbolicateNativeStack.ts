import {
  TraceMap,
  originalPositionFor,
  sourceContentFor,
} from '@jridgewell/trace-mapping'

/**
 * A frame as React Native's LogBox posts it to /symbolicate, and as it expects
 * one back. `lineNumber` is 1-based and `column` is 0-based, matching both the
 * device's stack parser and the source-map spec.
 */
export type NativeStackFrame = {
  file?: string | null
  lineNumber?: number | null
  column?: number | null
  methodName?: string | null
  collapse?: boolean
}

export type NativeCodeFrame = {
  content: string
  location: { row: number; column: number }
  fileName: string
}

export type SymbolicateResult = {
  stack: NativeStackFrame[]
  codeFrame: NativeCodeFrame | null
}

/**
 * A frame is ours when it points at a JS bundle served over HTTP by this dev
 * server. Every other frame (a native frame, `[native code]`, an HMR eval) is
 * handed back untouched so the client still renders a complete stack.
 */
export function isNativeBundleFrame(file: string | null | undefined): boolean {
  if (!file) return false
  if (!/^https?:\/\//.test(file)) return false
  // react native appends its query with `//&` in some versions and `?` in
  // others, so cut at whichever separator comes first before testing the path.
  const path = file.split(/[?#]|\/\/&/)[0]
  return /\.(?:bundle|js)$/.test(path)
}

/**
 * The platform a frame's bundle was built for. React Native always carries it
 * in the bundle URL, and it is what decides which platform's map resolves the
 * frame.
 */
export function getNativeFramePlatform(file: string | null | undefined): string | null {
  return file?.match(/[?&/]platform=([a-z]+)/)?.[1] ?? null
}

const CODE_FRAME_CONTEXT = 3

function buildCodeFrame(
  source: string,
  content: string,
  line: number,
  column: number
): NativeCodeFrame {
  const lines = content.split('\n')
  const first = Math.max(1, line - CODE_FRAME_CONTEXT)
  const last = Math.min(lines.length, line + CODE_FRAME_CONTEXT)
  const gutter = String(last).length
  const rendered: string[] = []
  for (let n = first; n <= last; n++) {
    const marker = n === line ? '>' : ' '
    rendered.push(`${marker} ${String(n).padStart(gutter)} | ${lines[n - 1]}`)
    if (n === line) {
      rendered.push(`  ${' '.repeat(gutter)} | ${' '.repeat(column)}^`)
    }
  }
  return {
    content: rendered.join('\n'),
    location: { row: line, column },
    fileName: source,
  }
}

/**
 * Resolve every bundle frame in a React Native stack back to the authored file,
 * line, and column through the bundle's source map.
 *
 * `map` is the serialized map: it is parsed per request rather than kept
 * resident, because a parsed map for a multi-megabyte bundle costs far more
 * memory than a dev server should hold for something only a crash reads.
 */
export function symbolicateNativeStack(
  stack: NativeStackFrame[],
  map: string
): SymbolicateResult {
  const traced = new TraceMap(JSON.parse(map))
  let codeFrame: NativeCodeFrame | null = null

  const symbolicated = stack.map((frame) => {
    if (!isNativeBundleFrame(frame.file) || !frame.lineNumber) return frame

    const original = originalPositionFor(traced, {
      line: frame.lineNumber,
      column: frame.column ?? 0,
    })
    if (!original.source) return frame

    if (!codeFrame && original.line != null) {
      const content = sourceContentFor(traced, original.source)
      if (content) {
        codeFrame = buildCodeFrame(
          original.source,
          content,
          original.line,
          original.column ?? 0
        )
      }
    }

    return {
      ...frame,
      file: original.source,
      lineNumber: original.line ?? frame.lineNumber,
      column: original.column ?? frame.column,
      // the map's `names` come from the transform chain and are not function
      // names here, so the device's own methodName stays authoritative.
      methodName: frame.methodName,
    }
  })

  return { stack: symbolicated, codeFrame }
}
