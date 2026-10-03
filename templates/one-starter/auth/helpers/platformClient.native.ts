import { nativeBearerClient } from './nativeBearerClient'
import type { NativeBearerClientOptions } from './nativeBearerClient'
import type { AppPlatformClientPlugin } from './platformClientContract'

export function platformClient(
  options: NativeBearerClientOptions,
): AppPlatformClientPlugin {
  return nativeBearerClient(options)
}
