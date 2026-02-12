import Cocoa
import SwiftUI
import Foundation
import AVFoundation

// MARK: - IPC types (mirrors daemon types.ts)

struct ServerInfo: Codable, Identifiable, Equatable {
    let id: String
    let port: Int
    let bundleId: String
    let root: String
}

struct SimulatorInfo: Codable, Identifiable, Equatable {
    let name: String
    let udid: String
    let state: String
    let iosVersion: String?

    var id: String { udid }
}

struct DaemonStatus: Codable {
    let servers: [ServerInfo]
    let simulators: [SimulatorInfo]
    let simulatorRoutes: [String: String]?
    let routeMode: String?
}

struct IPCStatusResponse: Codable {
    let type: String
    let servers: [IPCServer]?
    let routes: [IPCRoute]?
}

struct IPCServer: Codable {
    let id: String
    let port: Int
    let bundleId: String
    let root: String
}

struct IPCRoute: Codable {
    let key: String
    let serverId: String
    let createdAt: Double
}

// MARK: - Socket client (unix domain socket to ~/.one/daemon.sock)

class SocketClient {
    static let socketPath: String = {
        NSString(string: "~/.one/daemon.sock").expandingTildeInPath
    }()

    static func send(_ command: String) -> [String: Any]? {
        let sock = socket(AF_UNIX, SOCK_STREAM, 0)
        guard sock >= 0 else { return nil }
        defer { close(sock) }

        var addr = sockaddr_un()
        addr.sun_family = sa_family_t(AF_UNIX)

        let pathBytes = socketPath.utf8CString
        withUnsafeMutablePointer(to: &addr.sun_path) { ptr in
            let raw = UnsafeMutableRawPointer(ptr)
            pathBytes.withUnsafeBufferPointer { buf in
                raw.copyMemory(from: buf.baseAddress!, byteCount: min(buf.count, 104))
            }
        }

        let addrLen = socklen_t(MemoryLayout<sockaddr_un>.size)
        let connectResult = withUnsafePointer(to: &addr) { ptr in
            ptr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockPtr in
                Foundation.connect(sock, sockPtr, addrLen)
            }
        }

        guard connectResult == 0 else { return nil }

        // send with newline delimiter (daemon protocol)
        let msg = command + "\n"
        let data = msg.data(using: .utf8)!
        data.withUnsafeBytes { ptr in
            _ = Foundation.send(sock, ptr.baseAddress!, data.count, 0)
        }

        var buffer = [UInt8](repeating: 0, count: 65536)
        let bytesRead = recv(sock, &buffer, buffer.count, 0)
        guard bytesRead > 0 else { return nil }

        let responseData = Data(buffer[0..<bytesRead])
        // strip trailing newline if present
        let trimmed: Data
        if let last = responseData.last, last == 0x0A {
            trimmed = responseData.dropLast()
        } else {
            trimmed = responseData
        }
        guard let json = try? JSONSerialization.jsonObject(with: trimmed) as? [String: Any] else {
            return nil
        }

        return json
    }

    static func sendIPCMessage(_ type: String, extra: [String: Any] = [:]) -> [String: Any]? {
        var msg: [String: Any] = ["type": type]
        for (k, v) in extra { msg[k] = v }
        guard let data = try? JSONSerialization.data(withJSONObject: msg),
              let str = String(data: data, encoding: .utf8) else { return nil }
        return send(str)
    }
}

// MARK: - HTTP client (localhost:8081/__daemon/status)

class DaemonHTTPClient {
    static var port: Int = 8081

    static func fetchStatus(completion: @escaping (DaemonStatus?) -> Void) {
        guard let url = URL(string: "http://localhost:\(port)/__daemon/status") else {
            completion(nil)
            return
        }

        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil else {
                completion(nil)
                return
            }
            let status = try? JSONDecoder().decode(DaemonStatus.self, from: data)
            completion(status)
        }
        task.resume()
    }

    static func setSimulatorRoute(simulatorUdid: String, serverId: String, completion: ((Bool) -> Void)? = nil) {
        guard let url = URL(string: "http://localhost:\(port)/__daemon/simulator-route?simulatorUdid=\(simulatorUdid)&serverId=\(serverId)") else {
            completion?(false)
            return
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        let task = URLSession.shared.dataTask(with: req) { _, response, error in
            let ok = error == nil && (response as? HTTPURLResponse)?.statusCode == 200
            completion?(ok)
        }
        task.resume()
    }

    static func clearSimulatorRoute(simulatorUdid: String, completion: ((Bool) -> Void)? = nil) {
        guard let url = URL(string: "http://localhost:\(port)/__daemon/simulator-route?simulatorUdid=\(simulatorUdid)") else {
            completion?(false)
            return
        }
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        let task = URLSession.shared.dataTask(with: req) { _, response, error in
            let ok = error == nil && (response as? HTTPURLResponse)?.statusCode == 200
            completion?(ok)
        }
        task.resume()
    }
}

// MARK: - Simulator discovery (xcrun simctl)

class SimulatorDiscovery {
    struct SimctlDevice: Codable {
        let name: String
        let udid: String
        let state: String
        let isAvailable: Bool?
    }
    struct SimctlOutput: Codable {
        let devices: [String: [SimctlDevice]]
    }

    static func fetchAvailable(excluding booted: [SimulatorInfo], completion: @escaping ([SimulatorInfo]) -> Void) {
        DispatchQueue.global(qos: .utility).async {
            let task = Process()
            task.executableURL = URL(fileURLWithPath: "/usr/bin/xcrun")
            task.arguments = ["simctl", "list", "devices", "available", "-j"]
            let pipe = Pipe()
            task.standardOutput = pipe
            task.standardError = FileHandle.nullDevice
            do {
                try task.run()
                task.waitUntilExit()
            } catch { completion([]); return }

            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            guard let output = try? JSONDecoder().decode(SimctlOutput.self, from: data) else {
                completion([]); return
            }

            let bootedUdids = Set(booted.map { $0.udid })
            var results: [SimulatorInfo] = []
            // get recent iOS runtimes only
            for (runtime, devices) in output.devices {
                guard runtime.contains("iOS") || runtime.contains("SimRuntime.iOS") else { continue }
                // extract version from runtime key like "com.apple.CoreSimulator.SimRuntime.iOS-17-4"
                let ver = runtime.components(separatedBy: "iOS-").last?.replacingOccurrences(of: "-", with: ".") ??
                          runtime.components(separatedBy: "iOS ").last
                for dev in devices {
                    if dev.state == "Shutdown" && !bootedUdids.contains(dev.udid) && (dev.isAvailable ?? true) {
                        results.append(SimulatorInfo(name: dev.name, udid: dev.udid, state: "Shutdown", iosVersion: ver))
                    }
                }
            }
            // limit to most common devices (iPhones, recent ones first), max 4
            let preferred = results.filter { $0.name.contains("iPhone") }
                .sorted { ($0.iosVersion ?? "") > ($1.iosVersion ?? "") }
            let limited = Array(preferred.prefix(4))
            completion(limited.isEmpty ? Array(results.prefix(4)) : limited)
        }
    }
}

// MARK: - Daemon manager

class DaemonManager {
    static let pidFile: String = {
        NSString(string: "~/.one/daemon.pid").expandingTildeInPath
    }()
    static let logDir: String = {
        NSString(string: "~/.one/logs").expandingTildeInPath
    }()
    static let logFile: String = {
        NSString(string: "~/.one/logs/daemon.log").expandingTildeInPath
    }()

    static func isRunning() -> Bool {
        // first check socket connectivity
        let result = SocketClient.sendIPCMessage("ping")
        if result?["type"] as? String == "pong" {
            return true
        }
        // fallback to pid file
        guard let pidStr = try? String(contentsOfFile: pidFile, encoding: .utf8),
              let pid = Int32(pidStr.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            return false
        }
        return kill(pid, 0) == 0
    }

    static func start() {
        try? FileManager.default.createDirectory(atPath: logDir, withIntermediateDirectories: true)

        // find the `one` CLI binary - check common locations
        let home = NSString(string: "~").expandingTildeInPath
        let onePaths = [
            "\(home)/.bun/bin/one",
            "/usr/local/bin/one",
            "/opt/homebrew/bin/one",
        ]
        var oneBin: String? = nil
        for p in onePaths {
            if FileManager.default.fileExists(atPath: p) {
                oneBin = p
                break
            }
        }

        guard let bin = oneBin else {
            NSLog("[OneTray] Could not find `one` CLI binary")
            return
        }

        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/sh")
        task.arguments = ["-c", "nohup \(bin) daemon start --no-tui >> \(logFile) 2>&1 &"]
        try? task.run()
    }

    static func stop() {
        // try graceful shutdown via socket first
        _ = SocketClient.sendIPCMessage("shutdown")

        // fallback to pid
        guard let pidStr = try? String(contentsOfFile: pidFile, encoding: .utf8),
              let pid = Int32(pidStr.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            return
        }
        kill(pid, SIGTERM)
    }

    static var launchAgent: String {
        NSString(string: "~/Library/LaunchAgents/com.onestack.one-daemon.plist").expandingTildeInPath
    }

    static func isLoginItemEnabled() -> Bool {
        FileManager.default.fileExists(atPath: launchAgent)
    }

