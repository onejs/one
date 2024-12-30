export async function run(args: { platform?: string; expo: boolean }) {
  const { prebuild } = await import('vxrn')

  const { platform, expo } = args

  await prebuild({
    root: process.cwd(),
    platform,
    expo,
  })
}
