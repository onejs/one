import Foundation
import QuartzCore

protocol KeyboardAnimationProtocol {
  var startTime: CFTimeInterval { get }
  var diff: Double { get }
  var isIncreasing: Bool { get }

  func valueAt(time: Double) -> Double
  func timingAt(value: Double) -> Double
}

public class KeyboardAnimation: KeyboardAnimationProtocol {
  weak var animation: CAMediaTiming?

  // constructor variables
  let fromValue: Double
  let toValue: Double
  let duration: Double
  let speed: Double
  let timestamp: CFTimeInterval
  /// internal state
  var lastValue: Double

  init(fromValue: Double, toValue: Double, animation: CAMediaTiming, duration: Double) {
    self.fromValue = fromValue
    self.toValue = toValue
    self.animation = animation
    self.duration = duration
    lastValue = fromValue
    speed = Double(animation.speed)
    timestamp = CACurrentMediaTime()
  }

  /// public getters
  var startTime: CFTimeInterval {
    // when concurrent animation happens, then `.beginTime` remains the same
    return max(animation?.beginTime ?? timestamp, timestamp)
  }

  var diff: Double {
    return ((animation?.beginTime ?? timestamp) - timestamp).truncatingRemainder(dividingBy: UIUtils.nextFrame)
  }

  var isIncreasing: Bool {
    return fromValue < toValue
  }

  var isFinished: Bool {
    return lastValue == toValue
  }

  func valueAt(time _: Double) -> Double {
    fatalError("Method is not implemented in abstract class!")
  }

  func timingAt(value: Double) -> Double {
    var lowerBound = 0.0
    var upperBound = 1.0 // Assuming 1 second is the max duration for simplicity
    let tolerance = 0.00001 // Define how precise you want to be
    var tGuess = 0.0

    // Check the direction of the animation
    let isIncreasing = isIncreasing

    while (upperBound - lowerBound) > tolerance {
      tGuess = (lowerBound + upperBound) / 2
      let currentValue = valueAt(time: tGuess / speed)

      // Adjust the condition to account for the direction of animation
      if (currentValue < value && isIncreasing) || (currentValue > value && !isIncreasing) {
        lowerBound = tGuess
      } else {
        upperBound = tGuess
      }
    }

    return tGuess / speed
  }
}