    static func setLoginItem(enabled: Bool) {
        if enabled {
            let home = NSString(string: "~").expandingTildeInPath
            let onePaths = [
                "\(home)/.bun/bin/one",
                "/usr/local/bin/one",
                "/opt/homebrew/bin/one",
            ]
            var oneBin = "\(home)/.bun/bin/one"
            for p in onePaths {
                if FileManager.default.fileExists(atPath: p) {
                    oneBin = p
                    break
                }
            }
            let plist = """
            <?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
            <plist version="1.0">
            <dict>
                <key>Label</key>
                <string>com.onestack.one-daemon</string>
                <key>ProgramArguments</key>
                <array>
                    <string>\(oneBin)</string>
                    <string>daemon</string>
                    <string>start</string>
                    <string>--no-tui</string>
                </array>
                <key>RunAtLoad</key>
                <true/>
                <key>KeepAlive</key>
                <false/>
                <key>StandardOutPath</key>
                <string>\(logFile)</string>
                <key>StandardErrorPath</key>
                <string>\(logFile)</string>
            </dict>
            </plist>
            """
            try? FileManager.default.createDirectory(
                atPath: NSString(string: "~/Library/LaunchAgents").expandingTildeInPath,
                withIntermediateDirectories: true
            )
            try? plist.write(toFile: launchAgent, atomically: true, encoding: .utf8)
        } else {
            try? FileManager.default.removeItem(atPath: launchAgent)
        }
    }
}

// MARK: - Rope physics (verlet integration chain)

struct RopePoint {
    var x: CGFloat
    var y: CGFloat
    var oldX: CGFloat
    var oldY: CGFloat
    var pinned: Bool = false
}

let ropeSegments = 14 // number of points per cable

struct Cable {
    var serverIndex: Int?
    var points: [RopePoint]
    var pulsePhase: CGFloat = 0
    var isPulsing: Bool = false

    static func make(from start: CGPoint, to end: CGPoint, segments: Int = ropeSegments) -> Cable {
        var pts: [RopePoint] = []
        for i in 0..<segments {
            let t = CGFloat(i) / CGFloat(segments - 1)
            let x = start.x + (end.x - start.x) * t
            let y = start.y + (end.y - start.y) * t + sin(t * .pi) * 40 // initial sag
            pts.append(RopePoint(x: x, y: y, oldX: x, oldY: y))
        }
        pts[0].pinned = true // anchored at sim jack
        return Cable(serverIndex: nil, points: pts)
    }
}

// MARK: - Rack color palette

struct RackColors {
    static let panelDark = Color(red: 0.12, green: 0.12, blue: 0.13)
    static let panelMid = Color(red: 0.18, green: 0.18, blue: 0.19)
    static let panelLight = Color(red: 0.22, green: 0.22, blue: 0.24)
    static let railDark = Color(red: 0.08, green: 0.08, blue: 0.09)
    static let railEdge = Color(red: 0.28, green: 0.28, blue: 0.30)
    static let screwOuter = Color(red: 0.35, green: 0.35, blue: 0.37)
    static let screwInner = Color(red: 0.15, green: 0.15, blue: 0.16)
    static let jackRing = Color(red: 0.45, green: 0.45, blue: 0.48)
    static let jackHole = Color(red: 0.06, green: 0.06, blue: 0.07)
    static let jackHighlight = Color(red: 0.62, green: 0.62, blue: 0.65)
    static let tapeBg = Color(red: 0.92, green: 0.88, blue: 0.80)
    static let tapeText = Color(red: 0.15, green: 0.13, blue: 0.10)
    static let labelDim = Color(red: 0.50, green: 0.50, blue: 0.52)
    static let cableShadow = Color(red: 0.0, green: 0.0, blue: 0.0)
}

// MARK: - Cable view model

@Observable
class CableViewModel {
    var servers: [ServerInfo] = []
    var simulators: [SimulatorInfo] = [] // booted
    var availableSimulators: [SimulatorInfo] = [] // not booted, shown as inactive
    var showAvailableSims: Bool = true
    var cables: [Int: Cable] = [:] // keyed by sim index
    var draggingSimIndex: Int? = nil
    var dragPosition: CGPoint? = nil
    var userConnectionTime: Date? = nil // cooldown to prevent sync overwrite
    var routeMode: String = "auto"
    var daemonRunning: Bool = false
    var hoveredServerIndex: Int? = nil
    // toggle switch position (for animation)
    var toggleAnimPhase: CGFloat = 1.0 // 1=on, 0=off

    // layout
    let popoverWidth: CGFloat = 720
    let popoverHeight: CGFloat = 440
    let railHeight: CGFloat = 36
    let bottomRailHeight: CGFloat = 28
    let simJackX: CGFloat = 170     // sims on LEFT (cable source)
    let serverJackX: CGFloat = 550  // servers on RIGHT (plug target)
    let jackStartY: CGFloat = 80
    let jackSpacing: CGFloat = 64
    let jackOuterRadius: CGFloat = 13
    let jackHoleRadius: CGFloat = 5.5

    let cableColors: [Color] = [
        Color(red: 0.3, green: 0.85, blue: 0.35),
        Color(red: 0.3, green: 0.75, blue: 0.95),
        Color(red: 0.75, green: 0.35, blue: 0.85),
        Color(red: 0.35, green: 0.45, blue: 0.95),
        Color(red: 0.95, green: 0.8, blue: 0.2),
    ]

    func cableColor(forSimIndex index: Int) -> Color {
        cableColors[index % cableColors.count]
    }

    func simPlugPosition(index: Int) -> CGPoint {
        CGPoint(x: simJackX, y: jackStartY + CGFloat(index) * jackSpacing)
    }

    func serverPlugPosition(index: Int) -> CGPoint {
        CGPoint(x: serverJackX, y: jackStartY + CGFloat(index) * jackSpacing)
    }

    // physics tick counter to force SwiftUI redraw
    var physicsTick: Int = 0
    private var physicsTimer: Timer?

    func startPhysics() {
        guard physicsTimer == nil else { return }
        let t = Timer(timeInterval: 1.0/60.0, repeats: true) { [weak self] _ in
            self?.updatePhysics()
        }
        RunLoop.main.add(t, forMode: .common)
        physicsTimer = t
    }

    func stopPhysics() {
        physicsTimer?.invalidate()
        physicsTimer = nil
    }

    let ropeGravity: CGFloat = 0.8
    let ropeDamping: CGFloat = 0.985
    let ropeConstraintIterations = 6
    let ropeSegmentLength: CGFloat = 28

    func updatePhysics() {
        for (simIndex, _) in cables {
            guard var cable = cables[simIndex] else { continue }
            let simPos = simPlugPosition(index: simIndex)
            let n = cable.points.count

            // pin first point to sim jack always
            cable.points[0].x = simPos.x
            cable.points[0].y = simPos.y
            cable.points[0].oldX = simPos.x
            cable.points[0].oldY = simPos.y
            cable.points[0].pinned = true

            // pin last point based on state
            if let serverIdx = cable.serverIndex, serverIdx < servers.count {
                let serverPos = serverPlugPosition(index: serverIdx)
                cable.points[n - 1].x = serverPos.x
                cable.points[n - 1].y = serverPos.y
                cable.points[n - 1].oldX = serverPos.x
                cable.points[n - 1].oldY = serverPos.y
                cable.points[n - 1].pinned = true
            } else if draggingSimIndex == simIndex, let pos = dragPosition {
                cable.points[n - 1].x = pos.x
                cable.points[n - 1].y = pos.y
                cable.points[n - 1].pinned = true
            } else {
                cable.points[n - 1].pinned = false
            }

            // verlet integration for all unpinned points
            for i in 0..<n {
                if cable.points[i].pinned { continue }
                let x = cable.points[i].x
                let y = cable.points[i].y
                let vx = (x - cable.points[i].oldX) * ropeDamping
                let vy = (y - cable.points[i].oldY) * ropeDamping
                cable.points[i].oldX = x
                cable.points[i].oldY = y
                cable.points[i].x = x + vx
                cable.points[i].y = y + vy + ropeGravity

                // boundary constraints
                let floor = popoverHeight - bottomRailHeight - 10
                if cable.points[i].y > floor {
                    cable.points[i].y = floor
                    cable.points[i].oldY = cable.points[i].y + vy * 0.3
                }
                let ceiling = railHeight + 5
                if cable.points[i].y < ceiling {
                    cable.points[i].y = ceiling
                    cable.points[i].oldY = cable.points[i].y + vy * 0.2
                }
                let leftWall: CGFloat = 10
                if cable.points[i].x < leftWall {
                    cable.points[i].x = leftWall
                    cable.points[i].oldX = cable.points[i].x + vx * 0.3
                }
                let rightWall = popoverWidth - 10
                if cable.points[i].x > rightWall {
                    cable.points[i].x = rightWall
                    cable.points[i].oldX = cable.points[i].x + vx * 0.3
                }
            }

            // distance constraints (iterated for stiffness)
            for _ in 0..<ropeConstraintIterations {
                for i in 0..<(n - 1) {
                    let dx = cable.points[i + 1].x - cable.points[i].x
                    let dy = cable.points[i + 1].y - cable.points[i].y
                    let dist = sqrt(dx * dx + dy * dy)
                    if dist < 0.001 { continue }
                    let diff = (ropeSegmentLength - dist) / dist
                    let offsetX = dx * diff * 0.5
                    let offsetY = dy * diff * 0.5

                    if !cable.points[i].pinned {
                        cable.points[i].x -= offsetX
                        cable.points[i].y -= offsetY
                    }
                    if !cable.points[i + 1].pinned {
                        cable.points[i + 1].x += offsetX
                        cable.points[i + 1].y += offsetY
                    }
                }
            }

            // pulse animation
            if cable.isPulsing {
                cable.pulsePhase += 0.025
                if cable.pulsePhase > 1 {
                    cable.pulsePhase = 0
                    cable.isPulsing = false
                }
            }

            cables[simIndex] = cable
        }

        physicsTick += 1
    }

