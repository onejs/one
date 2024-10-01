import { exists } from 'node:fs'

export const existsAsync = (file: string) => {
  return new Promise((res, rej) => {
    try {
      exists(file, res)
    } catch {
      return false
    }
  })
}
