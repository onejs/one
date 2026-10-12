import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  nativeSourceContract,
  renderSwiftSourceGlue,
  writeSwiftPackageArtifacts,
} from '../../../packages/vxrn/src/utils/nativeSourceContract'

// compile the generated fixture with strict isolation before building pods.
const fixture = resolve(import.meta.dir, '../native-source')
const artifacts = writeSwiftPackageArtifacts(fixture)
const dateProbe = `@MainActor final class DateProbe: PeachModule {
  init() {}
  func epoch(_ date: Date) -> Double { date.timeIntervalSince1970 }
}`
const contracts = [
  ...artifacts.contracts,
  nativeSourceContract('/probe/DateProbe.swift', dateProbe),
]
const glue = renderSwiftSourceGlue('native_source', contracts).source
const api = readFileSync(resolve(import.meta.dir, '../../../packages/one/ios/OneSwiftPackage.swift'), 'utf8')
const protocols = api.slice(api.indexOf('@MainActor public protocol PeachModule'), api.indexOf('// a package\'s typed views'))
const source = `import Foundation
import SwiftUI
${protocols}
@MainActor enum OneNativeSourceEmitter {
  static var events: [(String, String)] = []
  static var onEvent: ((String, String) -> Void)?
  static func send(_ channel: String, _ args: String) {
    events.append((channel, args))
    onEvent?(channel, args)
    onEvent = nil
  }
}
${Object.keys(artifacts.files).map((file) => readFileSync(join(fixture, file), 'utf8')).join('\n')}
${dateProbe}
${glue}
@main struct NativeSourceProof {
  @MainActor static func main() async throws {
    func call(_ module: String, _ method: String, _ args: String) async throws -> String {
      try await OneNativeSourceBody_native_source.call("native_source." + module, method, args)
    }
    for (input, expected) in [
      ("2026-10-11T12:34:56Z", 1791722096.0),
      ("2026-10-11T12:34:56.123Z", 1791722096.123),
      ("2026-10-11T14:34:56.123+02:00", 1791722096.123)
    ] {
      let args = String(decoding: try JSONSerialization.data(withJSONObject: [input]), as: UTF8.self)
      let result = try await call("DateProbe", "epoch", args)
      guard let epoch = Double(result), abs(epoch - expected) < 0.00001 else {
        fatalError("date round trip: " + input + " => " + result)
      }
    }
    do {
      _ = try await call("DateProbe", "epoch", #"["yesterday"]"#)
      fatalError("invalid date accepted")
    } catch is DecodingError {}
    let blob = try await call("EscapeHatch", "blob", #"["AQID"]"#)
    let decodedBlob = try JSONDecoder().decode(String.self, from: Data(blob.utf8))
    precondition(decodedBlob == "AQID")
    let point = try await call("EscapeHatch", "pin", #"[{"x":1,"y":2,"label":"pin"}]"#)
    let object = try JSONSerialization.jsonObject(with: Data(point.utf8)) as! [String: Any]
    precondition(object["x"] as? Double == 1 && object["y"] as? Double == 2 && object["label"] as? String == "pin")
    let heading = try await call("EscapeHatch", "heading", #"["north"]"#)
    let decodedHeading = try JSONDecoder().decode(String.self, from: Data(heading.utf8))
    precondition(decodedHeading == "north")
    precondition(OneNativeSourceEmitter.events.isEmpty)
    let event: (String, String) = try await withCheckedThrowingContinuation { continuation in
      OneNativeSourceEmitter.onEvent = { channel, args in continuation.resume(returning: (channel, args)) }
      Task {
        do { _ = try await call("EscapeHatch", "onTick", "[]") }
        catch { continuation.resume(throwing: error) }
      }
    }
    precondition(OneNativeSourceEmitter.events.count == 1)
    precondition(event.0 == "OneNativeSource.native_source.EscapeHatch.onTick")
    precondition(event.1 == "[1]")
    print("PASS: generated Swift dates, invalid date, data, struct, enum and subscription")
  }
}
`
const temp = mkdtempSync(join(tmpdir(), 'one-native-source-swift-'))
try {
  const input = join(temp, 'Proof.swift')
  const executable = join(temp, 'proof')
  writeFileSync(input, source)
  const flags = ['-parse-as-library', '-swift-version', '6', '-strict-concurrency=complete']
  const sdk = spawnSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'], { encoding: 'utf8' })
  if (sdk.status !== 0) throw new Error(`iOS SDK lookup failed: ${sdk.stderr}`)
  const ios = spawnSync('swiftc', [...flags, '-typecheck', '-sdk', sdk.stdout.trim(), '-target', 'arm64-apple-ios17.0-simulator', input], { stdio: 'inherit' })
  if (ios.status !== 0) throw new Error(`generated iOS Swift typecheck failed: ${ios.status}`)
  const arch = process.arch === 'arm64' ? 'arm64' : 'x86_64'
  const compile = spawnSync('swiftc', [...flags, '-target', `${arch}-apple-macosx14.0`, input, '-o', executable], { stdio: 'inherit' })
  if (compile.status !== 0) throw new Error(`generated Swift compilation failed: ${compile.status}`)
  const run = spawnSync(executable, [], { stdio: 'inherit' })
  if (run.status !== 0) throw new Error(`generated Swift runtime proof failed: ${run.status}`)
} finally {
  rmSync(temp, { recursive: true, force: true })
}
