import Network
import NitroModules

// connection state matching expo-network: type plus connected and reachable
// flags from NWPathMonitor. one shared monitor runs while any listener is
// attached: the first listener starts it, so its first path is never
// dropped, and the last removal cancels it.
final class HybridOneNetwork: HybridOneNetworkSpec {
  private let lock = NSLock()
  private var listeners: [Int: (NetworkState) -> Void] = [:]
  private var nextListenerId = 0
  private var monitor: NWPathMonitor?

  // expo-network mapping: only a satisfied path is connected, anything else
  // is none, and reachability follows connected. ios never reports the
  // android-only other, vpn, or wimax types.
  private static func state(for path: NWPath) -> NetworkState {
    guard path.status == .satisfied else {
      return NetworkState(type: .none, isConnected: false, isInternetReachable: false)
    }
    let type: NetworkStateType
    if path.usesInterfaceType(.cellular) {
      type = .cellular
    } else if path.usesInterfaceType(.wifi) {
      type = .wifi
    } else if path.usesInterfaceType(.wiredEthernet) {
      type = .ethernet
    } else {
      type = .unknown
    }
    return NetworkState(type: type, isConnected: true, isInternetReachable: true)
  }

  func getState() throws -> Promise<NetworkState> {
    let promise = Promise<NetworkState>()
    let monitor = NWPathMonitor()
    let queue = DispatchQueue(label: "dev.onejs.network")
    // the handler and the timeout both run on this serial queue, so the flag
    // needs no lock. the first path settles; with none in five seconds the
    // read rejects instead of hanging.
    var settled = false
    monitor.pathUpdateHandler = { path in
      if settled { return }
      settled = true
      monitor.cancel()
      promise.resolve(withResult: HybridOneNetwork.state(for: path))
    }
    monitor.start(queue: queue)
    queue.asyncAfter(deadline: .now() + 5) {
      if settled { return }
      settled = true
      monitor.cancel()
      promise.reject(
        withError: oneNativeError(
          "E_NETWORK_TIMEOUT", "Network.getState: timed out waiting for the network path."))
    }
    return promise
  }

  func addStateListener(listener: @escaping (_ state: NetworkState) -> Void) throws -> () -> Void {
    lock.lock()
    defer { lock.unlock() }
    let id = nextListenerId
    nextListenerId += 1
    listeners[id] = listener
    if monitor == nil {
      let next = NWPathMonitor()
      next.pathUpdateHandler = { [weak self] path in
        self?.emit(HybridOneNetwork.state(for: path))
      }
      next.start(queue: .main)
      monitor = next
    }
    return { [weak self] in self?.removeListener(id) }
  }

  private func emit(_ state: NetworkState) {
    lock.lock()
    let current = Array(listeners.values)
    lock.unlock()
    for listener in current {
      listener(state)
    }
  }

  private func removeListener(_ id: Int) {
    lock.lock()
    defer { lock.unlock() }
    listeners[id] = nil
    if listeners.isEmpty {
      monitor?.cancel()
      monitor = nil
    }
  }
}
