import UIKit

@objc
public class KeyboardExtenderContainerView: NSObject {
  private static func usesModernKeyboard() -> Bool {
    #if canImport(UIKit.UIGlassEffect)
      if #available(iOS 26.0, *) {
        let requiresCompat = Bundle.main.object(forInfoDictionaryKey: "UIDesignRequiresCompatibility") as? Bool ?? false
        return !requiresCompat
      }
    #endif
    return false
  }

  @objc public static func keyboardBorderRadius() -> CGFloat {
    return usesModernKeyboard() ? 30 : 0
  }

  @objc public static func create(frame: CGRect, contentView: UIView, transparent: Bool) -> UIView {
    if usesModernKeyboard() {
      if #available(iOS 26.0, *) {
        if transparent {
          return TransparentContainerView(
            frame: frame,
            contentView: contentView,
            paddingBottom: ModernContainerView.paddingBottom
          )
        }
        return ModernContainerView(frame: frame, contentView: contentView)
      }
    }
    if transparent {
      return TransparentContainerView(frame: frame, contentView: contentView, paddingBottom: 0)
    }
    return LegacyContainerView(frame: frame, contentView: contentView)
  }
}

/// A container whose height follows the height of its React content.
private protocol ContentSizedContainer: UIView {
  var contentView: UIView! { get }
  func updateContentFrame(desiredHeight: CGFloat)
}

private extension ContentSizedContainer {
  func calculateDesiredHeight() -> CGFloat {
    guard let firstSubview = contentView.subviews.first else { return 0 }
    return firstSubview.frame.height
  }

  func resizeToContentIfNeeded() {
    let desiredHeight = calculateDesiredHeight()

    if abs(frame.height - desiredHeight) > 0.001 {
      frame.size.height = desiredHeight

      updateContentFrame(desiredHeight: desiredHeight)

      // Trigger layout updates
      invalidateIntrinsicContentSize()
      setNeedsLayout()
      UIResponder.current?.reloadInputViews()
    }
  }
}

private class BaseContainerView: UIInputView, ContentSizedContainer {
  var contentView: UIView!

  init(frame: CGRect, contentView: UIView) {
    super.init(frame: frame, inputViewStyle: .keyboard)
    self.contentView = contentView
    commonSetup()
  }

  @available(*, unavailable)
  required init?(coder _: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  private func commonSetup() {
    allowsSelfSizing = true
    autoresizingMask = [.flexibleHeight]
    setupContainerSpecifics()
  }

  func setupContainerSpecifics() {
    updateContentFrame(desiredHeight: calculateDesiredHeight())
  }

  override func layoutSubviews() {
    super.layoutSubviews()

    resizeToContentIfNeeded()
  }

  func updateContentFrame(desiredHeight _: CGFloat) {
    // Override in subclasses
  }

  override var intrinsicContentSize: CGSize {
    return CGSize(width: UIView.noIntrinsicMetric, height: frame.height)
  }
}

// MARK: - Modern Implementation (iOS 26.0+)

@available(iOS 26.0, *)
private class ModernContainerView: BaseContainerView {
  static let paddingBottom: CGFloat = 10.0
  private let paddingHorizontal: CGFloat = 20.0
  private var visualEffectView: UIVisualEffectView?

  override func setupContainerSpecifics() {
    setupVisualEffect()
    super.setupContainerSpecifics()
  }

  private func setupVisualEffect() {
    #if canImport(UIKit.UIGlassEffect)
      let isDark = FocusedInputHolder.shared.get()?.keyboardAppearanceValue == "dark"
      let glassEffect = UIGlassEffect()
      let color =
        isDark ? UIColor.black.withAlphaComponent(0.3) : UIColor.gray.withAlphaComponent(0.3)
      glassEffect.tintColor = color
      glassEffect.isInteractive = true

      visualEffectView = UIVisualEffectView(effect: glassEffect)
      visualEffectView?.overrideUserInterfaceStyle = isDark ? .dark : .light
      visualEffectView?.cornerConfiguration = .capsule()

      if let visualEffectView = visualEffectView {
        visualEffectView.contentView.addSubview(contentView)
        addSubview(visualEffectView)
      }
    #endif
  }

  override func updateContentFrame(desiredHeight: CGFloat) {
    visualEffectView?.frame = CGRect(
      x: paddingHorizontal,
      y: -Self.paddingBottom,
      width: bounds.width - 2 * paddingHorizontal,
      height: desiredHeight
    )
    contentView.frame = CGRect(
      x: -paddingHorizontal,
      y: 0,
      width: bounds.width,
      height: desiredHeight
    )
  }
}

// MARK: - Legacy Implementation (Pre-iOS 26.0)

private class LegacyContainerView: BaseContainerView {
  override func setupContainerSpecifics() {
    addSubview(contentView)
    super.setupContainerSpecifics()
  }

  override func updateContentFrame(desiredHeight _: CGFloat) {
    contentView.frame = bounds
  }
}

// MARK: - Transparent Implementation

/// A plain `UIView`: UIKit draws the keyboard backdrop behind any `UIInputView`, whatever its style.
private class TransparentContainerView: UIView, ContentSizedContainer {
  var contentView: UIView!
  private let paddingBottom: CGFloat

  init(frame: CGRect, contentView: UIView, paddingBottom: CGFloat) {
    self.paddingBottom = paddingBottom
    super.init(frame: frame)
    self.contentView = contentView
    autoresizingMask = [.flexibleHeight]
    addSubview(contentView)
    updateContentFrame(desiredHeight: calculateDesiredHeight())
  }

  @available(*, unavailable)
  required init?(coder _: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func layoutSubviews() {
    super.layoutSubviews()

    resizeToContentIfNeeded()
  }

  func updateContentFrame(desiredHeight: CGFloat) {
    contentView.frame = CGRect(
      x: 0,
      y: -paddingBottom,
      width: bounds.width,
      height: desiredHeight
    )
  }

  override var intrinsicContentSize: CGSize {
    return CGSize(width: UIView.noIntrinsicMetric, height: frame.height)
  }
}
