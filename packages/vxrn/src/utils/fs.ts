import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

// small fs helpers over node builtins, matching the fs-extra surface vxrn used:
// read errors propagate as-is, json parse errors are prefixed with the file
// path, and json writes are compact with a trailing newline.

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function stripBom(content: string): string {
  return content.replace(/^\uFEFF/, '')
}

function parseJSON<T>(path: string, content: string): T {
  try {
    return JSON.parse(stripBom(content))
  } catch (err) {
    ;(err as Error).message = `${path}: ${(err as Error).message}`
    throw err
  }
}

export async function readJSON<T = any>(path: string): Promise<T> {
  return parseJSON(path, await readFile(path, 'utf8'))
}

export function readJSONSync<T = any>(path: string): T {
  return parseJSON(path, readFileSync(path, 'utf8'))
}

function stringifyJSON(data: unknown): string {
  return `${JSON.stringify(data)}\n`
}

export async function writeJSON(path: string, data: unknown): Promise<void> {
  await writeFile(path, stringifyJSON(data))
}

export async function outputJSON(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeJSON(path, data)
}

export function outputFileSync(
  path: string,
  data: string | Uint8Array,
  options?: { encoding?: BufferEncoding }
): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, data, options)
}
