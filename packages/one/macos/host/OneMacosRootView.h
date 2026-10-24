#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

// The NSView a SwiftUI WindowGroup hosts. It owns the JS runtime, the React
// instance and the surface for module `main`, and fills its bounds with the
// mounted React tree.
@interface OneMacosRootView : NSView

// Debug builds use Info.plist `OneDevServerURL` (default http://localhost:8081)
// plus the macos dev bundle path; other builds use the embedded main.jsbundle.
// `ONE_MACOS_BUNDLE_URL` in the environment overrides either.
+ (NSURL *)defaultBundleURL;

- (instancetype)initWithBundleURL:(NSURL *)bundleURL moduleName:(NSString *)moduleName NS_DESIGNATED_INITIALIZER;
- (instancetype)initWithFrame:(NSRect)frameRect NS_UNAVAILABLE;
- (nullable instancetype)initWithCoder:(NSCoder *)coder NS_UNAVAILABLE;

@end

NS_ASSUME_NONNULL_END
