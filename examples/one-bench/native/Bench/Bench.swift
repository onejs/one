import Darwin
import UIKit

@MainActor final class Bench: NSObject, PeachModule {
  private var frameContinuation: CheckedContinuation<Double, Never>?
  private var displayLink: CADisplayLink?
  override init() { super.init() }

  func arguments() -> [String] { ProcessInfo.processInfo.arguments }

  func environment() -> [String: String] {
    var system = utsname()
    uname(&system)
    let model = withUnsafeBytes(of: &system.machine) { bytes in
      String(decoding: bytes.prefix(while: { $0 != 0 }), as: UTF8.self)
    }
    return ["device": model, "os": UIDevice.current.systemVersion,
      "lowPowerMode": String(ProcessInfo.processInfo.isLowPowerModeEnabled),
      "thermalState": String(ProcessInfo.processInfo.thermalState.rawValue)]
  }

  func processElapsed() throws -> Double {
    var process = kinfo_proc()
    var size = MemoryLayout<kinfo_proc>.stride
    var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
    guard sysctl(&mib, u_int(mib.count), &process, &size, nil, 0) == 0 else {
      throw NSError(domain: NSPOSIXErrorDomain, code: Int(errno))
    }
    let start = process.kp_proc.p_starttime
    return (Date().timeIntervalSince1970 - Double(start.tv_sec) - Double(start.tv_usec) / 1_000_000) * 1000
  }

  func footprint() throws -> Double {
    var info = task_vm_info_data_t()
    var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<integer_t>.size)
    let status = withUnsafeMutablePointer(to: &info) { pointer in
      pointer.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
        task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
      }
    }
    guard status == KERN_SUCCESS else { throw NSError(domain: NSMachErrorDomain, code: Int(status)) }
    return Double(info.phys_footprint) / 1_048_576
  }

  func frame() async -> Double {
    await withCheckedContinuation { continuation in
      precondition(frameContinuation == nil)
      frameContinuation = continuation
      let link = CADisplayLink(target: self, selector: #selector(frameTick))
      displayLink = link
      link.add(to: .main, forMode: .common)
    }
  }

  @objc private func frameTick(_ link: CADisplayLink) {
    link.invalidate()
    displayLink = nil
    frameContinuation?.resume(returning: ProcessInfo.processInfo.systemUptime * 1000)
    frameContinuation = nil
  }

  func log(_ line: String) {
    FileHandle.standardOutput.write(Data((line + "\n").utf8))
  }

  func finish() { exit(0) }
}
