import type { NativeBearerClientOptions } from './nativeBearerClient'
import type { AppPlatformClientPlugin } from './platformClientContract'

export function platformClient(
  _options: NativeBearerClientOptions,
): AppPlatformClientPlugin {
  return { id: 'app-platform' }
}
