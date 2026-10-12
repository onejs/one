import { processColor, type ColorValue } from 'react-native'
import type { ChartDataPoint } from './chartTypes'

// Swift.Chart sends its data and style objects to Swift as JSON. colors travel
// as the processed ARGB number; a platform or dynamic color has no JSON form.
function nativeColor(name: string, color: ColorValue): number {
  const processed = processColor(color)
  if (typeof processed !== 'number') throw new Error(`Swift.Chart ${name} must be a color string or number`)
  return processed
}

export function chartPointsNative(name: string, points: readonly ChartDataPoint[]): string {
  if (!Array.isArray(points)) throw new Error(`Swift.Chart ${name} must be an array`)
  return JSON.stringify(
    points.map((point, index) => {
      if (typeof point?.x !== 'string' && (typeof point?.x !== 'number' || !Number.isFinite(point.x)))
        throw new Error(`Swift.Chart ${name}[${index}].x must be a string or finite number`)
      if (typeof point.y !== 'number' || !Number.isFinite(point.y))
        throw new Error(`Swift.Chart ${name}[${index}].y must be a finite number`)
      return {
        x: point.x,
        y: point.y,
        ...(point.color === undefined ? {} : { color: nativeColor(`${name}[${index}].color`, point.color) }),
      }
    })
  )
}

const pointStyles = ['circle', 'square', 'diamond']

// fields names the keys this style type declares in chartTypes.ts.
export function chartStyleNative(name: string, style: object | undefined, fields: readonly string[]): string {
  if (style === undefined) return '{}'
  if (typeof style !== 'object' || style === null) throw new Error(`Swift.Chart ${name} must be an object`)
  const native: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined) continue
    if (!fields.includes(key)) throw new Error(`Swift.Chart ${name} has unknown field ${key}`)
    if (key === 'color') native.color = nativeColor(`${name}.color`, value)
    else if (key === 'pointStyle') {
      if (!pointStyles.includes(value)) throw new Error(`Swift.Chart ${name}.pointStyle must be one of ${pointStyles.join(', ')}`)
      native.pointStyle = value
    } else if (key === 'dashArray') {
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'number' || !Number.isFinite(item) || item < 0))
        throw new Error(`Swift.Chart ${name}.dashArray must be an array of non-negative numbers`)
      native.dashArray = value
    } else {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Swift.Chart ${name}.${key} must be a finite number`)
      native[key] = value
    }
  }
  return JSON.stringify(native)
}
