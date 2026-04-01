import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Resolve to native filesystem path — for fs operations (readFile, writeFile, join). */
export const toAbsolute = (p: string) => resolve(process.cwd(), p)

/** Resolve to file:// URL — for dynamic import() which requires URLs on Windows. */
export const toAbsoluteUrl = (p: string) => pathToFileURL(resolve(process.cwd(), p)).href
