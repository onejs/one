type PartialEnvironment = {
  name: string
}

export function isWebEnvironment(environment: PartialEnvironment) {
  return environment.name === 'client' || environment.name === 'ssr'
}

export function isNativeEnvironment(environment: PartialEnvironment) {
  return (
    environment.name === 'ios' ||
    environment.name === 'android' ||
    environment.name === 'macos' ||
    environment.name === 'linux'
  )
}

export function isIOSEnvironment(environment: PartialEnvironment) {
  return environment.name === 'ios'
}

export function isAndroidEnvironment(environment: PartialEnvironment) {
  return environment.name === 'android'
}
