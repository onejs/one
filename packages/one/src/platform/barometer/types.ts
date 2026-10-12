// air pressure through the platform barometers, matching expo-sensors'
// parameters, payload fields and values. the function names drop expo's
// Async suffix and the words that repeat the namespace.
export interface BarometerMeasurement {
  // hectopascals (hPa). ios reports kilopascals and converts.
  pressure: number
  // meters above the first reading, ios only. android omits it.
  relativeAltitude?: number
  // seconds since boot, matching expo on both platforms.
  timestamp: number
}

export interface BarometerSubscription {
  remove(): void
}
