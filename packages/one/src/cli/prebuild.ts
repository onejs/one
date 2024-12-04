export async function run(args: { platform?: string }) {
  const { prebuild } = await import('vxrn')

  const { platform } = args

  await prebuild({
    root: process.cwd(),
    platform,
  })
}
