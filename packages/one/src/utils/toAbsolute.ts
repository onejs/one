import { resolve } from 'node:path'

export const toAbsolute = (p: string) => resolve(process.cwd(), p)
