import { inject } from 'vitest'
import type { WebdriverIOConfig } from './internal-utils/ios'

export function getWebDriverConfig(): WebdriverIOConfig {
  const webDriverConfig = inject('webDriverConfig' as never) as any

  if (!webDriverConfig) {
    throw new Error(
      "Cannot get webDriverConfig. Did you set 'globalSetup' to '@vxrn/test/setup-ios' in your Vitest config?"
    )
  }

  return webDriverConfig
}
