import type { CompiledMDX, Frontmatter, HastRoot } from './types'

const FRONTMATTER_RE = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function unquote(raw: string): string {
  const trimmed = raw.trim()
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export function extractFrontmatter(source: string): Frontmatter {
  const match = FRONTMATTER_RE.exec(source)
  if (!match) return {}
  const frontmatter: Frontmatter = {}
  for (const line of (match[1] ?? '').split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    if (!key || /\s/.test(key)) continue
    frontmatter[key] = unquote(line.slice(colon + 1))
  }
  return frontmatter
}

function isHastRoot(value: unknown): value is HastRoot {
  if (!value || typeof value !== 'object') return false
  return (
    Reflect.get(value, 'type') === 'root' && Array.isArray(Reflect.get(value, 'children'))
  )
}

export function compiledMDX(source: string, hast: unknown): CompiledMDX {
  if (!isHastRoot(hast)) throw new Error('starter-mdx: Satteri returned invalid HAST')
  return {
    frontmatter: extractFrontmatter(source),
    hast,
  }
}
