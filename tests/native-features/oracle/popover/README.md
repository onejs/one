# Popover trigger calibration

RAN: Apple SDK 27.0 (24A430), runtime 27.0, iPhone 16, 393 × 852 points at 3×, inherited default content size category L. The independent Apple-only target uses the same Trigger label, automatic button style, composed stack and popover modifiers as One. No font or control-size override is applied.

TESTED: SwiftUI ideal size, geometry callback, host frame and independently observed accessibility button frame all measure 61 native pixels. The button frame exactly matches the retained One failure: x 16, y 220, width 54⅓, height 20⅓ points. The React fixture rounds its onLayout height to 20. The conformance gate requires both that report and the rounded native button height to equal 20.

The evidence directory’s `input/PopoverOracle.swift` is the exact compiled source. `calibration.json` binds source, object and executable hashes to the receipt. The evidence directory retains the SDK/compiler receipt, original-density capture, raw geometry and accessibility tree, admitted shared-builder delivery, and replay inputs. Build this small UIKit/SwiftUI target with SDK 27.0 for arm64 iOS Simulator, then run it on the stated simulator; its Documents/popover-oracle.json records the geometry.

TESTED: aligned and exactly restored Popover each pass all 30 original checks. The original 24-point expectation and an owning onLayout-forwarding omission both reject the same height gate after five checks, with the native Trigger frame intact. The restored visual grade reads 59,558 subject pixels against the unchanged 20,000 floor, closed state 0, and 61,709 changed pixels.
