#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, join } from 'node:path'

const [mode, ...args] = process.argv.slice(2)
if (mode === 'clean') {
  for (const app of args) {
    if (!existsSync(app)) continue
    if (basename(app) !== 'OneBench.app' || lstatSync(app).isSymbolicLink())
      throw new Error(`unexpected app product: ${app}`)
    rmSync(app, { recursive: true })
  }
} else if (mode === 'manifest') {
  const [folder, engine, target] = args
  if (
    !folder ||
    !['hermes', 'bun'].includes(engine) ||
    !['device', 'simulator'].includes(target)
  )
    throw new Error('manifest requires output directory, engine and target')
  const app = join(folder, 'OneBench.app')
  let appBytes = 0
  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile()) appBytes += statSync(path).size
    }
  }
  walk(app)
  const hash = (path: string) =>
    createHash('sha256').update(readFileSync(path)).digest('hex')
  const metadata: Record<string, unknown> = {
    engine,
    target,
    commit: readFileSync(join(folder, 'commit.txt'), 'utf8').trim(),
    xcode: execFileSync('xcodebuild', ['-version'], { encoding: 'utf8' }).trim(),
    appBytes,
    bundleId: execFileSync(
      '/usr/libexec/PlistBuddy',
      ['-c', 'Print :CFBundleIdentifier', join(app, 'Info.plist')],
      { encoding: 'utf8' }
    ).trim(),
  }
  const bundlePath = join(app, 'main.jsbundle'),
    bundle = readFileSync(bundlePath)
  if (engine === 'hermes' && bundle.subarray(0, 8).toString('hex') !== 'c61fbc03c103191f')
    throw new Error('Hermes build does not contain shipped Hermes bytecode')
  if (engine === 'bun') {
    if (bundle.toString() !== '/*bun-compiled-entry*/')
      throw new Error('Bun build has no compiled entry marker')
    for (const framework of ['Bun', 'BunCompat'])
      metadata[`${framework}Sha256`] = hash(
        join(app, 'Frameworks', `${framework}.framework`, framework)
      )
  }
  metadata.bundleSha256 = hash(bundlePath)
  writeFileSync(join(folder, 'build.json'), JSON.stringify(metadata, null, 2) + '\n')
} else
  throw new Error(
    'usage: artifacts.ts clean <app paths...> | manifest <output> <engine> <target>'
  )
