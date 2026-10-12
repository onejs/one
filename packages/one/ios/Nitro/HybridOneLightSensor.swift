import NitroModules

// ambient light behind One.LightSensor. ios exposes no public ambient
// light api, so the sensor reads unavailable and listeners never fire,
// matching expo-sensors' android-only LightSensor.
final class HybridOneLightSensor: HybridOneLightSensorSpec {
  func isAvailable() throws -> Bool {
    return false
  }

  func setUpdateInterval(intervalMs: Double) throws {
    // no sensor to pace.
  }

  func addListener(
    listener: @escaping (LightSensorMeasurement) -> Void
  ) throws -> () -> Void {
    return {}
  }
}
