import { existsSync } from 'node:fs'
import { run } from './run'

export async function cliMain(args?: any) {
  if (existsSync('vite.config.ts')) {
    // inside existing app, lets just run the damn ting
    await run(args || {})
    process.exit(0)
  }

  const { create } = await import('create-vxrn/create')

  await create({})
}
