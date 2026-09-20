// vendored from react-native-edge-fade (MIT, Copyright (c) 2026 Giulio Amato),
// trimmed to the mask path for OneNativeEdgeFade. see VENDORING.md.
#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Curve math for OneNativeEdgeFade.
///
/// A curve is either a preset name (`smooth`, `smoother`, `sharp`, `gentle`,
/// `soft`, `linear`) or a comma-separated alpha string produced by the JS
/// `serializeCurve()` helper (inner to outer, values in [0,1]).

/// `YES` when the string is a comma-separated custom alpha list rather than a preset name.
BOOL OneNativeEdgeFadeCurveIsCustom(NSString *curve);

/// Resolve a curve string to its alpha/stop arrays.
///
/// On return:
///   - `alphas`, `stops`, `count` describe the alpha samples and their positions.
///   - `dynAlphas` / `dynStops` are non-`NULL` only for parsed custom curves and
///     **must be `free()`'d by the caller**. Preset paths leave them `NULL`.
///   - Unparseable custom strings fall back silently to the `smooth` preset.
void OneNativeEdgeFadeResolveCurve(NSString *curve,
                                   const CGFloat *_Nonnull *_Nonnull alphas,
                                   const CGFloat *_Nonnull *_Nonnull stops,
                                   size_t *count,
                                   CGFloat *_Nullable *_Nonnull dynAlphas,
                                   CGFloat *_Nullable *_Nonnull dynStops);

NS_ASSUME_NONNULL_END
