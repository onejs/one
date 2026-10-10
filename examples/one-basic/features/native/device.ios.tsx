import { Device } from '../../native/Showcase/Device.swift'
import SwiftLevel from '../../native/Showcase/Level.swift'
import type { LevelProps } from './device'

export { Device }

// the swift view takes json props; the slider below it changes the value.
export function Level({ value }: LevelProps) {
  return <SwiftLevel value={value} />
}
