import { statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse } from 'dotenv'
import { type DotenvPopulateInput, expand } from 'dotenv-expand'
import { normalizePath } from 'vite'

type Mode = 'development' | 'production' | string

const DEFAULT_PREFIX = /^(ONE|VITE|TAMAGUI)_/

export async function loadEnv(
  mode: Mode,
  root = process.cwd(),
  userPrefix?: string | string[]
) {
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

  // load all env files and merge them
  const parsed = Object.fromEntries(
    (
      await Promise.all(
        envFiles.map(async (filePath) => {
          if (!tryStatSync(filePath)?.isFile()) return []
          const contents = await readFile(filePath, 'utf-8')
          return Object.entries(parse(contents))
        })
      )
    ).flat()
  )

  // support dotenv-expand for variable expansion
  const processEnv = { ...process.env } as DotenvPopulateInput
  expand({ parsed, processEnv })

  return parsed
}

function tryStatSync(file: string) {
  try {
    return statSync(file, { throwIfNoEntry: false })
  } catch {}
}
