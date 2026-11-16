import Foundation
import UIKit

extension UIScrollView {
  var reactViewTag: NSNumber {
    return superview.reactNativeTag
  }
}
