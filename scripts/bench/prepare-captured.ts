#!/usr/bin/env bun
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const [inputPath, outputPath] = process.argv.slice(2)
if (!inputPath || !outputPath)
  throw new Error('usage: prepare-captured.ts <captured-one-entry.js> <output.js>')

const input = readFileSync(inputPath, 'utf8')
const start = input.indexOf('require_polyfillPromise=')
const end = input.indexOf(',NativeMicrotasks_exports=', start)
if (
  start < 0 ||
  end < start ||
  input.indexOf('require_polyfillPromise=', start + 1) >= 0 ||
  !input.slice(start, end).includes('hasPromise?.()')
)
  throw new Error('expected one captured React Native Promise setup factory')

const guard = "globalThis.__benchNativePromise=globalThis.Promise;var __benchNativeLog=globalThis.nativeLoggingHook;globalThis.nativeLoggingHook=function(message,level){if(typeof message==='string'&&message.includes('BENCH')&&globalThis.Promise!==globalThis.__benchNativePromise)throw Error('native Promise replaced during benchmark');return __benchNativeLog(message,level)};\n"
const output =
  guard +
  input.slice(0, start) +
  'require_polyfillPromise=__commonJSMin(()=>{})' +
  input.slice(end)
writeFileSync(outputPath, output)
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
const source = {
  capturedInputSha256: sha256(input),
  preparedSha256: sha256(output),
  nativePromise: 'captured setup module no-op; identity asserted on every BENCH log',
}
writeFileSync(outputPath + '.json', JSON.stringify(source, null, 2) + '\n')
console.log(JSON.stringify(source))
