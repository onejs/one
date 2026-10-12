// the ios pedometer permission probe must never stop a live step-count
// watch: requestPermissions probes CoreMotion while undetermined, and a watch
// started during the probe must keep delivering after the probe callback
// fires. runs the exact landed HybridOnePedometer.swift against stubbed
// CoreMotion, Nitro and scheduler seams, so no copy can drift from the
// shipped code. needs the swift toolchain, so it only runs on macos (runIf
// precedent: compileNativeDevBytecode.test.ts). the android pedometer needs
// no equivalent: its permission flow never touches the step-counter sensor.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const swiftPath = join(
  import.meta.dirname,
  '..',
  'ios',
  'Nitro',
  'HybridOnePedometer.swift'
)

const prelude = `import Foundation

// --- test seams: synchronous scheduler. asyncAfter drops its poll, which
// models the race window: permission still pending while a watch starts.
enum TestMain {
  static func async(_ work: @escaping () -> Void) { work() }
  static func sync<T>(_ work: () -> T) -> T { work() }
  static func asyncAfter(deadline: DispatchTime, execute work: @escaping () -> Void) {}
}

// --- test seams: CoreMotion ---
enum CMAuthorizationStatus {
  case authorized, denied, restricted, notDetermined
}

final class CMPedometerData {
  var numberOfSteps: NSNumber
  init(steps: Double = 0) {
    numberOfSteps = NSNumber(value: steps)
  }
}

final class CMPedometer {
  typealias Handler = (CMPedometerData?, Error?) -> Void
  struct Registration {
    let owner: CMPedometer
    let handler: Handler
  }
  static var testAuthorization: CMAuthorizationStatus = .notDetermined
  static var testAvailable = true
  static var testStarts = 0
  static var testStops = 0
  static var testRegistrations: [Registration] = []
  var testActive = false
  var testHandler: Handler?
  static func authorizationStatus() -> CMAuthorizationStatus {
    return testAuthorization
  }
  static func isStepCountingAvailable() -> Bool {
    return testAvailable
  }
  func startUpdates(from start: Date, withHandler handler: @escaping Handler) {
    CMPedometer.testStarts += 1
    testActive = true
    testHandler = handler
    CMPedometer.testRegistrations.append(Registration(owner: self, handler: handler))
  }
  func stopUpdates() {
    CMPedometer.testStops += 1
    testActive = false
    testHandler = nil
  }
  func queryPedometerData(
    from start: Date, to end: Date, withHandler handler: @escaping Handler
  ) {
    handler(CMPedometerData(), nil)
  }
}

// --- test seams: Nitro ---
struct PedometerResult {
  var steps: Double
  init(steps: Double) {
    self.steps = steps
  }
}

enum PedometerPermissionStatus {
  case granted, denied, undetermined
}

struct PedometerPermissionResponse {
  var status: PedometerPermissionStatus
  var granted: Bool
  var canAskAgain: Bool
  init(status: PedometerPermissionStatus, granted: Bool, canAskAgain: Bool) {
    self.status = status
    self.granted = granted
    self.canAskAgain = canAskAgain
  }
}

open class HybridOnePedometerSpec {}

final class Promise<T> {
  var testResult: T?
  var testError: Error?
  func resolve(withResult result: T) {
    testResult = result
  }
  func reject(withError error: Error) {
    testError = error
  }
}

struct TestNativeError: Error {
  let code: String
  let message: String
}

func oneNativeError(_ code: String, _ message: String) -> Error {
  return TestNativeError(code: code, message: message)
}
`

const driver = `
// --- race driver: probe pending while a live watch starts ---
CMPedometer.testAuthorization = .notDetermined
CMPedometer.testAvailable = true
var delivered: [Double] = []
let module = HybridOnePedometer()
let permission: Promise<PedometerPermissionResponse>
do {
  permission = try module.requestPermissions()
  _ = try module.watchStepCount { delivered.append($0.steps) }
} catch {
  print("probe setup threw: \\(error)")
  exit(2)
}
if CMPedometer.testStarts != 2 {
  print("probe setup wrong: starts=\\(CMPedometer.testStarts), expected 2")
  exit(2)
}
if permission.testResult != nil {
  print("probe setup wrong: permission already resolved")
  exit(2)
}
// the in-flight probe callback executes after the live watch started.
CMPedometer.testRegistrations[0].handler(CMPedometerData(), nil)
let live = CMPedometer.testRegistrations[1]
let liveActive = live.owner.testActive && live.owner.testHandler != nil
print("RAN permission/watch race: starts=\\(CMPedometer.testStarts); stops=\\(CMPedometer.testStops); live watch active=\\(liveActive); expected=true")
if !liveActive {
  print("PERMISSION PROBE exit=1")
  exit(1)
}
live.handler(CMPedometerData(steps: 5), nil)
if delivered != [5] {
  print("live watch delivered \\(delivered), expected [5]")
  print("PERMISSION PROBE exit=1")
  exit(1)
}
print("PERMISSION PROBE exit=0")
`

function probeSource(): string {
  const landed = readFileSync(swiftPath, 'utf8')
  const body = landed
    .split('\n')
    .filter((line) => line !== 'import CoreMotion' && line !== 'import NitroModules')
    .join('\n')
    .split('DispatchQueue.main.asyncAfter')
    .join('TestMain.asyncAfter')
    .split('DispatchQueue.main.async')
    .join('TestMain.async')
    .split('DispatchQueue.main.sync')
    .join('TestMain.sync')
  // harness guard, not a product claim: every scheduler hop must run through
  // the synchronous test seam or the race below would pass vacuously. the
  // import lines are code-only matches; comments may still name the frameworks.
  if (
    body.includes('DispatchQueue') ||
    body.includes('import CoreMotion') ||
    body.includes('import NitroModules')
  )
    throw new Error(
      'pedometer race probe: unmapped dependency in HybridOnePedometer.swift'
    )
  return `${prelude}\n${body}\n${driver}\n`
}

function commandOutput(error: unknown): string {
  const result = error as { stdout?: unknown; stderr?: unknown; message?: string }
  const text = (value: unknown) =>
    typeof value === 'string' ? value : (value as Buffer | undefined)?.toString() || ''
  return `${text(result.stdout)}${text(result.stderr)}${result.message || ''}`.trim()
}

describe('pedometer permission probe', () => {
  // swiftc compiles here, so this test sizes its own timeout for that.
  it.runIf(process.platform === 'darwin')(
    'keeps a live watch active after the probe callback fires',
    { timeout: 120_000 },
    () => {
      try {
        execFileSync('which', ['swiftc'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } catch {
        throw new Error('pedometer race probe needs swiftc (xcode command line tools)')
      }
      const dir = mkdtempSync(join(tmpdir(), 'pedometer-race-'))
      const source = join(dir, 'probe.swift')
      writeFileSync(source, probeSource(), 'utf8')
      const binary = join(dir, 'probe')
      try {
        execFileSync('swiftc', ['-suppress-warnings', '-o', binary, source], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } catch (error) {
        throw new Error(`pedometer race probe did not compile:\n${commandOutput(error)}`)
      }
      let output: string
      try {
        output = execFileSync(binary, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } catch (error) {
        throw new Error(`permission probe stopped the live watch:\n${commandOutput(error)}`)
      }
      expect(output).toContain('PERMISSION PROBE exit=0')
    }
  )
})
