#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

// the prebuilt app delegate calls this from customizeRootView through the
// app's bridging header. it keeps the app's launch storyboard as the react
// native root view's loading view until the first content appears, so the
// launch screen never gives way to an empty root.
FOUNDATION_EXPORT void OneHoldLaunchScreen(UIView *rootView);

NS_ASSUME_NONNULL_END
