// eslint-disable-next-line no-restricted-imports
import {
  DEFAULT_LANGUAGE_CODE,
  DEFAULT_LANGUAGE_TAG,
  DeviceLocale,
} from 'utilities/src/device/constants'
import { logger } from 'utilities/src/logger/logger'

export function getDeviceLocales(): DeviceLocale[] {
  try {
    return [{ languageCode: 'en-US', languageTag: 'english' }]
  } catch (e) {
    const isKnownError = e instanceof Error && e.message.includes('Unsupported ISO 3166 country')
    if (!isKnownError) {
      logger.error(e, {
        level: 'warning',
        tags: { file: 'utils.ts', function: 'getDeviceLocales' },
      })
    }
  }
  return [
    {
      languageCode: DEFAULT_LANGUAGE_CODE,
      languageTag: DEFAULT_LANGUAGE_TAG,
    },
  ]
}