    func syncCables(simulatorMappings: [String: String]) {
        // skip sync for 3 seconds after user drag to let the HTTP POST propagate
        if let t = userConnectionTime, Date().timeIntervalSince(t) < 3.0 {
            return
        }

        for (simIndex, sim) in simulators.enumerated() {
            let mappedServerId = simulatorMappings[sim.udid]
            let routedServerIndex: Int? = {
                guard let sid = mappedServerId else { return nil }
                return servers.firstIndex(where: { $0.id == sid })
            }()

            if cables[simIndex] == nil {
                let simPos = simPlugPosition(index: simIndex)
                let endPos: CGPoint
                if let srvIdx = routedServerIndex {
                    endPos = serverPlugPosition(index: srvIdx)
                } else {
                    endPos = CGPoint(x: simPos.x + 20, y: simPos.y + 120)
                }
                var cable = Cable.make(from: simPos, to: endPos)
                cable.serverIndex = routedServerIndex
                for i in 1..<cable.points.count - 1 {
                    cable.points[i].oldX = cable.points[i].x + CGFloat.random(in: -4...4)
                    cable.points[i].oldY = cable.points[i].y + CGFloat.random(in: -2...2)
                }
                cables[simIndex] = cable
            }

            if draggingSimIndex != simIndex {
                if let cable = cables[simIndex], cable.serverIndex != routedServerIndex {
                    cables[simIndex]?.serverIndex = routedServerIndex
                    if let c = cables[simIndex] {
                        let n = c.points.count
                        if routedServerIndex == nil && n > 1 {
                            // disconnect fling: kick the free end
                            for i in (n / 2)..<n {
                                cables[simIndex]?.points[i].oldX = c.points[i].x + CGFloat.random(in: -8...8)
                                cables[simIndex]?.points[i].oldY = c.points[i].y - CGFloat.random(in: 3...10)
                            }
                        }
                        // pin/unpin last point
                        if n > 0 {
                            cables[simIndex]?.points[n - 1].pinned = (routedServerIndex != nil)
                        }
                    }
                }
            }
        }

        for key in cables.keys {
            if key >= simulators.count {
                cables.removeValue(forKey: key)
            }
        }
    }

    func hitTestServer(at point: CGPoint) -> Int? {
        for (index, _) in servers.enumerated() {
            let plugPos = serverPlugPosition(index: index)
            let dist = hypot(point.x - plugPos.x, point.y - plugPos.y)
            if dist < 24 { return index }
        }
        return nil
    }

    func hitTestSim(at point: CGPoint) -> Int? {
        for (index, _) in simulators.enumerated() {
            let plugPos = simPlugPosition(index: index)
            let dist = hypot(point.x - plugPos.x, point.y - plugPos.y)
            if dist < 24 { return index }
        }
        return nil
    }

    func hitTestToggle(at point: CGPoint) -> Bool {
        guard simulators.isEmpty && !availableSimulators.isEmpty else { return false }
        let toggleCenter = CGPoint(x: simJackX - 40, y: jackStartY + 10)
        return abs(point.x - toggleCenter.x) < 16 && abs(point.y - toggleCenter.y) < 22
    }
}

// MARK: - Reason-style rack cable view

struct CableCanvasView: View {
    @Bindable var model: CableViewModel
    var onGearTapped: (() -> Void)?

