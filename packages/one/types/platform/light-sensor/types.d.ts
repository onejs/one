export interface LightSensorMeasurement {
    illuminance: number;
    timestamp: number;
}
export interface LightSensorSubscription {
    remove(): void;
}
export interface LightSensorBackend {
    isAvailable(): boolean;
    setUpdateInterval(intervalMs: number): void;
    addListener(listener: (event: LightSensorMeasurement) => void): () => void;
}
//# sourceMappingURL=types.d.ts.map