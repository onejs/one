import { NWPathMonitor, type NWPath } from 'one/ios/Network'
import { DispatchQueue } from 'one/ios/Dispatch'
import type { NetworkState, NetworkStateType } from './types'

function state(path: NWPath): NetworkState {
  if (path.status !== 'satisfied') {
    return { type: 'none', isConnected: false, isInternetReachable: false }
  }
  const type: NetworkStateType = path.usesInterfaceType('cellular') ? 'cellular'
    : path.usesInterfaceType('wifi') ? 'wifi'
    : path.usesInterfaceType('wiredEthernet') ? 'ethernet' : 'unknown'
  return { type, isConnected: true, isInternetReachable: true }
}

function getState(): Promise<NetworkState> {
  return new Promise((resolve, reject) => {
    const monitor = NWPathMonitor.init()
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      monitor.cancel()
      reject(Object.assign(new Error('Network.getState: timed out waiting for the network path.'), {
        code: 'E_NETWORK_TIMEOUT',
      }))
    }, 5000)
    monitor.pathUpdateHandler = (path) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      monitor.cancel()
      resolve(state(path))
    }
    monitor.start(DispatchQueue.main)
  })
}

const listeners = new Map<number, (value: NetworkState) => void>()
let nextId = 0
let monitor: NWPathMonitor | undefined

function addStateListener(listener: (value: NetworkState) => void): () => void {
  const id = nextId++
  listeners.set(id, listener)
  if (!monitor) {
    const current = NWPathMonitor.init()
    monitor = current
    current.pathUpdateHandler = (path) => {
      // cancellation can leave a callback queued on the JS thread.
      if (monitor !== current) return
      const next = state(path)
      for (const callback of [...listeners.values()]) callback(next)
    }
    current.start(DispatchQueue.main)
  }
  return () => {
    listeners.delete(id)
    if (!listeners.size && monitor) {
      const current = monitor
      monitor = undefined
      current.cancel()
    }
  }
}

const backend = { getState, addStateListener }

export function networkNative() {
  return backend
}
