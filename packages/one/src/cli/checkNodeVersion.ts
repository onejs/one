export function checkNodeVersion() {
  const [major, minor] = process.version.split('.')

  if (+major < 20) {
    console.error(`One requires Node >= 20.11 (for import.meta.dirname support)`)
    process.exit(1)
  }

  if (+major === 20 && +minor < 12) {
    console.error(`One requires Node >= 20.11 (for import.meta.dirname support)`)
    process.exit(1)
  }
}
