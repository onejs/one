export async function run(args: {}) {
  const { runAndroid } = await import('vxrn')

  // disabling: cant set no-bundler and port?
  // const options = await loadUserOneOptions('serve')

  await runAndroid({
    root: process.cwd(),
    // port: options.server?.port,
  })
}
