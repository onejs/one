import { version } from 'vite'

const majorVersion = parseInt(version.split('.')[0], 10)

export function isRolldown(): boolean {
  return majorVersion >= 8
}
