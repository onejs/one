export async function run(args: {}) {
  const { patch } = await import('vxrn')
  await patch({
    root: process.cwd(),
  })
}
