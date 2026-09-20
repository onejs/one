import { getInitialWindowMetrics } from '@vxrn/native/safe-area'
import type { Metrics } from './SafeArea-types'

export const initialWindowMetrics: Metrics | null = getInitialWindowMetrics()

/**
 * @deprecated
 */
export const initialWindowSafeAreaInsets = initialWindowMetrics?.insets