    var body: some View {
        ZStack {
            // physicsTick forces canvas redraw every frame
            let _ = model.physicsTick
            Canvas { context, size in
                drawRackBackground(context: context, size: size)
                drawTopRail(context: context, size: size)
                drawBottomRail(context: context, size: size)
                drawBrushedMetal(context: context, size: size)
                drawCableShadows(context: context, size: size)
                drawCables(context: context, size: size)
                drawSimulatorJacks(context: context, size: size)
                drawServerJacks(context: context, size: size)
                drawTapeLabels(context: context, size: size)
            }

            // gesture overlay (between canvas and UI bars)
            gestureOverlay

            // native top bar overlay (on top so it's clickable)
            VStack(spacing: 0) {
                ZStack {
                    VisualEffectBlur(material: .headerView, blendingMode: .withinWindow)
                        .frame(height: model.railHeight)

                    HStack(spacing: 0) {
                        Text("ONE")
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                        Text(" DAEMON")
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                            .foregroundColor(.secondary)

                        Text("  :8081")
                            .font(.system(size: 9, weight: .medium, design: .monospaced))
                            .foregroundStyle(.tertiary)

                        Spacer()

                        let modeColor: Color = model.routeMode == "auto" ?
                            Color(red: 0.3, green: 0.85, blue: 0.35) :
                            Color(red: 0.95, green: 0.75, blue: 0.2)
                        HStack(spacing: 4) {
                            Circle()
                                .fill(modeColor)
                                .frame(width: 5, height: 5)
                            Text(model.routeMode == "auto" ? "AUTO" : "MANUAL")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.primary.opacity(0.06))
                        .clipShape(Capsule())

                        Button(action: { onGearTapped?() }) {
                            Image(systemName: "gearshape.fill")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                        .buttonStyle(.plain)
                        .padding(.leading, 8)
                    }
                    .padding(.horizontal, 14)
                }

                Spacer()

                ZStack {
                    VisualEffectBlur(material: .headerView, blendingMode: .withinWindow)
                        .frame(height: model.bottomRailHeight)

                    Text("drag cables to connect  ·  drop to disconnect")
                        .font(.system(size: 9, weight: .regular))
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .frame(width: model.popoverWidth, height: model.popoverHeight)
        .onAppear {
            model.startPhysics()
        }
    }

    var gestureOverlay: some View {
        Color.clear
            .contentShape(Rectangle())
            .onTapGesture { location in
                if model.hitTestToggle(at: location) {
                    model.showAvailableSims.toggle()
                }
            }
            .gesture(
                DragGesture(minimumDistance: 3)
                    .onChanged { value in
                        if model.draggingSimIndex == nil {
                            // first: check if clicking directly on a sim jack
                            if let simIdx = model.hitTestSim(at: value.startLocation) {
                                model.draggingSimIndex = simIdx
                                if let cable = model.cables[simIdx], cable.serverIndex != nil {
                                    model.cables[simIdx]?.serverIndex = nil
                                    // unpin last point and kick it
                                    let n = cable.points.count
                                    model.cables[simIdx]?.points[n - 1].pinned = false
                                    model.cables[simIdx]?.points[n - 1].oldX = cable.points[n - 1].x + 5
                                    model.cables[simIdx]?.points[n - 1].oldY = cable.points[n - 1].y - 5
                                    CableSounds.playUnplug()
                                    model.userConnectionTime = Date()
                                    if simIdx < model.simulators.count {
                                        let sim = model.simulators[simIdx]
                                        DaemonHTTPClient.clearSimulatorRoute(simulatorUdid: sim.udid)
                                    }
                                }
                            } else {
                                // grab the nearest disconnected cable — check all rope points
                                var bestDist: CGFloat = 100
                                var bestIdx: Int? = nil
                                for (simIdx, cable) in model.cables {
                                    guard cable.serverIndex == nil else { continue }
                                    for pt in cable.points {
                                        let dist = hypot(value.startLocation.x - pt.x, value.startLocation.y - pt.y)
                                        if dist < bestDist {
                                            bestDist = dist
                                            bestIdx = simIdx
                                        }
                                    }
                                }
                                if let idx = bestIdx {
                                    model.draggingSimIndex = idx
                                }
                            }
                        }
                        if model.draggingSimIndex != nil {
                            model.dragPosition = value.location
                            model.hoveredServerIndex = model.hitTestServer(at: value.location)
                        }
                    }
                    .onEnded { value in
                        guard let simIdx = model.draggingSimIndex else { return }

                        if let serverIdx = model.hitTestServer(at: value.location),
                           serverIdx < model.servers.count {
                            model.cables[simIdx]?.serverIndex = serverIdx
                            // pin last point to server
                            if var cable = model.cables[simIdx] {
                                let n = cable.points.count
                                let serverPos = model.serverPlugPosition(index: serverIdx)
                                cable.points[n - 1].pinned = true
                                cable.points[n - 1].x = serverPos.x
                                cable.points[n - 1].y = serverPos.y
                                cable.points[n - 1].oldX = serverPos.x
                                cable.points[n - 1].oldY = serverPos.y
                                model.cables[simIdx] = cable
                            }
                            CableSounds.playPlug()
                            model.userConnectionTime = Date()
                            if simIdx < model.simulators.count {
                                let sim = model.simulators[simIdx]
                                let server = model.servers[serverIdx]
                                DaemonHTTPClient.setSimulatorRoute(simulatorUdid: sim.udid, serverId: server.id)
                            }
                        } else {
                            // fling: unpin end and give it velocity from drag
                            if var cable = model.cables[simIdx] {
                                let n = cable.points.count
                                cable.points[n - 1].pinned = false
                                let vx = value.velocity.width * 0.012
                                let vy = value.velocity.height * 0.012
                                // apply fling velocity to last few points
                                for i in max(0, n - 4)..<n {
                                    cable.points[i].oldX = cable.points[i].x - vx
                                    cable.points[i].oldY = cable.points[i].y - vy
                                }
                                model.cables[simIdx] = cable
                            }
                        }

                        model.draggingSimIndex = nil
                        model.dragPosition = nil
                        model.hoveredServerIndex = nil
                    }
            )
    }

    // MARK: - rack background

    let bevelInset: CGFloat = 6

    func drawRackBackground(context: GraphicsContext, size: CGSize) {
        // outer frame (dark)
        let outerRect = CGRect(x: 0, y: 0, width: size.width, height: size.height)
        context.fill(Rectangle().path(in: outerRect), with: .color(Color(red: 0.06, green: 0.06, blue: 0.07)))

        // heavy bevel/emboss around outer edge
        let b = bevelInset
        // top highlight
        var topHL = Path()
        topHL.move(to: CGPoint(x: 0, y: 0))
        topHL.addLine(to: CGPoint(x: size.width, y: 0))
        topHL.addLine(to: CGPoint(x: size.width - b, y: b))
        topHL.addLine(to: CGPoint(x: b, y: b))
        topHL.closeSubpath()
        context.fill(topHL, with: .color(Color.white.opacity(0.08)))

        // left highlight
        var leftHL = Path()
        leftHL.move(to: CGPoint(x: 0, y: 0))
        leftHL.addLine(to: CGPoint(x: b, y: b))
        leftHL.addLine(to: CGPoint(x: b, y: size.height - b))
        leftHL.addLine(to: CGPoint(x: 0, y: size.height))
        leftHL.closeSubpath()
        context.fill(leftHL, with: .color(Color.white.opacity(0.05)))

        // bottom shadow
        var botSH = Path()
        botSH.move(to: CGPoint(x: 0, y: size.height))
        botSH.addLine(to: CGPoint(x: size.width, y: size.height))
        botSH.addLine(to: CGPoint(x: size.width - b, y: size.height - b))
        botSH.addLine(to: CGPoint(x: b, y: size.height - b))
        botSH.closeSubpath()
        context.fill(botSH, with: .color(Color.black.opacity(0.3)))

        // right shadow
        var rightSH = Path()
        rightSH.move(to: CGPoint(x: size.width, y: 0))
        rightSH.addLine(to: CGPoint(x: size.width, y: size.height))
        rightSH.addLine(to: CGPoint(x: size.width - b, y: size.height - b))
        rightSH.addLine(to: CGPoint(x: size.width - b, y: b))
        rightSH.closeSubpath()
        context.fill(rightSH, with: .color(Color.black.opacity(0.2)))

        // inner panel with gradient
        let innerRect = CGRect(x: b, y: b, width: size.width - b * 2, height: size.height - b * 2)
        context.fill(
            Rectangle().path(in: innerRect),
            with: .linearGradient(
                Gradient(colors: [RackColors.panelMid, RackColors.panelDark, Color(red: 0.10, green: 0.10, blue: 0.11)]),
                startPoint: CGPoint(x: 0, y: b),
                endPoint: CGPoint(x: 0, y: size.height - b)
            )
        )

        // inner bevel (inset edge)
        var innerTop = Path()
        innerTop.move(to: CGPoint(x: b, y: b))
        innerTop.addLine(to: CGPoint(x: size.width - b, y: b))
        context.stroke(innerTop, with: .color(Color.white.opacity(0.04)), lineWidth: 1)
        var innerBot = Path()
        innerBot.move(to: CGPoint(x: b, y: size.height - b))
        innerBot.addLine(to: CGPoint(x: size.width - b, y: size.height - b))
        context.stroke(innerBot, with: .color(Color.black.opacity(0.3)), lineWidth: 1)
    }

    // cached noise texture (generated once as CGImage at full resolution)
    static var noiseImage: CGImage?
    static var noiseGenerated = false

    func drawBrushedMetal(context: GraphicsContext, size: CGSize) {
        let b = bevelInset
        let drawW = Int(size.width - b * 2)
        let drawH = Int(size.height - b * 2)

        if !Self.noiseGenerated {
            Self.noiseGenerated = true
            // generate at full pixel resolution so no scaling artifacts
            var pixels = [UInt8](repeating: 0, count: drawW * drawH * 4)
            for row in 0..<drawH {
                for col in 0..<drawW {
                    // 2d hash for subtle grain
                    let hash = ((col &* 374761393 &+ row &* 668265263) &+ 1274126177) & 0xFFFF
                    let val = Double(hash) / 65536.0
                    let offset = (row * drawW + col) * 4
                    // very subtle: max ~3% opacity
                    let brightness: UInt8 = val > 0.5 ? 255 : 0
                    let alpha = UInt8(val > 0.5 ? val * 8 : (1 - val) * 8)
                    // premultiplied: rgb = brightness * alpha / 255
                    let premul = UInt8(Int(brightness) * Int(alpha) / 255)
                    pixels[offset] = premul
                    pixels[offset + 1] = premul
                    pixels[offset + 2] = premul
                    pixels[offset + 3] = alpha
                }
            }
            if let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
               let ctx = CGContext(data: &pixels, width: drawW, height: drawH,
                                   bitsPerComponent: 8, bytesPerRow: drawW * 4,
                                   space: colorSpace,
                                   bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) {
                Self.noiseImage = ctx.makeImage()
            }
        }

        if let img = Self.noiseImage {
            let drawRect = CGRect(x: b, y: b, width: CGFloat(drawW), height: CGFloat(drawH))
            context.draw(Image(decorative: img, scale: 1), in: drawRect)
        }
    }

    // MARK: - top bar (clean native)

    func drawTopRail(context: GraphicsContext, size: CGSize) {
        // top bar is drawn by the SwiftUI overlay — skip canvas drawing
        // just draw a subtle separator line at bottom of header zone
        let h = model.railHeight
        var sep = Path()
        sep.move(to: CGPoint(x: 0, y: h))
        sep.addLine(to: CGPoint(x: size.width, y: h))
        context.stroke(sep, with: .color(Color.white.opacity(0.06)), lineWidth: 0.5)
    }

    // MARK: - bottom bar (clean native)

    func drawBottomRail(context: GraphicsContext, size: CGSize) {
        // bottom bar is drawn by the SwiftUI overlay — skip canvas drawing
        let y = size.height - model.bottomRailHeight
        var sep = Path()
        sep.move(to: CGPoint(x: 0, y: y))
        sep.addLine(to: CGPoint(x: size.width, y: y))
        context.stroke(sep, with: .color(Color.white.opacity(0.06)), lineWidth: 0.5)
    }

    // MARK: - screw

    func drawScrew(context: GraphicsContext, at center: CGPoint) {
        let r: CGFloat = 5
        let outerRect = CGRect(x: center.x - r, y: center.y - r, width: r * 2, height: r * 2)
        // outer ring
        context.fill(Circle().path(in: outerRect), with: .color(RackColors.screwOuter))
        // inner
        let innerRect = outerRect.insetBy(dx: 1.5, dy: 1.5)
        context.fill(Circle().path(in: innerRect), with: .color(RackColors.screwInner))
        // phillips cross
        var h = Path()
        h.move(to: CGPoint(x: center.x - 2.5, y: center.y))
        h.addLine(to: CGPoint(x: center.x + 2.5, y: center.y))
        var v = Path()
        v.move(to: CGPoint(x: center.x, y: center.y - 2.5))
        v.addLine(to: CGPoint(x: center.x, y: center.y + 2.5))
        context.stroke(h, with: .color(Color.white.opacity(0.08)), lineWidth: 0.8)
        context.stroke(v, with: .color(Color.white.opacity(0.08)), lineWidth: 0.8)
        // highlight
        let hlRect = CGRect(x: center.x - 1, y: center.y - r + 1.5, width: 2, height: 1.5)
        context.fill(Ellipse().path(in: hlRect), with: .color(Color.white.opacity(0.12)))
    }

    // MARK: - jack socket

    func drawJack(context: GraphicsContext, at center: CGPoint, connected: Bool, cableColor: Color?) {
        let outerR = model.jackOuterRadius
        let holeR = model.jackHoleRadius

        // shadow under jack
        let shadowRect = CGRect(x: center.x - outerR, y: center.y - outerR + 2, width: outerR * 2, height: outerR * 2)
        context.fill(Circle().path(in: shadowRect), with: .color(Color.black.opacity(0.3)))

        // outer metallic ring (gradient simulation: light top, dark bottom)
        let outerRect = CGRect(x: center.x - outerR, y: center.y - outerR, width: outerR * 2, height: outerR * 2)
        context.fill(Circle().path(in: outerRect), with: .color(RackColors.jackRing))

        // inner darker ring
        let midR = outerR - 2
        let midRect = CGRect(x: center.x - midR, y: center.y - midR, width: midR * 2, height: midR * 2)
        context.fill(Circle().path(in: midRect), with: .color(Color(red: 0.30, green: 0.30, blue: 0.32)))

        // hole
        let holeRect = CGRect(x: center.x - holeR, y: center.y - holeR, width: holeR * 2, height: holeR * 2)
        context.fill(Circle().path(in: holeRect), with: .color(RackColors.jackHole))

        // metallic highlight (top-left)
        let hlR: CGFloat = 3
        let hlCenter = CGPoint(x: center.x - outerR * 0.3, y: center.y - outerR * 0.3)
        let hlRect = CGRect(x: hlCenter.x - hlR, y: hlCenter.y - hlR, width: hlR * 2, height: hlR * 2)
        context.fill(Ellipse().path(in: hlRect), with: .color(RackColors.jackHighlight.opacity(0.35)))

        // if connected, show cable color ring in the hole
        if connected, let col = cableColor {
            let cableRing = holeRect.insetBy(dx: -1, dy: -1)
            context.stroke(Circle().path(in: cableRing), with: .color(col.opacity(0.6)), lineWidth: 1.5)
        }

        // hover glow when dragging cable near a server jack
        if let hovered = model.hoveredServerIndex,
           center.x > model.popoverWidth / 2, // only servers (now on right)
           hovered < model.servers.count {
            let serverPos = model.serverPlugPosition(index: hovered)
            if abs(center.x - serverPos.x) < 2 && abs(center.y - serverPos.y) < 2 {
                let glowR = outerR + 4
                let glowRect = CGRect(x: center.x - glowR, y: center.y - glowR, width: glowR * 2, height: glowR * 2)
                context.stroke(Circle().path(in: glowRect), with: .color(Color.cyan.opacity(0.4)), lineWidth: 2)
            }
        }
    }

    // MARK: - simulators

    func drawSimulatorJacks(context: GraphicsContext, size: CGSize) {
        // booted simulators
        for (index, _) in model.simulators.enumerated() {
            let pos = model.simPlugPosition(index: index)
            let cable = model.cables[index]
            let connected = cable?.serverIndex != nil
            let col = model.cableColor(forSimIndex: index)
            drawJack(context: context, at: pos, connected: connected, cableColor: connected ? col : nil)
        }

        // available (inactive) simulators below booted ones
        if model.simulators.isEmpty && model.showAvailableSims && !model.availableSimulators.isEmpty {
            for (index, _) in model.availableSimulators.enumerated() {
                let pos = model.simPlugPosition(index: index)
                drawInactiveJack(context: context, at: pos)
            }
        } else if model.simulators.isEmpty && model.availableSimulators.isEmpty {
            context.draw(
                Text("no simulators")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(RackColors.labelDim.opacity(0.4)),
                at: CGPoint(x: model.simJackX + 20, y: model.jackStartY + 20),
                anchor: .center
            )
        }

        // draw toggle switch for showing available sims (near sim column on left)
        if model.simulators.isEmpty && !model.availableSimulators.isEmpty {
            let toggleCenter = CGPoint(x: model.simJackX - 40, y: model.jackStartY + 10)
            drawToggleSwitch(context: context, at: toggleCenter, isOn: model.showAvailableSims)
        }
    }

    func drawInactiveJack(context: GraphicsContext, at center: CGPoint) {
        let outerR = model.jackOuterRadius
        let holeR = model.jackHoleRadius

        // shadow
        let shadowRect = CGRect(x: center.x - outerR, y: center.y - outerR + 2, width: outerR * 2, height: outerR * 2)
        context.fill(Circle().path(in: shadowRect), with: .color(Color.black.opacity(0.15)))

        // outer ring (dimmer)
        let outerRect = CGRect(x: center.x - outerR, y: center.y - outerR, width: outerR * 2, height: outerR * 2)
        context.fill(Circle().path(in: outerRect), with: .color(Color(red: 0.32, green: 0.32, blue: 0.34)))

        // inner ring
        let midR = outerR - 2
        let midRect = CGRect(x: center.x - midR, y: center.y - midR, width: midR * 2, height: midR * 2)
        context.fill(Circle().path(in: midRect), with: .color(Color(red: 0.22, green: 0.22, blue: 0.24)))

        // hole (slightly lighter to show inactive)
        let holeRect = CGRect(x: center.x - holeR, y: center.y - holeR, width: holeR * 2, height: holeR * 2)
        context.fill(Circle().path(in: holeRect), with: .color(Color(red: 0.10, green: 0.10, blue: 0.11)))

        // dim highlight
        let hlR: CGFloat = 2.5
        let hlCenter = CGPoint(x: center.x - outerR * 0.3, y: center.y - outerR * 0.3)
        let hlRect = CGRect(x: hlCenter.x - hlR, y: hlCenter.y - hlR, width: hlR * 2, height: hlR * 2)
        context.fill(Ellipse().path(in: hlRect), with: .color(Color.white.opacity(0.12)))
    }

    // MARK: - skeuomorphic toggle switch

    func drawToggleSwitch(context: GraphicsContext, at center: CGPoint, isOn: Bool) {
        let w: CGFloat = 16
        let h: CGFloat = 30
        let rect = CGRect(x: center.x - w / 2, y: center.y - h / 2, width: w, height: h)

        // bezel plate shadow
        let shadowRect = rect.offsetBy(dx: 1, dy: 2)
        context.fill(RoundedRectangle(cornerRadius: 3).path(in: shadowRect), with: .color(Color.black.opacity(0.4)))

        // bezel plate — brushed metal
        context.fill(
            RoundedRectangle(cornerRadius: 3).path(in: rect),
            with: .linearGradient(
                Gradient(colors: [
                    Color(red: 0.42, green: 0.42, blue: 0.44),
                    Color(red: 0.30, green: 0.30, blue: 0.32),
                    Color(red: 0.25, green: 0.25, blue: 0.27),
                ]),
                startPoint: CGPoint(x: rect.minX, y: rect.minY),
                endPoint: CGPoint(x: rect.maxX, y: rect.maxY)
            )
        )

        // bezel edge highlight
        context.stroke(
            RoundedRectangle(cornerRadius: 3).path(in: rect),
            with: .color(Color.white.opacity(0.1)),
            lineWidth: 0.5
        )

        // slot groove
        let slotInset: CGFloat = 3
        let slotRect = rect.insetBy(dx: slotInset, dy: 4)
        context.fill(RoundedRectangle(cornerRadius: 2).path(in: slotRect), with: .color(Color.black.opacity(0.5)))

        // lever position: top = on, bottom = off
        let leverH: CGFloat = 12
        let leverW: CGFloat = w - slotInset * 2
        let leverY = isOn ? slotRect.minY : slotRect.maxY - leverH
        let leverRect = CGRect(x: slotRect.minX, y: leverY, width: leverW, height: leverH)

        // lever body with metallic gradient (top-lit)
        context.fill(
            RoundedRectangle(cornerRadius: 1.5).path(in: leverRect),
            with: .linearGradient(
                Gradient(colors: [
                    Color(red: 0.70, green: 0.70, blue: 0.72),
                    Color(red: 0.52, green: 0.52, blue: 0.54),
                    Color(red: 0.40, green: 0.40, blue: 0.42),
                ]),
                startPoint: CGPoint(x: leverRect.minX, y: leverRect.minY),
                endPoint: CGPoint(x: leverRect.minX, y: leverRect.maxY)
            )
        )

        // lever grip lines
        let gripY = leverRect.midY
        for dy: CGFloat in [-2, 0, 2] {
            var line = Path()
            line.move(to: CGPoint(x: leverRect.minX + 2, y: gripY + dy))
            line.addLine(to: CGPoint(x: leverRect.maxX - 2, y: gripY + dy))
            context.stroke(line, with: .color(Color.black.opacity(0.15)), lineWidth: 0.5)
            var hlLine = Path()
            hlLine.move(to: CGPoint(x: leverRect.minX + 2, y: gripY + dy + 0.5))
            hlLine.addLine(to: CGPoint(x: leverRect.maxX - 2, y: gripY + dy + 0.5))
            context.stroke(hlLine, with: .color(Color.white.opacity(0.15)), lineWidth: 0.5)
        }

        // lever top edge highlight
        var topHL = Path()
        topHL.move(to: CGPoint(x: leverRect.minX + 1, y: leverRect.minY + 0.5))
        topHL.addLine(to: CGPoint(x: leverRect.maxX - 1, y: leverRect.minY + 0.5))
        context.stroke(topHL, with: .color(Color.white.opacity(0.3)), lineWidth: 0.5)

        // on/off indicator
        let indicatorColor = isOn ? Color(red: 0.3, green: 0.85, blue: 0.35) : Color(red: 0.5, green: 0.5, blue: 0.5)
        let dotR: CGFloat = 2
        let dotCenter = CGPoint(x: center.x, y: isOn ? rect.minY - 5 : rect.maxY + 5)
        let dotRect = CGRect(x: dotCenter.x - dotR, y: dotCenter.y - dotR, width: dotR * 2, height: dotR * 2)
        context.fill(Circle().path(in: dotRect), with: .color(indicatorColor))
        if isOn {
            // glow
            context.fill(Circle().path(in: dotRect.insetBy(dx: -2, dy: -2)), with: .color(indicatorColor.opacity(0.2)))
        }
    }

    func drawServerJacks(context: GraphicsContext, size: CGSize) {
        for (index, _) in model.servers.enumerated() {
            let pos = model.serverPlugPosition(index: index)
            var connectedColor: Color? = nil
            for (simIdx, cable) in model.cables {
                if cable.serverIndex == index {
                    connectedColor = model.cableColor(forSimIndex: simIdx)
                    break
                }
            }
            drawJack(context: context, at: pos, connected: connectedColor != nil, cableColor: connectedColor)
        }

        if model.servers.isEmpty {
            context.draw(
                Text("no dev servers")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(RackColors.labelDim.opacity(0.4)),
                at: CGPoint(x: model.serverJackX, y: model.jackStartY + 20),
                anchor: .center
            )
        }
    }

    // MARK: - tape labels

    func drawTapeLabels(context: GraphicsContext, size: CGSize) {
        // sim tape labels (LEFT side) — booted
        for (index, sim) in model.simulators.enumerated() {
            let pos = model.simPlugPosition(index: index)
            let name = sim.name.count > 14 ? String(sim.name.prefix(13)) + "…" : sim.name
            let version = sim.iosVersion.map { " \($0)" } ?? ""
            drawTape(context: context, text: name + version, at: CGPoint(x: pos.x - 60, y: pos.y), anchor: .trailing, rotation: -1.5)
        }

        // available (inactive) sim tape labels (LEFT side)
        if model.simulators.isEmpty && model.showAvailableSims {
            for (index, sim) in model.availableSimulators.enumerated() {
                let pos = model.simPlugPosition(index: index)
                let name = sim.name.count > 12 ? String(sim.name.prefix(11)) + "…" : sim.name
                drawTape(context: context, text: name, at: CGPoint(x: pos.x - 60, y: pos.y), anchor: .trailing, rotation: -1.0, dimmed: true)
            }
        }

        // server tape labels (RIGHT side)
        for (index, server) in model.servers.enumerated() {
            let pos = model.serverPlugPosition(index: index)
            let home = ProcessInfo.processInfo.environment["HOME"] ?? ""
            let shortRoot = server.root.replacingOccurrences(of: home, with: "~")
            let display = shortRoot.count > 18 ? "…" + String(shortRoot.suffix(17)) : shortRoot
            drawTape(context: context, text: ":\(server.port) \(display)", at: CGPoint(x: pos.x + 60, y: pos.y), anchor: .leading, rotation: 1.2)
        }

        // column header tapes — sims LEFT, servers RIGHT
        drawTape(context: context, text: "SIMULATORS", at: CGPoint(x: model.simJackX - 30, y: model.railHeight + 16), anchor: .center, rotation: -0.8, bold: true)
        drawTape(context: context, text: "SERVERS", at: CGPoint(x: model.serverJackX + 30, y: model.railHeight + 16), anchor: .center, rotation: 0.6, bold: true)
    }

    func drawTape(context: GraphicsContext, text: String, at point: CGPoint, anchor: UnitPoint, rotation: Double, bold: Bool = false, dimmed: Bool = false) {
        let font: Font = bold ?
            .system(size: 8, weight: .bold, design: .monospaced) :
            .system(size: 8, weight: .medium, design: .monospaced)

        // estimate tape size
        let charWidth: CGFloat = bold ? 5.5 : 5.0
        let tapeW = CGFloat(text.count) * charWidth + 12
        let tapeH: CGFloat = 16

        var tapeRect: CGRect
        switch anchor {
        case .trailing:
            tapeRect = CGRect(x: point.x - tapeW, y: point.y - tapeH / 2, width: tapeW, height: tapeH)
        case .leading:
            tapeRect = CGRect(x: point.x, y: point.y - tapeH / 2, width: tapeW, height: tapeH)
        default:
            tapeRect = CGRect(x: point.x - tapeW / 2, y: point.y - tapeH / 2, width: tapeW, height: tapeH)
        }

        // rotate context
        var ctx = context
        ctx.translateBy(x: tapeRect.midX, y: tapeRect.midY)
        ctx.rotate(by: .degrees(rotation))
        ctx.translateBy(x: -tapeRect.midX, y: -tapeRect.midY)

        // tape shadow
        let shadowRect = tapeRect.offsetBy(dx: 0.5, dy: 1.5)
        ctx.fill(RoundedRectangle(cornerRadius: 2).path(in: shadowRect), with: .color(Color.black.opacity(0.25)))

        // tape background
        let bgColor = dimmed ? RackColors.tapeBg.opacity(0.35) : RackColors.tapeBg
        ctx.fill(RoundedRectangle(cornerRadius: 2).path(in: tapeRect), with: .color(bgColor))

        // subtle tape edge
        ctx.stroke(RoundedRectangle(cornerRadius: 2).path(in: tapeRect), with: .color(Color(red: 0.82, green: 0.78, blue: 0.70).opacity(dimmed ? 0.2 : 0.5)), lineWidth: 0.5)

        // text
        let textColor = dimmed ? RackColors.tapeText.opacity(0.4) : RackColors.tapeText
        ctx.draw(
            Text(text).font(font).foregroundColor(textColor),
            at: CGPoint(x: tapeRect.midX, y: tapeRect.midY),
            anchor: .center
        )
    }

    // MARK: - cables

    func makeRopePath(points: [RopePoint]) -> Path {
        guard points.count >= 2 else { return Path() }
        var path = Path()
        path.move(to: CGPoint(x: points[0].x, y: points[0].y))

        if points.count == 2 {
            path.addLine(to: CGPoint(x: points[1].x, y: points[1].y))
            return path
        }

        // catmull-rom spline through all points for smooth curve
        for i in 0..<(points.count - 1) {
            let p0 = i > 0 ? CGPoint(x: points[i - 1].x, y: points[i - 1].y) : CGPoint(x: points[i].x, y: points[i].y)
            let p1 = CGPoint(x: points[i].x, y: points[i].y)
            let p2 = CGPoint(x: points[i + 1].x, y: points[i + 1].y)
            let p3 = i + 2 < points.count ? CGPoint(x: points[i + 2].x, y: points[i + 2].y) : p2

            let cp1 = CGPoint(x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6)
            let cp2 = CGPoint(x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6)
            path.addCurve(to: p2, control1: cp1, control2: cp2)
        }
        return path
    }

    func drawCableShadows(context: GraphicsContext, size: CGSize) {
        for (simIndex, cable) in model.cables {
            guard simIndex < model.simulators.count else { continue }
            let shadowPoints = cable.points.map { RopePoint(x: $0.x, y: $0.y + 5, oldX: $0.oldX, oldY: $0.oldY + 5) }
            let path = makeRopePath(points: shadowPoints)
            context.stroke(path, with: .color(RackColors.cableShadow.opacity(0.25)), style: StrokeStyle(lineWidth: 10, lineCap: .round, lineJoin: .round))
        }
    }

    // metal plug tip at cable endpoints
    func drawPlugTip(context: GraphicsContext, at center: CGPoint, color: Color, angle: CGFloat) {
        let tipLen: CGFloat = 12
        let tipW: CGFloat = 7

        // metallic barrel
        let barrelRect = CGRect(x: center.x - tipW / 2, y: center.y - 2, width: tipW, height: tipLen)
        var ctx = context
        ctx.translateBy(x: center.x, y: center.y)
        ctx.rotate(by: .radians(Double(angle)))
        ctx.translateBy(x: -center.x, y: -center.y)

        // barrel shadow
        ctx.fill(RoundedRectangle(cornerRadius: 2).path(in: barrelRect.offsetBy(dx: 1, dy: 1)),
                 with: .color(Color.black.opacity(0.3)))
        // barrel body
        ctx.fill(
            RoundedRectangle(cornerRadius: 2).path(in: barrelRect),
            with: .linearGradient(
                Gradient(colors: [
                    Color(red: 0.55, green: 0.55, blue: 0.58),
                    Color(red: 0.38, green: 0.38, blue: 0.40),
                    Color(red: 0.50, green: 0.50, blue: 0.53),
                ]),
                startPoint: CGPoint(x: barrelRect.minX, y: barrelRect.midY),
                endPoint: CGPoint(x: barrelRect.maxX, y: barrelRect.midY)
            )
        )
        // color ring near tip
        let ringRect = CGRect(x: center.x - tipW / 2 + 1, y: center.y - 1, width: tipW - 2, height: 3)
        ctx.fill(RoundedRectangle(cornerRadius: 1).path(in: ringRect), with: .color(color))
        // barrel highlight
        var hl = Path()
        hl.move(to: CGPoint(x: center.x - 1, y: center.y))
        hl.addLine(to: CGPoint(x: center.x - 1, y: center.y + tipLen - 3))
        ctx.stroke(hl, with: .color(Color.white.opacity(0.25)), lineWidth: 0.5)
    }

    func drawCables(context: GraphicsContext, size: CGSize) {
        for (simIndex, cable) in model.cables {
            guard simIndex < model.simulators.count else { continue }
            let color = model.cableColor(forSimIndex: simIndex)
            let connected = cable.serverIndex != nil
            let path = makeRopePath(points: cable.points)
            guard let firstPt = cable.points.first, let lastPt = cable.points.last else { continue }
            let startPt = CGPoint(x: firstPt.x, y: firstPt.y)
            let endPt = CGPoint(x: lastPt.x, y: lastPt.y)

            if connected {
                // outer glow
                context.stroke(path, with: .color(color.opacity(0.15)), style: StrokeStyle(lineWidth: 14, lineCap: .round, lineJoin: .round))
                // cable body (THICK)
                context.stroke(path, with: .color(color.opacity(0.85)), style: StrokeStyle(lineWidth: 7, lineCap: .round, lineJoin: .round))
                // highlight stripe
                context.stroke(path, with: .color(Color.white.opacity(0.18)), style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
                // dark underside
                context.stroke(path, with: .color(Color.black.opacity(0.12)), style: StrokeStyle(lineWidth: 7, lineCap: .round, lineJoin: .round))
                // repaint body over the dark
                context.stroke(path, with: .color(color.opacity(0.7)), style: StrokeStyle(lineWidth: 5.5, lineCap: .round, lineJoin: .round))

                // metal plug tips at both ends
                let startAngle = cable.points.count > 1 ?
                    atan2(cable.points[1].y - startPt.y, cable.points[1].x - startPt.x) - .pi / 2 : 0
                drawPlugTip(context: context, at: startPt, color: color, angle: startAngle)

                let n = cable.points.count
                let endAngle = n > 1 ?
                    atan2(cable.points[n - 2].y - endPt.y, cable.points[n - 2].x - endPt.x) - .pi / 2 : 0
                drawPlugTip(context: context, at: endPt, color: color, angle: endAngle)

                // pulse along rope
                if cable.isPulsing {
                    let t = cable.pulsePhase
                    let idx = min(Int(t * CGFloat(n - 1)), n - 1)
                    let px = cable.points[idx].x
                    let py = cable.points[idx].y
                    let pulseRect = CGRect(x: px - 5, y: py - 5, width: 10, height: 10)
                    context.fill(Circle().path(in: pulseRect), with: .color(Color.white.opacity(0.7)))
                }
            } else {
                // disconnected: slightly thinner
                context.stroke(path, with: .color(color.opacity(0.45)), style: StrokeStyle(lineWidth: 6, lineCap: .round, lineJoin: .round))
                context.stroke(path, with: .color(Color.white.opacity(0.1)), style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))

                // plug tip on dangling end
                let n = cable.points.count
                let endAngle = n > 1 ?
                    atan2(cable.points[n - 2].y - endPt.y, cable.points[n - 2].x - endPt.x) - .pi / 2 : 0
                drawPlugTip(context: context, at: endPt, color: color, angle: endAngle)

                // start plug tip
                let startAngle = cable.points.count > 1 ?
                    atan2(cable.points[1].y - startPt.y, cable.points[1].x - startPt.x) - .pi / 2 : 0
                drawPlugTip(context: context, at: startPt, color: color, angle: startAngle)
            }
        }
    }
}

// MARK: - Sound effects (synthesized cable plug/unplug)

class CableSounds {
    private static let engine = AVAudioEngine()
    private static var isSetup = false

    private static func setup() {
        guard !isSetup else { return }
        isSetup = true
        let _ = engine.mainMixerNode
        try? engine.start()
    }

    static func playPlug() {
        setup()
        // satisfying metallic "click-thunk" — short sine burst + noise
        let sampleRate: Double = 44100
        let duration: Double = 0.08
        let frameCount = AVAudioFrameCount(sampleRate * duration)
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return }
        buffer.frameLength = frameCount
        guard let data = buffer.floatChannelData?[0] else { return }

        for i in 0..<Int(frameCount) {
            let t = Double(i) / sampleRate
            let env = exp(-t * 60) // fast decay
            // mix of click frequencies for metallic sound
            let sig = sin(t * 1800 * .pi * 2) * 0.5 +
                      sin(t * 3200 * .pi * 2) * 0.3 +
                      sin(t * 800 * .pi * 2) * 0.4
            data[i] = Float(sig * env * 0.35)
        }

        let player = AVAudioPlayerNode()
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)
        player.scheduleBuffer(buffer) { DispatchQueue.main.async { engine.detach(player) } }
        player.play()
    }

    static func playUnplug() {
        setup()
        // softer "pop-release" — lower pitch, longer tail
        let sampleRate: Double = 44100
        let duration: Double = 0.12
        let frameCount = AVAudioFrameCount(sampleRate * duration)
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return }
        buffer.frameLength = frameCount
        guard let data = buffer.floatChannelData?[0] else { return }

        for i in 0..<Int(frameCount) {
            let t = Double(i) / sampleRate
            let env = exp(-t * 35) // medium decay
            // lower fundamental + descending pitch for "pop"
            let pitch = 600 - t * 2000 // pitch drops
            let sig = sin(t * pitch * .pi * 2) * 0.6 +
                      sin(t * 400 * .pi * 2) * 0.3
            data[i] = Float(sig * env * 0.3)
        }

        let player = AVAudioPlayerNode()
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)
        player.scheduleBuffer(buffer) { DispatchQueue.main.async { engine.detach(player) } }
        player.play()
    }
}

