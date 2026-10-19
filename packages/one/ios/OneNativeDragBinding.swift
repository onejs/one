import SwiftUI

// a drag bound to a native state entry: each change writes the entry's value at
// the start of the drag plus the translation along one axis, clamped to range,
// so views reading the entry follow the finger without JavaScript. on end, snap
// writes the target nearest the predicted end inside its animation.
struct OneNativeDragBinding {
  let state: Int32
  let vertical: Bool
  let range: ClosedRange<Double>?
  let targets: [Double]
  let animation: SwiftUI.Animation?

  // the entry's value when each bound drag began, by entry. main thread only.
  private static var starts: [Int32: Double] = [:]

  init?(_ record: OneNativeSDKRecord) {
    guard let raw = record.fields["bind"] else {
      precondition(record.fields["snap"] == nil, "invalid \(record.context): snap needs bind")
      return nil
    }
    guard let bind = raw as? [String: Any], let id = bind["state"] as? NSNumber, id.int32Value != 0,
      let axis = bind["axis"] as? String, axis == "x" || axis == "y" else {
      preconditionFailure("invalid \(record.context).bind")
    }
    state = id.int32Value
    vertical = axis == "y"
    if let bounds = bind["range"] {
      guard let bounds = bounds as? [NSNumber], bounds.count == 2,
        bounds.allSatisfy({ $0.doubleValue.isFinite }), bounds[0].doubleValue <= bounds[1].doubleValue else {
        preconditionFailure("invalid \(record.context).bind.range")
      }
      range = bounds[0].doubleValue...bounds[1].doubleValue
    } else {
      range = nil
    }
    if let raw = record.fields["snap"] {
      guard let snap = raw as? [String: Any], let targets = snap["targets"] as? [NSNumber], !targets.isEmpty,
        targets.allSatisfy({ $0.doubleValue.isFinite }), let animation = snap["animation"] else {
        preconditionFailure("invalid \(record.context).snap")
      }
      self.targets = targets.map(\.doubleValue)
      self.animation = oneNativeSDKValueAnimation(animation, record.context + ".snap.animation")
    } else {
      targets = []
      animation = nil
    }
  }

  func changed(_ translation: CGSize) {
    let start = Self.starts[state] ?? current()
    Self.starts[state] = start
    OneNativeSyncRegistry.set(state, value: NSNumber(value: clamped(start + along(translation))))
  }

  // the snap target the drag settled on, or nil without snap.
  func ended(predicted: CGSize) -> Double? {
    let start = Self.starts.removeValue(forKey: state) ?? current()
    guard !targets.isEmpty else { return nil }
    let projected = clamped(start + along(predicted))
    let target = targets.min { abs($0 - projected) < abs($1 - projected) }!
    withAnimation(animation) {
      OneNativeSyncRegistry.set(state, value: NSNumber(value: target))
    }
    return target
  }

  private func along(_ size: CGSize) -> Double {
    Double(vertical ? size.height : size.width)
  }

  private func clamped(_ value: Double) -> Double {
    guard let range else { return value }
    return min(max(value, range.lowerBound), range.upperBound)
  }

  private func current() -> Double {
    guard let number = OneNativeSyncRegistry.get(state) as? NSNumber, number.doubleValue.isFinite else {
      preconditionFailure("drag bind state \(state) must hold a finite number")
    }
    return number.doubleValue
  }
}
