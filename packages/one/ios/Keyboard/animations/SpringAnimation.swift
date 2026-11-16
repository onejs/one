import Foundation
import QuartzCore

// swiftlint:disable identifier_name
public final class SpringAnimation: KeyboardAnimation {
  // internal variables
  private let zeta: Double // Damping ratio
  private let omega0: Double // Undamped angular frequency of the oscillator
  private let omega1: Double // Exponential decay
  private let v0: Double // Initial velocity
  // pre-computed values
  private let x0: Double
  private let isUnderDamped: Bool
  private let aUnder: Double
  private let bUnder: Double
  private let aCritical: Double
  private let bCritical: Double

  // constructor variables
  private let stiffness: Double
  private let damping: Double
  private let mass: Double
  private let initialVelocity: Double

  init(animation: CASpringAnimation, fromValue: Double, toValue: Double) {
    stiffness = animation.stiffness
    damping = animation.damping
    mass = animation.mass
    initialVelocity = animation.initialVelocity

    zeta = damping / (2 * sqrt(stiffness * mass)) // Damping ratio
    omega0 = sqrt(stiffness / mass) // Undamped angular frequency of the oscillator
    omega1 = omega0 * sqrt(1.0 - zeta * zeta) // Exponential decay
    v0 = -initialVelocity
    x0 = toValue - fromValue
    isUnderDamped = zeta < 1

    if isUnderDamped {
      // Under damped
      aCritical = 0
      bCritical = 0
      aUnder = (v0 + zeta * omega0 * x0) / omega1
      bUnder = x0
    } else {
      // Critically damped
      aCritical = x0
      bCritical = (v0 + omega0 * x0)
      aUnder = 0
      bUnder = 0
    }

    super.init(fromValue: fromValue, toValue: toValue, animation: animation, duration: animation.settlingDuration)
  }

  /// public functions
  override func valueAt(time: Double) -> Double {
    let t = time * speed

    var y: Double
    if isUnderDamped {
      // Under damped
      let envelope = exp(-zeta * omega0 * t)
      let angle = omega1 * t
      y = toValue - envelope * (aUnder * sin(angle) + bUnder * cos(angle))
    } else {
      // Critically damped
      let envelope = exp(-omega0 * t)
      y = toValue - envelope * (aCritical + bCritical * t)
    }

    return y
  }
}

// swiftlint:enable identifier_name
