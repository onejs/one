import { statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { normalizePath } from 'vite'

type Mode = 'development' | 'production'

const DEFAULT_PREFIX = /^(ONE|VITE|TAMAGUI)_/

export async function loadEnv(mode: Mode, root = process.cwd(), userPrefix?: string | string[]) {
  const loadedEnv = await loadJustEnvFiles(mode)
  const prefix = userPrefix ? (Array.isArray(userPrefix) ? userPrefix : [userPrefix]) : []
  const isPublicKey = (key: string) => {
    return prefix.some((p) => key.startsWith(p)) || DEFAULT_PREFIX.test(key)
  }

  const loaded: Record<string, string | undefined> = {}

  // defer to process.env
  for (const key in loadedEnv) {
    const val = process.env[key] || loadedEnv[key]
    loaded[key] = val
    process.env[key] = val
  }

  const clientEnv = Object.fromEntries(
    Object.entries({
      ...process.env,
      ...loaded,
    }).flatMap(([key, value]) => {
      if (isPublicKey(key)) {
        return [[key, value]]
      }
      return []
    })
  )

  return {
    serverEnv: loadedEnv,
    clientEnv,
    clientEnvDefine: Object.fromEntries(
      Object.entries(clientEnv).flatMap(([key, val]) => {
        const stringified = JSON.stringify(val)
        return [
          [`process.env.${key}`, stringified],
          [`import.meta.env.${key}`, stringified],
        ]
      })
    ),
  }
}

/**
 *
 * partially copied from vite but avoids the process.env stuff so we just get env file contents:
 *
 * Vite core license: Vite is released under the MIT license: MIT License
 * Copyright (c) 2019-present, VoidZero Inc. and Vite contributors
 *
 */

function getEnvFilesForMode(mode: Mode) {
  return [`.env`, `.env.local`, `.env.${mode}`, `.env.${mode}.local`].map((file) =>
    normalizePath(join('.', file))
  )
}

async function loadJustEnvFiles(mode: Mode) {
  const envFiles = getEnvFilesForMode(mode)
  const loadedEnvs = (
    await Promise.all(
      envFiles.map(async (filePath) => {
        if (!tryStatSync(filePath)?.isFile()) return []
        const contents = await readFile(filePath, 'utf-8')
        const parsed = parse(contents)
        return Object.entries(parsed)
      })
    )
  ).flat()
  return Object.fromEntries(loadedEnvs)
}

function tryStatSync(file: string) {
  try {
    return statSync(file, { throwIfNoEntry: false })
  } catch {}
}

// Parse src into an Object
const LINE =
  /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm

function parse(src: string) {
  const obj: Record<string, string> = {}

  // Convert buffer to string
  let lines = src.toString()

  // Convert line breaks to same format
  lines = lines.replace(/\r\n?/gm, '\n')

  let match
  while ((match = LINE.exec(lines)) != null) {
    const key = match[1]

    // Default undefined or null to empty string
    let value = match[2] || ''

    // Remove whitespace
    value = value.trim()

    // Check if double quoted
    const maybeQuote = value[0]

    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, '$2')

    // Expand newlines if double quoted
    if (maybeQuote === '"') {
      value = value.replace(/\\n/g, '\n')
      value = value.replace(/\\r/g, '\r')
    }

    // Add to object
    obj[key] = value
  }

  return obj
}
