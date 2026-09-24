import NitroModules
import UIKit

// fire-and-forget tactile feedback, the ios half of One.UI.Haptics. calls
// arrive synchronously on the JS thread and UIFeedbackGenerator is main-thread
// only, so each one hops to main. one retained generator per style; each call
// prepares then fires so gesture-threshold rates stay responsive. soft/rigid
// need ios 13+ and the floor is 17, so no gating.
final class HybridOneHaptics: HybridOneHapticsSpec {
  @MainActor private static let selectionGenerator = UISelectionFeedbackGenerator()
  @MainActor private static let lightGenerator = UIImpactFeedbackGenerator(style: .light)
  @MainActor private static let mediumGenerator = UIImpactFeedbackGenerator(style: .medium)
  @MainActor private static let heavyGenerator = UIImpactFeedbackGenerator(style: .heavy)
  @MainActor private static let softGenerator = UIImpactFeedbackGenerator(style: .soft)
  @MainActor private static let rigidGenerator = UIImpactFeedbackGenerator(style: .rigid)
  @MainActor private static let notificationGenerator = UINotificationFeedbackGenerator()

  func selection() throws {
    DispatchQueue.main.async {
      Self.selectionGenerator.prepare()
      Self.selectionGenerator.selectionChanged()
    }
  }

  func impact(style: HapticImpact) throws {
    DispatchQueue.main.async {
      let generator: UIImpactFeedbackGenerator
      switch style {
      case .light: generator = Self.lightGenerator
      case .medium: generator = Self.mediumGenerator
      case .heavy: generator = Self.heavyGenerator
      case .soft: generator = Self.softGenerator
      case .rigid: generator = Self.rigidGenerator
      }
      generator.prepare()
      generator.impactOccurred()
    }
  }

  func notification(type: HapticNotification) throws {
    DispatchQueue.main.async {
      let feedbackType: UINotificationFeedbackGenerator.FeedbackType
      switch type {
      case .success: feedbackType = .success
      case .warning: feedbackType = .warning
      case .error: feedbackType = .error
      }
      Self.notificationGenerator.prepare()
      Self.notificationGenerator.notificationOccurred(feedbackType)
    }
  }
}
