// ambient light through the platform light sensor, matching
// expo-sensors' parameters, payload fields and values. the function names
// drop expo's Async suffix and the words that repeat the namespace.
export interface LightSensorMeasurement {
  // ambient light in lux (lx).
  illuminance: number
  // seconds since boot, matching expo on android; unix seconds on web.
  timestamp: number
}

export interface LightSensorSubscription {
  remove(): void
}

// narrow native contract behind the platform backends: the three sensor
// methods, without any hybrid object surface.
export interface LightSensorBackend {
  isAvailable(): boolean
  setUpdateInterval(intervalMs: number): void
  addListener(listener: (event: LightSensorMeasurement) => void): () => void
}
