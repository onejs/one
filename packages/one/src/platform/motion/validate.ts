export function validateListener(
  sensor: string,
  intervalMs: number,
  onReading: unknown,
  onError: unknown
): void {
  if (!['accelerometer', 'gyroscope', 'magnetometer', 'deviceMotion'].includes(sensor))
    throw new TypeError('Motion.addListener requires a supported sensor')
  if (!Number.isFinite(intervalMs) || intervalMs < 0 || intervalMs > 1000)
    throw new RangeError('Motion.addListener intervalMs must be between 0 and 1000')
  if (typeof onReading !== 'function' || typeof onError !== 'function')
    throw new TypeError('Motion.addListener requires reading and error callbacks')
}
