export async function run(args: {}) {
  const { prebuild } = await import('vxrn')
  await prebuild({
    root: process.cwd(),
  })
}
