// process.versions.node is "20.19.0". process.version is "v20.19.0", and +"v20" is NaN.
// rolldown and vite require this range. keep run.mjs in step with it.
export function checkNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map((part) => Number(part))
  if ((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22) return
  console.error('One requires Node ^20.19.0 || >=22.12.0')
  process.exit(1)
}
