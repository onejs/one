type Env = string

export const connectedNativeClients = new Map<Env, number>()

export function addConnectedNativeClient(env: Env) {
  connectedNativeClients.set(env, (connectedNativeClients.get(env) || 0) + 1)
}

export function removeConnectedNativeClient(env: Env) {
  connectedNativeClients.set(env, (connectedNativeClients.get(env) || 0) - 1)
}
