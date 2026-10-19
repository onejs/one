import {
  NotificationCenter,
  NSNotification_Name,
  OperationQueue,
  ProcessInfo,
} from 'one/ios/Foundation'
import { UIDevice } from 'one/ios/UIKit'
import type { SDKHandle } from 'one/ios-runtime'
import type { HybridObject } from 'react-native-nitro-modules'
import { isSimulatorEnvironment } from '../device/map'
import type { OneBattery } from '../specs/OneBattery.nitro'
import type {
  BatteryLevelEvent,
  BatteryPowerModeEvent,
  BatteryPowerState,
  BatteryState,
  BatteryStateEvent,
} from './types'
import { mapBatteryState } from './map'

// battery level, state and low power mode behind One.Battery, matching
// expo-battery's values: UIDevice for level and state, ProcessInfo for low
// power mode. monitoring runs while any listener is attached; a one-shot
// read enables it only for the read.
//
// every state transition runs through one chain, which is the serial
// main queue the swift had: reads, setup, events and teardown apply in
// order, a failing step never blocks the next, and an add removed before
// its setup runs leaves monitoring as it found it.
const levelListeners = new Set<{ callback: (event: BatteryLevelEvent) => void }>()
const stateListeners = new Set<{ callback: (event: BatteryStateEvent) => void }>()
const lowPowerListeners = new Set<{ callback: (event: BatteryPowerModeEvent) => void }>()
let observers: SDKHandle[] = []
let lastLevel: number | undefined
let lastState: BatteryState | undefined
let lastLowPower: boolean | undefined

function listening(): boolean {
  return levelListeners.size + stateListeners.size + lowPowerListeners.size > 0
}

let tail: Promise<void> = Promise.resolve()

function enqueue(step: () => Promise<void>): void {
  const safe = () => step().catch(() => {})
  tail = tail.then(safe, safe)
}

// monitoring must be on for level and state to read anything but unknown.
// one-shots leave it as they found it unless a listener needs it on. the
// whole enable/access/restore transaction runs on the chain, so overlapping
// reads cannot restore monitoring out from under each other.
function withMonitoring<T>(body: (device: UIDevice) => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    enqueue(async () => {
      let device: UIDevice | undefined
      let wasMonitoring = true
      try {
        device = await UIDevice.current
        wasMonitoring = await device.isBatteryMonitoringEnabled
        if (!wasMonitoring) await device.setIsBatteryMonitoringEnabled(true)
        resolve(await body(device))
      } catch (error) {
        reject(error)
      } finally {
        if (device && !wasMonitoring && !listening()) {
          await device.setIsBatteryMonitoringEnabled(false)
        }
      }
    })
  })
}

async function getLevel(): Promise<number> {
  return withMonitoring(async (device) => await device.batteryLevel)
}

async function getState(): Promise<BatteryState> {
  return withMonitoring(async (device) => mapBatteryState(await device.batteryState))
}

async function getPowerState(): Promise<BatteryPowerState> {
  return withMonitoring(async (device) => ({
    batteryLevel: await device.batteryLevel,
    batteryState: mapBatteryState(await device.batteryState),
    lowPowerMode: ProcessInfo.processInfo.isLowPowerModeEnabled,
  }))
}

async function isLowPowerModeEnabled(): Promise<boolean> {
  return ProcessInfo.processInfo.isLowPowerModeEnabled
}

// the spec defines availability by simulator, which the old swift read as a
// -1 level: true on android and physical ios devices, false on simulators.
function isAvailable(): boolean {
  return !isSimulatorEnvironment(ProcessInfo.processInfo.environment)
}

// the first listener starts monitoring and the notifications; each kind's
// last value is snapshotted once observing, so only later changes emit. an
// add removed before its setup runs leaves monitoring as it found it.
async function startIfNeeded(): Promise<void> {
  if (observers.length > 0 || !listening()) return
  const device = await UIDevice.current
  await device.setIsBatteryMonitoringEnabled(true)
  const center = NotificationCenter.default
  const queue = OperationQueue.main
  const levelName = await UIDevice.batteryLevelDidChangeNotification
  const stateName = await UIDevice.batteryStateDidChangeNotification
  if (!listening()) {
    await device.setIsBatteryMonitoringEnabled(false)
    return
  }
  observers = [
    center.addObserver(levelName, null, queue, () => levelChanged()),
    center.addObserver(stateName, null, queue, () => stateChanged()),
    center.addObserver(NSNotification_Name.NSProcessInfoPowerStateDidChange, null, queue, () =>
      lowPowerChanged()
    ),
  ]
  lastLevel = await device.batteryLevel
  lastState = mapBatteryState(await device.batteryState)
  lastLowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
}

async function stopIfIdle(): Promise<void> {
  if (listening() || observers.length === 0) return
  const center = NotificationCenter.default
  for (const observer of observers) center.removeObserver(observer)
  observers = []
  lastLevel = undefined
  lastState = undefined
  lastLowPower = undefined
  const device = await UIDevice.current
  await device.setIsBatteryMonitoringEnabled(false)
}

function levelChanged(): void {
  enqueue(async () => {
    if (observers.length === 0) return
    const level = await (await UIDevice.current).batteryLevel
    if (level === lastLevel) return
    lastLevel = level
    for (const entry of levelListeners) entry.callback({ batteryLevel: level })
  })
}

function stateChanged(): void {
  enqueue(async () => {
    if (observers.length === 0) return
    const state = mapBatteryState(await (await UIDevice.current).batteryState)
    if (state === lastState) return
    lastState = state
    for (const entry of stateListeners) entry.callback({ batteryState: state })
  })
}

function lowPowerChanged(): void {
  enqueue(async () => {
    if (observers.length === 0) return
    const lowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
    if (lowPower === lastLowPower) return
    lastLowPower = lowPower
    for (const entry of lowPowerListeners) entry.callback({ lowPowerMode: lowPower })
  })
}

// one entry per subscription, not per callback: subscribing the same
// callback twice counts twice, and removing one subscription leaves the
// other live with monitoring intact, matching the swift's id registrations.
function addLevelListener(listener: (event: BatteryLevelEvent) => void): () => void {
  const entry = { callback: listener }
  levelListeners.add(entry)
  enqueue(startIfNeeded)
  let removed = false
  return () => {
    if (removed) return
    removed = true
    levelListeners.delete(entry)
    enqueue(stopIfIdle)
  }
}

function addStateListener(listener: (event: BatteryStateEvent) => void): () => void {
  const entry = { callback: listener }
  stateListeners.add(entry)
  enqueue(startIfNeeded)
  let removed = false
  return () => {
    if (removed) return
    removed = true
    stateListeners.delete(entry)
    enqueue(stopIfIdle)
  }
}

function addLowPowerModeListener(
  listener: (event: BatteryPowerModeEvent) => void
): () => void {
  const entry = { callback: listener }
  lowPowerListeners.add(entry)
  enqueue(startIfNeeded)
  let removed = false
  return () => {
    if (removed) return
    removed = true
    lowPowerListeners.delete(entry)
    enqueue(stopIfIdle)
  }
}

const backend = {
  getLevel,
  getState,
  getPowerState,
  isLowPowerModeEnabled,
  isAvailable,
  addLevelListener,
  addStateListener,
  addLowPowerModeListener,
} satisfies Omit<OneBattery, keyof HybridObject<{}>>

export function batteryNative() {
  return backend
}
