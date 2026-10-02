/**
 * demo mode is enabled in development or when VITE_DEMO_MODE=1
 */
export const isDemoMode =
  process.env.NODE_ENV === 'development' || process.env.VITE_DEMO_MODE === '1'
