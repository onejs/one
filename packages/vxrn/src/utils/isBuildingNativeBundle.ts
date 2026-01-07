// sorry for the mess, exploring before abstracting

export let isBuildingNativeBundle: Promise<string> | null = null

export function setIsBuildingNativeBundle(val: Promise<string> | null = null) {
  isBuildingNativeBundle = val
}
