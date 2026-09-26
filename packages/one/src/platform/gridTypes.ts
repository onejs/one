import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'

export const gridAlignments = [
  'topLeading', 'top', 'topTrailing',
  'leading', 'center', 'trailing',
  'bottomLeading', 'bottom', 'bottomTrailing',
] as const
export const gridHorizontalAlignments = ['leading', 'center', 'trailing'] as const
export const gridVerticalAlignments = [
  'top', 'center', 'bottom', 'firstTextBaseline', 'lastTextBaseline',
] as const

export type GridAlignment = (typeof gridAlignments)[number]
export type GridHorizontalAlignment = (typeof gridHorizontalAlignments)[number]
export type GridVerticalAlignment = (typeof gridVerticalAlignments)[number]

type GridItemBase = { spacing?: number; alignment?: GridAlignment }
export type GridItem = GridItemBase & (
  | { size: 'fixed'; value: number }
  | { size: 'flexible'; minimum?: number; maximum?: number }
  | { size: 'adaptive'; minimum: number; maximum?: number }
)

export interface LazyVGridProps extends ViewProps {
  columns: readonly GridItem[]
  alignment?: GridHorizontalAlignment
  spacing?: number
  children: ReactNode
}

export interface LazyHGridProps extends ViewProps {
  rows: readonly GridItem[]
  alignment?: GridVerticalAlignment
  spacing?: number
  children: ReactNode
}

export interface GridProps extends ViewProps {
  alignment?: GridAlignment
  horizontalSpacing?: number
  verticalSpacing?: number
  children: ReactNode
}

export interface GridRowProps extends ViewProps {
  alignment?: GridVerticalAlignment
  children: ReactNode
}

function nonnegative(value: number | undefined, label: string, required = false) {
  if (value === undefined && !required) return
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error(`${label} must be a non-negative finite number`)
}

export function gridSpacing(value: number | undefined, owner: string) {
  if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value)))
    throw new Error(`${owner} spacing must be a finite number`)
  return value === undefined ? 'null' : String(value)
}

export function gridItems(items: readonly GridItem[], owner: string) {
  if (!Array.isArray(items)) throw new Error(`${owner} items must be an array of GridItem values`)
  return JSON.stringify(items.map((item, index) => {
    const label = `${owner} item ${index}`
    if (!item || typeof item !== 'object') throw new Error(`${label} must be a GridItem`)
    if (item.alignment !== undefined && !gridAlignments.includes(item.alignment))
      throw new Error(`${label} alignment must be a SwiftUI Alignment`)
    if (item.spacing !== undefined &&
      (typeof item.spacing !== 'number' || !Number.isFinite(item.spacing)))
      throw new Error(`${label} spacing must be a finite number`)
    if (item.size === 'fixed') {
      nonnegative(item.value, `${label} value`, true)
    } else if (item.size === 'flexible' || item.size === 'adaptive') {
      nonnegative(item.minimum, `${label} minimum`, item.size === 'adaptive')
      nonnegative(item.maximum, `${label} maximum`)
      if (item.maximum !== undefined && item.maximum < (item.minimum ?? 10))
        throw new Error(`${label} maximum must be at least minimum`)
    } else throw new Error(`${label} size must be fixed, flexible, or adaptive`)
    return {
      size: item.size,
      value: item.size === 'fixed' ? item.value : -1,
      minimum: item.size === 'fixed' ? -1 : item.minimum ?? -1,
      maximum: item.size === 'fixed' ? -1 : item.maximum ?? -1,
      spacing: item.spacing ?? null,
      alignment: item.alignment ?? '',
    }
  }))
}
