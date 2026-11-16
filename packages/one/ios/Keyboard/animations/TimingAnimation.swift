import Foundation
import QuartzCore

// swiftlint:disable identifier_name
/**
 * A class that handles timing animations using Bézier curves.
 *
 * This class calculates the progress of animations based on Bézier curve control points.
 * For more details on the Bézier curves, see [Desmos Graph](https://www.desmos.com/calculator/eynenh1aga?lang=en).
 */
public final class TimingAnimation: KeyboardAnimation {
  private let p1: CGPoint
  private let p2: CGPoint

  init(animation: CABasicAnimation, fromValue: Double, toValue: Double) {
    let timingFunction = animation.timingFunction
    var controlPoints: ContiguousArray<Float> = ContiguousArray([0, 0, 0, 0])
    timingFunction?.getControlPoint(at: 1, values: &controlPoints[0])
    timingFunction?.getControlPoint(at: 2, values: &controlPoints[2])
    let p1 = CGPoint(x: CGFloat(controlPoints[0]), y: CGFloat(controlPoints[1]))
    let p2 = CGPoint(x: CGFloat(controlPoints[2]), y: CGFloat(controlPoints[3]))

    self.p1 = p1
    self.p2 = p2

    super.init(fromValue: fromValue, toValue: toValue, animation: animation, duration: animation.duration)
  }

  // MARK: public functions

  override func valueAt(time: Double) -> Double {
    let duration = animation?.duration ?? 0.0
    guard duration > 0 else { return toValue }

    let fraction = min(time / duration, 1.0)
    let t = findTForX(xTarget: fraction)
    let progress = bezierY(t: t)

    return fromValue + (toValue - fromValue) * progress
  }

  override func timingAt(value: Double) -> Double {
    guard (toValue - fromValue) != 0 else { return 0 }

    let targetY = (value - fromValue) / (toValue - fromValue)
    let clampedY = max(min(targetY, 1.0), 0.0)

    let t = findTForY(yTarget: clampedY)
    let x = bezierX(t: t)

    let duration = animation?.duration ?? 0.0
    return x * duration / speed
  }

  // private functions

  // MARK: Bézier

  private func bezier(t: CGFloat, valueForPoint: (CGPoint) -> CGFloat) -> CGFloat {
    let u = 1 - t
    let tt = t * t
    let uu = u * u

    // Calculate the terms for the Bézier curve
    // term0 is evaluated as `0`, because P0(0, 0)
    // let term0 = uu * u * valueForPoint(p0) // P0
    let term1 = 3 * uu * t * valueForPoint(p1) // P1
    let term2 = 3 * u * tt * valueForPoint(p2) // P2
    let term3 = tt * t // * valueForPoint(p3), because P3(1, 1)

    // Sum all terms to get the Bézier value
    return term1 + term2 + term3
  }

  private func bezierY(t: CGFloat) -> CGFloat {
    return bezier(t: t) { $0.y }
  }

  private func bezierX(t: CGFloat) -> CGFloat {
    return bezier(t: t) { $0.x }
  }

  private func bezierDerivative(t: CGFloat, valueForPoint: (CGPoint) -> CGFloat) -> CGFloat {
    let u = 1 - t
    let term1 = (3 * u * u - 6 * t * u) * valueForPoint(p1)
    let term2 = (6 * t * u - 3 * t * t) * valueForPoint(p2)
    let term3 = 3 * t * t
    return term1 + term2 + term3
  }

  private func bezierXDerivative(t: CGFloat) -> CGFloat {
    bezierDerivative(t: t) { $0.x }
  }

  private func bezierYDerivative(t: CGFloat) -> CGFloat {
    bezierDerivative(t: t) { $0.y }
  }

  private enum BezierComponent {
    case x
    case y
  }

  private func calculateComponents(t: CGFloat, component: BezierComponent) -> (value: CGFloat, derivative: CGFloat) {
    switch component {
    case .x:
      return (bezierX(t: t), bezierXDerivative(t: t))
    case .y:
      return (bezierY(t: t), bezierYDerivative(t: t))
    }
  }

  // MARK: Newton Raphson

  private func findT(
    target: CGFloat,
    component: BezierComponent,
    epsilon: CGFloat = 0.0001,
    maxIterations: Int = 100
  ) -> CGFloat {
    var t: CGFloat = 0.5
    for _ in 0 ..< maxIterations {
      let (value, derivative) = calculateComponents(t: t, component: component)
      let error = value - target

      if abs(error) < epsilon {
        break
      }

      t -= error / derivative
      t = max(0, min(t, 1))
    }
    return t
  }

  private func findTForX(xTarget: CGFloat) -> CGFloat {
    findT(target: xTarget, component: .x)
  }

  private func findTForY(yTarget: CGFloat) -> CGFloat {
    findT(target: yTarget, component: .y)
  }
}

// swiftlint:enable identifier_name
