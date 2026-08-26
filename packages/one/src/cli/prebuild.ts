import { loadUserOneOptions } from '../vite/loadConfig'

export async function run(args: {
  platform?: string
  expo: boolean
  'no-install'?: boolean
}) {
  await loadUserOneOptions('build', true)
  const { prebuild } = await import('vxrn')

  await prebuild({
    root: process.cwd(),
    ...args,
  })
}
