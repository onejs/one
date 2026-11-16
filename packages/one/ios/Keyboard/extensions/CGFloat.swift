import Foundation

extension CGFloat {
  static func interpolate(inputRange: [CGFloat], outputRange: [CGFloat], currentValue: CGFloat) -> CGFloat {
    let inputMin = inputRange.min() ?? 0
    let inputMax = inputRange.max() ?? 1
    let outputMin = outputRange.min() ?? 0
    let outputMax = outputRange.max() ?? 1

    let normalizedValue = (currentValue - inputMin) / (inputMax - inputMin)
    return outputMin + (outputMax - outputMin) * normalizedValue
  }
}
