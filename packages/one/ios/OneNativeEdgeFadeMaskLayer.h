// vendored from react-native-edge-fade (MIT, Copyright (c) 2026 Giulio Amato),
// trimmed to the mask path for OneNativeEdgeFade. see VENDORING.md.
#import <QuartzCore/QuartzCore.h>

NS_ASSUME_NONNULL_BEGIN

/// CALayer that draws a combined alpha mask for all four edges into a single bitmap.
///
/// Uses `kCGBlendModeDestinationIn` (R = D · Sa). The destination is initialized
/// to opaque white; each edge gradient (clipped to its own strip) multiplies the
/// existing alpha by the gradient alpha. Sequential passes over an overlapping
/// corner therefore compound: `alpha_top × alpha_left`.
@interface OneNativeEdgeFadeMaskLayer : CALayer

@property CGFloat fadeTop, fadeBottom, fadeLeft, fadeRight;
@property (nonatomic, copy, nullable) NSString *curveTop, *curveBottom, *curveLeft, *curveRight;

@end

NS_ASSUME_NONNULL_END