// MARK: - NSVisualEffectView bridge

struct VisualEffectBlur: NSViewRepresentable {
    var material: NSVisualEffectView.Material
    var blendingMode: NSVisualEffectView.BlendingMode

    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = material
        view.blendingMode = blendingMode
        view.state = .active
        return view
    }

    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {
        nsView.material = material
        nsView.blendingMode = blendingMode
    }
}

// MARK: - Popover controller

class CablePopoverController: NSObject, NSPopoverDelegate {
    var popover: NSPopover?
    let model = CableViewModel()

    func toggle(relativeTo button: NSStatusBarButton, onGear: @escaping () -> Void) {
        if let pop = popover, pop.isShown {
            pop.performClose(nil)
            return
        }

        let pop = NSPopover()
        pop.contentSize = NSSize(width: model.popoverWidth, height: model.popoverHeight)
        pop.behavior = .transient
        pop.animates = true
        pop.delegate = self

        let hostingView = NSHostingView(rootView:
            CableCanvasView(model: model, onGearTapped: onGear)
                .background(Color.black)
        )
        hostingView.frame = NSRect(x: 0, y: 0, width: model.popoverWidth, height: model.popoverHeight)

        let vc = NSViewController()
        vc.view = hostingView
        pop.contentViewController = vc

        pop.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        popover = pop
    }

