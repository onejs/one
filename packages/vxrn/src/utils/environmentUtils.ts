import type { Environment } from 'vite'

export function isWebEnvironment(environment: Environment) {
  return environment.name === 'client' || environment.name === 'ssr'
}

export function isNativeEnvironment(environment: Environment) {
  return environment.name === 'ios' || environment.name === 'android'
}

export function isIOSEnvironment(environment: Environment) {
  return environment.name === 'ios'
}

export function isAndroidEnvironment(environment: Environment) {
  return environment.name === 'android'
}
