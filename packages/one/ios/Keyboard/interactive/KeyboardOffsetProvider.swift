import Foundation

@objc(OneKCKeyboardOffsetProvider)
public class KeyboardOffsetProvider: NSObject {
  @objc public static let shared = KeyboardOffsetProvider()

  override private init() {}

  private var offsetMap: [String: (offset: NSNumber, tag: NSNumber)] = [:]

  @objc public func setOffset(forTextInputNativeID nativeID: String, offset: NSNumber, withTag tag: NSNumber) {
    KeyboardAreaExtender.shared.updateHeight(to: CGFloat(offset), for: nativeID)
    offsetMap[nativeID] = (offset: offset, tag: tag)
  }

  @objc public func getOffset(forTextInputNativeID nativeID: String?) -> NSNumber? {
    guard let unwrappedNativeID = nativeID, let pair = offsetMap[unwrappedNativeID] else { return nil }
    return pair.offset
  }

  @objc public func hasOffset(forTextInputNativeID nativeID: String?) -> Bool {
    guard let unwrappedNativeID = nativeID else { return false }
    return offsetMap[unwrappedNativeID] != nil
  }

  @objc public func removeOffset(forTextInputNativeID nativeID: String, withTag tag: NSNumber) {
    // Ensure the tag matches before removing the entry
    if let currentPair = offsetMap[nativeID], currentPair.tag == tag {
      offsetMap.removeValue(forKey: nativeID)
    }
  }
}
