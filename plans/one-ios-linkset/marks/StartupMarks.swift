import Darwin
import Foundation

// writes "<name> <ms>" where ms is milliseconds since this process started, to the file
// named by STARTUP_TRACE (simctl passes SIMCTL_CHILD_STARTUP_TRACE through).
func startupMark(_ name: String) {
  var info = kinfo_proc()
  var size = MemoryLayout<kinfo_proc>.stride
  var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
  sysctl(&mib, 4, &info, &size, nil, 0)
  let started = info.kp_proc.p_un.__p_starttime
  var now = timeval()
  gettimeofday(&now, nil)
  let ms = Double(now.tv_sec - started.tv_sec) * 1000 + Double(now.tv_usec - started.tv_usec) / 1000
  guard let path = ProcessInfo.processInfo.environment["STARTUP_TRACE"] else { return }
  let fd = open(path, O_WRONLY | O_APPEND | O_CREAT, 0o644)
  guard fd >= 0 else { return }
  let line = "\(name) \(ms)\n"
  _ = line.withCString { write(fd, $0, strlen($0)) }
  close(fd)
}