    func popoverDidClose(_ notification: Notification) {
        model.stopPhysics()
        popover = nil
    }

    func updateFromStatus(_ status: DaemonStatus, simulatorMappings: [String: String]) {
        DispatchQueue.main.async {
            self.model.servers = status.servers.map { s in
                ServerInfo(id: s.id, port: s.port, bundleId: s.bundleId, root: s.root)
            }
            let booted = status.simulators.map { s in
                SimulatorInfo(name: s.name, udid: s.udid, state: s.state, iosVersion: s.iosVersion)
            }
            self.model.simulators = booted
            self.model.syncCables(simulatorMappings: simulatorMappings)

            // fetch available sims sparingly (every 10s, only when none booted)
            if booted.isEmpty && self.model.availableSimulators.isEmpty {
                SimulatorDiscovery.fetchAvailable(excluding: booted) { available in
                    DispatchQueue.main.async {
                        self.model.availableSimulators = available
                    }
                }
            } else if !booted.isEmpty {
                self.model.availableSimulators = []
            }
        }
    }
}

// MARK: - App delegate

class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem!
    var timer: Timer?
    var daemonRunning = false
    var lastStatus: DaemonStatus?
    var lastSimulatorMappings: [String: String] = [:]
    let cableController = CablePopoverController()

    var lastIconState: (Bool, Int) = (false, -1) // (daemonRunning, connCount)

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: 28)

        // left click opens cable view, right click opens menu
        if let button = statusItem.button {
            button.target = self
            button.action = #selector(handleClick)
            button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }

        updateIcon(connectionCount: 0)

        timer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            self?.refreshStatus()
        }
        refreshStatus()
    }

    @objc func handleClick(_ sender: NSStatusBarButton) {
        guard let event = NSApp.currentEvent else { return }
        if event.type == .rightMouseUp {
            showSettingsMenu()
        } else {
            openCableView()
        }
    }

    func showSettingsMenu() {
        let menu = buildSettingsMenu()
        statusItem.menu = menu
        statusItem.button?.performClick(nil)
        // clear menu after it closes so left click works again
        DispatchQueue.main.async { self.statusItem.menu = nil }
    }

    var statusDotView: NSView?
    let dotRadius: CGFloat = 2.5
    let dotOffset: CGPoint = CGPoint(x: 5.5, y: -5.5)

    func makePoolBallIcon(withDotCutout: Bool) -> NSImage {
        let size = NSSize(width: 18, height: 18)
        let image = NSImage(size: size, flipped: false) { rect in
            guard let ctx = NSGraphicsContext.current?.cgContext else { return false }
            let center = CGPoint(x: rect.midX, y: rect.midY)

            let outerRadius: CGFloat = 8.5
            ctx.setFillColor(NSColor.black.cgColor)
            ctx.fillEllipse(in: CGRect(x: center.x - outerRadius, y: center.y - outerRadius, width: outerRadius * 2, height: outerRadius * 2))

            let innerRadius: CGFloat = 4.5
            let innerCenter = CGPoint(x: center.x - 0.4, y: center.y + 0.4)
            ctx.setBlendMode(.clear)
            ctx.fillEllipse(in: CGRect(x: innerCenter.x - innerRadius, y: innerCenter.y - innerRadius, width: innerRadius * 2, height: innerRadius * 2))

            ctx.setBlendMode(.normal)
            let attrs: [NSAttributedString.Key: Any] = [
                .font: NSFont.systemFont(ofSize: 8, weight: .bold),
                .foregroundColor: NSColor.black,
            ]
            let str = NSAttributedString(string: "1", attributes: attrs)
            let strSize = str.size()
            str.draw(at: NSPoint(x: innerCenter.x - strSize.width / 2, y: innerCenter.y - strSize.height / 2))

            if withDotCutout {
                let dotCenter = CGPoint(x: center.x + self.dotOffset.x, y: center.y + self.dotOffset.y)
                ctx.setBlendMode(.clear)
                ctx.fillEllipse(in: CGRect(x: dotCenter.x - self.dotRadius - 1, y: dotCenter.y - self.dotRadius - 1, width: (self.dotRadius + 1) * 2, height: (self.dotRadius + 1) * 2))
            }
            return true
        }
        image.isTemplate = true
        return image
    }

    func updateIcon(connectionCount: Int) {
        let newState = (daemonRunning, connectionCount)
        guard newState != lastIconState else { return } // skip if nothing changed
        lastIconState = newState

        guard let button = statusItem.button else { return }
        let image = makePoolBallIcon(withDotCutout: daemonRunning)
        button.image = image

        statusDotView?.removeFromSuperview()
        statusDotView = nil
        if daemonRunning {
            let btnCenter = CGPoint(x: button.bounds.midX, y: button.bounds.midY)
            let dotCenter = CGPoint(x: btnCenter.x + dotOffset.x, y: btnCenter.y - dotOffset.y)
            let dot = NSView(frame: NSRect(x: dotCenter.x - dotRadius, y: dotCenter.y - dotRadius, width: dotRadius * 2, height: dotRadius * 2))
            dot.wantsLayer = true
            dot.layer?.backgroundColor = NSColor(calibratedRed: 0.2, green: 0.85, blue: 0.3, alpha: 1.0).cgColor
            dot.layer?.cornerRadius = dotRadius
            button.addSubview(dot)
            statusDotView = dot
        }
    }

    func refreshStatus() {
        DaemonHTTPClient.fetchStatus { [weak self] status in
            DispatchQueue.main.async {
                guard let self = self else { return }
                if let status = status {
                    self.lastStatus = status
                    self.daemonRunning = true
                    self.lastSimulatorMappings = status.simulatorRoutes ?? [:]
                    if let mode = status.routeMode {
                        self.cableController.model.routeMode = mode == "most-recent" ? "auto" : "manual"
                    }
                    let connCount = self.cableController.model.cables.values.filter { $0.serverIndex != nil }.count
                    self.updateIcon(connectionCount: connCount)
                    self.cableController.updateFromStatus(status, simulatorMappings: self.lastSimulatorMappings)
                } else {
                    self.daemonRunning = DaemonManager.isRunning()
                    self.lastStatus = nil
                    self.updateIcon(connectionCount: 0)
                }
            }
        }
    }

    // MARK: - Cable view (left click)

    @objc func openCableView() {
        guard let button = statusItem.button else { return }
        cableController.toggle(relativeTo: button) { [weak self] in
            self?.showSettingsMenu()
        }
    }

    // MARK: - Settings menu (right click / gear)

    func buildSettingsMenu() -> NSMenu {
        let menu = NSMenu()

        if daemonRunning {
            let serverCount = lastStatus?.servers.count ?? 0
            let statusText = "● Daemon Active — \(serverCount) server\(serverCount == 1 ? "" : "s")"
            let si = NSMenuItem(title: statusText, action: nil, keyEquivalent: "")
            si.isEnabled = false
            si.attributedTitle = NSAttributedString(string: statusText, attributes: [
                .foregroundColor: NSColor(calibratedRed: 0.2, green: 0.85, blue: 0.3, alpha: 1.0),
                .font: NSFont.systemFont(ofSize: 13, weight: .medium),
            ])
            menu.addItem(si)
        } else {
            let si = NSMenuItem(title: "○ Daemon Stopped", action: nil, keyEquivalent: "")
            si.isEnabled = false
            si.attributedTitle = NSAttributedString(string: "○ Daemon Stopped", attributes: [
                .foregroundColor: NSColor.secondaryLabelColor,
                .font: NSFont.systemFont(ofSize: 13, weight: .medium),
            ])
            menu.addItem(si)
        }

        menu.addItem(NSMenuItem.separator())

        // servers submenu with quick actions
        if let status = lastStatus, !status.servers.isEmpty {
            let serversItem = NSMenuItem(title: "Servers", action: nil, keyEquivalent: "")
            let serversSub = NSMenu()
            for server in status.servers {
                let home = ProcessInfo.processInfo.environment["HOME"] ?? ""
                let shortRoot = server.root.replacingOccurrences(of: home, with: "~")
                let isConnected = lastSimulatorMappings.values.contains(server.id)
                let serverItem = NSMenuItem(title: "\(isConnected ? "●" : "○") :\(server.port) \(shortRoot)", action: nil, keyEquivalent: "")
                let actionSub = NSMenu()
                let connectedSims = lastSimulatorMappings.filter { $0.value == server.id }
                if !connectedSims.isEmpty {
                    for (udid, _) in connectedSims {
                        let simName = lastStatus?.simulators.first(where: { $0.udid == udid })?.name ?? udid
                        let ci = NSMenuItem(title: "⚡ \(simName)", action: nil, keyEquivalent: "")
                        ci.isEnabled = false
                        actionSub.addItem(ci)
                    }
                    actionSub.addItem(NSMenuItem.separator())
                }
                let ra = NSMenuItem(title: "Route All Here", action: #selector(routeAllToServer(_:)), keyEquivalent: "")
                ra.target = self; ra.representedObject = server.id; actionSub.addItem(ra)
                let da = NSMenuItem(title: "Disconnect All", action: #selector(disconnectServer(_:)), keyEquivalent: "")
                da.target = self; da.representedObject = server.id; da.isEnabled = !connectedSims.isEmpty; actionSub.addItem(da)
                actionSub.addItem(NSMenuItem.separator())
                let oi = NSMenuItem(title: "Open in Finder", action: #selector(openFolder(_:)), keyEquivalent: "")
                oi.target = self; oi.representedObject = server.root; actionSub.addItem(oi)
                let ti = NSMenuItem(title: "Open in Terminal", action: #selector(openTerminal(_:)), keyEquivalent: "")
                ti.target = self; ti.representedObject = server.root; actionSub.addItem(ti)
                let ci = NSMenuItem(title: "Copy Port", action: #selector(copyPort(_:)), keyEquivalent: "")
                ci.target = self; ci.representedObject = "\(server.port)"; actionSub.addItem(ci)
                serverItem.submenu = actionSub; serversSub.addItem(serverItem)
            }
            serversItem.submenu = serversSub; menu.addItem(serversItem)
        }

        if let status = lastStatus, !status.simulators.isEmpty {
            let simsItem = NSMenuItem(title: "Simulators (\(status.simulators.count))", action: nil, keyEquivalent: "")
            let simsSub = NSMenu()
            for sim in status.simulators {
                let cid = lastSimulatorMappings[sim.udid]
                let cs = cid.flatMap { sid in status.servers.first(where: { $0.id == sid }) }
                let dot = cs != nil ? "●" : "○"
                let ver = sim.iosVersion.map { " (\($0))" } ?? ""
                let route = cs.map { " → :\($0.port)" } ?? ""
                let si = NSMenuItem(title: "\(dot) \(sim.name)\(ver)\(route)", action: nil, keyEquivalent: "")
                let sub = NSMenu()
                if !status.servers.isEmpty {
                    let h = NSMenuItem(title: "Route to:", action: nil, keyEquivalent: ""); h.isEnabled = false; sub.addItem(h)
                    for server in status.servers {
                        let home = ProcessInfo.processInfo.environment["HOME"] ?? ""
                        let sr = server.root.replacingOccurrences(of: home, with: "~")
                        let ri = NSMenuItem(title: ":\(server.port) \(sr)", action: #selector(routeSimToServer(_:)), keyEquivalent: "")
                        ri.target = self; ri.representedObject = ["udid": sim.udid, "serverId": server.id]
                        ri.state = cid == server.id ? .on : .off; sub.addItem(ri)
                    }
                }
                if cs != nil {
                    sub.addItem(NSMenuItem.separator())
                    let di = NSMenuItem(title: "Disconnect", action: #selector(disconnectSim(_:)), keyEquivalent: "")
                    di.target = self; di.representedObject = sim.udid; sub.addItem(di)
                }
                si.submenu = sub; simsSub.addItem(si)
            }
            simsItem.submenu = simsSub; menu.addItem(simsItem)
        }

        menu.addItem(NSMenuItem.separator())

        let modeItem = NSMenuItem(title: "Route Mode: \(cableController.model.routeMode == "auto" ? "Auto" : "Manual")", action: #selector(toggleRouteMode), keyEquivalent: "m")
        modeItem.target = self; menu.addItem(modeItem)
        menu.addItem(NSMenuItem.separator())

        if daemonRunning {
            let si = NSMenuItem(title: "Stop Daemon", action: #selector(stopDaemon), keyEquivalent: "")
            si.target = self; menu.addItem(si)
        } else {
            let si = NSMenuItem(title: "Start Daemon", action: #selector(startDaemon), keyEquivalent: "")
            si.target = self; menu.addItem(si)
        }

        let li = NSMenuItem(title: "Start on Login", action: #selector(toggleLoginItem), keyEquivalent: "")
        li.target = self; li.state = DaemonManager.isLoginItemEnabled() ? .on : .off; menu.addItem(li)
        let lo = NSMenuItem(title: "Open Logs", action: #selector(openLogs), keyEquivalent: "l")
        lo.target = self; menu.addItem(lo)
        menu.addItem(NSMenuItem.separator())
        let qi = NSMenuItem(title: "Quit", action: #selector(quitApp), keyEquivalent: "q")
        qi.target = self; menu.addItem(qi)

        return menu
    }

    // MARK: - Actions

    @objc func startDaemon() {
        DaemonManager.start()
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in self?.refreshStatus() }
    }

    @objc func stopDaemon() {
        DaemonManager.stop()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
            self?.daemonRunning = false; self?.lastStatus = nil; self?.refreshStatus()
        }
    }

    @objc func toggleRouteMode() {
        let next = cableController.model.routeMode == "auto" ? "manual" : "auto"
        cableController.model.routeMode = next
        _ = SocketClient.sendIPCMessage("set-route-mode", extra: ["mode": next == "auto" ? "most-recent" : "ask"])
    }

    @objc func toggleLoginItem() { DaemonManager.setLoginItem(enabled: !DaemonManager.isLoginItemEnabled()) }
    @objc func openLogs() { NSWorkspace.shared.open(URL(fileURLWithPath: DaemonManager.logDir)) }
    @objc func quitApp() { NSApplication.shared.terminate(nil) }

    @objc func routeAllToServer(_ sender: NSMenuItem) {
        guard let serverId = sender.representedObject as? String, let status = lastStatus else { return }
        for sim in status.simulators { DaemonHTTPClient.setSimulatorRoute(simulatorUdid: sim.udid, serverId: serverId) }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.refreshStatus() }
    }

    @objc func disconnectServer(_ sender: NSMenuItem) {
        guard let serverId = sender.representedObject as? String else { return }
        for (udid, _) in lastSimulatorMappings.filter({ $0.value == serverId }) { DaemonHTTPClient.clearSimulatorRoute(simulatorUdid: udid) }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.refreshStatus() }
    }

    @objc func openFolder(_ sender: NSMenuItem) {
        guard let path = sender.representedObject as? String else { return }
        NSWorkspace.shared.open(URL(fileURLWithPath: path))
    }

    @objc func openTerminal(_ sender: NSMenuItem) {
        guard let path = sender.representedObject as? String else { return }
        let escaped = path.replacingOccurrences(of: "'", with: "'\\''")
        let task = Process(); task.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        task.arguments = ["-e", "tell application \"Terminal\" to do script \"cd '\(escaped)'\""]
        try? task.run()
    }

    @objc func copyPort(_ sender: NSMenuItem) {
        guard let port = sender.representedObject as? String else { return }
        NSPasteboard.general.clearContents(); NSPasteboard.general.setString(port, forType: .string)
    }

    @objc func routeSimToServer(_ sender: NSMenuItem) {
        guard let info = sender.representedObject as? [String: String],
              let udid = info["udid"], let serverId = info["serverId"] else { return }
        DaemonHTTPClient.setSimulatorRoute(simulatorUdid: udid, serverId: serverId)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.refreshStatus() }
    }

    @objc func disconnectSim(_ sender: NSMenuItem) {
        guard let udid = sender.representedObject as? String else { return }
        DaemonHTTPClient.clearSimulatorRoute(simulatorUdid: udid)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.refreshStatus() }
    }
}

// MARK: - Array length helper

extension Array {
    var length: Int { count }
}

// MARK: - Entry point

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
