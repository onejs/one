export let connectedNativeClients = 0;

export function addConnectedNativeClient() {
  connectedNativeClients++;
}

export function removeConnectedNativeClient() {
  connectedNativeClients--;
}
