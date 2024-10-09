export async function run(args: {}) {
  const { runAndroid } = await import('vxrn')
  await runAndroid({
    root: process.cwd(),
  })
}
