import type { CommandDef } from 'citty'

const runDefault = (r: any) => (r.default || r) as Promise<CommandDef>

export const commands = {
  // @ts-ignore
  dev: () => import('./cli-dev.mjs').then(runDefault),
}
  