// shared module used by both client and server
// regression test: rolldown must not replace process.env.VITE_ENVIRONMENT with undefined
export function getViteEnvironment() {
  return process.env.VITE_ENVIRONMENT
}
