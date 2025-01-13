export async function run(args: { platform?: string; expo: boolean; 'no-install'?: boolean }) {
  const { prebuild } = await import('vxrn')

  await prebuild({
    root: process.cwd(),
    ...args,
  })
}
