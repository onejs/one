import SwiftUI

// Swift.withAnimation: JavaScript writes useNativeState values between begin
// and commit; commit hands every written entry to its bound views inside one
// SwiftUI transaction, so they animate together like SwiftUI's own
// withAnimation body.
@objc(OneNativeAnimation)
public final class OneNativeAnimation: NSObject {
  @objc(begin)
  public static func begin() {
    OneNativeSyncRegistry.beginBatch()
  }

  // a nil name applies the writes without animation. criteria is
  // logicallyComplete or removed; completion runs on main.
  @objc(commit:completionCriteria:completion:)
  public static func commit(_ name: String?, completionCriteria criteria: String, completion: (() -> Void)?) {
    let ids = OneNativeSyncRegistry.endBatch()
    let run = {
      let animation = name.map(oneNativeAnimation(named:))
      guard let completion else {
        withAnimation(animation) { OneNativeSyncRegistry.notify(ids) }
        return
      }
      let completionCriteria: AnimationCompletionCriteria
      switch criteria {
      case "logicallyComplete": completionCriteria = .logicallyComplete
      case "removed": completionCriteria = .removed
      default: preconditionFailure("invalid withAnimation completionCriteria: \(criteria)")
      }
      withAnimation(animation, completionCriteria: completionCriteria) {
        OneNativeSyncRegistry.notify(ids)
      } completion: {
        completion()
      }
    }
    if Thread.isMainThread {
      run()
    } else {
      DispatchQueue.main.sync(execute: run)
    }
  }
}
