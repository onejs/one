/**
 * Shared utilities for modifications in the fork.
 */

export const getParamName = (pattern: string) =>
  pattern.replace(/^[:*]/, '').replace(/\?$/, '')

export function getParamValue(p: string, value: string) {
  if (p.startsWith('*')) {
    const values = value.split('/').filter((v) => v !== '')
    return values.length === 0 && p.endsWith('?') ? undefined : values
  }

  return value
}

export function isDynamicPart(p: string) {
  return p.length > 1 && (p.startsWith(':') || p.startsWith('*'))
}

export function replacePart(p: string) {
  return p.replace(/^[:*]/, '').replace(/\?$/, '')
}
